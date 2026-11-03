-- Limpieza de la base de datos del SERVIDOR DE DESARROLLO (develop).
--
-- Deja la base de datos sin clientes, pedidos, facturas, productos ni catálogo, y conserva
-- lo técnico: administradores (y sus usuarios), roles, canal, zonas, impuestos, métodos
-- de envío y de pago, ajustes globales, noticias, migraciones y la navegación por
-- objetivos de seed-goals.ts (faceta «objetivo-tienda» y sus colecciones).
--
-- NO lo ejecutes a mano: usa scripts/limpiar-develop.sh, que antes hace la copia de
-- seguridad y después borra los archivos de las imágenes y facturas eliminadas.
--
-- Seguros:
--   1. Exige `-v confirmar=develop`.
--   2. Exige que exista el método de pago de pruebas `standard-payment`, que seed.ts solo
--      crea fuera de producción (ver app-environment.ts). En producción no existe.
--   3. Todo va en una transacción: si algo falla, o si al final queda algún cliente,
--      pedido, factura o producto, no se cambia nada.
--   4. TRUNCATE sin CASCADE: si otra tabla no prevista referenciara una de las vaciadas,
--      Postgres aborta en vez de borrar en cadena.
--
-- Facturas: con invoice_sequence vacía, la siguiente factura de prueba será A-000001 y la
-- siguiente rectificativa R-000001 (formato actual <serie>-<6 cifras>).
--
-- Deja en la tabla `limpieza_archivos` las rutas (relativas a apps/server/static) de los
-- archivos que hay que borrar del volumen; limpiar-develop.sh las borra y elimina la tabla.

\set ON_ERROR_STOP on

\if :{?confirmar}
\else
    \echo 'ERROR: falta -v confirmar=develop. No se ha cambiado nada.'
    \quit
\endif
SELECT :'confirmar' = 'develop' AS confirmado,
       EXISTS (SELECT 1 FROM payment_method WHERE code = 'standard-payment') AS es_desarrollo \gset
\if :confirmado
\else
    \echo 'ERROR: -v confirmar debe valer develop. No se ha cambiado nada.'
    \quit
\endif
\if :es_desarrollo
\else
    \echo 'ERROR: no existe el método de pago de pruebas standard-payment: esto no parece develop. No se ha cambiado nada.'
    \quit
\endif

\echo '== Antes =='
SELECT (SELECT count(*) FROM customer) AS clientes, (SELECT count(*) FROM "order") AS pedidos,
       (SELECT count(*) FROM invoice) AS facturas, (SELECT count(*) FROM product) AS productos,
       (SELECT count(*) FROM product_variant) AS variantes, (SELECT count(*) FROM asset) AS imagenes,
       (SELECT count(*) FROM collection) AS colecciones, (SELECT count(*) FROM "user") AS usuarios,
       (SELECT count(*) FROM administrator) AS administradores;

BEGIN;

-- Archivos a borrar del volumen (se rellenan antes de borrar las filas).
CREATE TABLE IF NOT EXISTS limpieza_archivos (ruta text PRIMARY KEY);

-- Imágenes que se conservan: la del panel de acceso (ajustes globales) y las portadas de noticias.
CREATE TEMP TABLE imagenes_conservadas ON COMMIT DROP AS
    SELECT "customFieldsAuthpanelimageid" AS id FROM global_settings WHERE "customFieldsAuthpanelimageid" IS NOT NULL
    UNION SELECT "coverImageId" FROM content_article WHERE "coverImageId" IS NOT NULL;

INSERT INTO limpieza_archivos (ruta)
    SELECT 'assets/' || r FROM asset a, LATERAL (VALUES (a.source), (a.preview)) v(r)
    WHERE a.id NOT IN (SELECT id FROM imagenes_conservadas)
    UNION SELECT 'invoices/' || "pdfPath" FROM invoice WHERE "pdfPath" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Se vacían enteras.
TRUNCATE
    -- clientes y datos de sus cuentas
    address, customer, customer_channels_channel, customer_groups_customer_group,
    athlete, athlete_code, athlete_reward, athlete_reward_reversal, loyalty_account, loyalty_transaction, product_review,
    -- pedidos, pagos, envíos, devoluciones, carritos
    "order", order_channels_channel, order_fulfillments_fulfillment, fulfillment, order_line, order_line_reference,
    order_modification, order_promotions_promotion, payment, refund, shipping_line, surcharge, history_entry,
    session, redsys_payment_attempt, redsys_transaction, email_log,
    -- facturación y contadores de serie
    invoice, invoice_line, invoice_sequence,
    -- catálogo
    product, product_translation, product_asset, product_channels_channel, product_facet_values_facet_value,
    product_option_groups_product_option_group, product_option_group, product_option_group_translation,
    product_option_group_channels_channel, product_option, product_option_translation, product_option_channels_channel,
    product_variant, product_variant_translation, product_variant_asset, product_variant_channels_channel,
    product_variant_facet_values_facet_value, product_variant_options_product_option, product_variant_price,
    stock_level, stock_movement, collection_product_variants_product_variant, search_index_item,
    promotion, promotion_translation, promotion_channels_channel, banner,
    -- cola de trabajos (trabajos pendientes sobre datos que ya no existen)
    job_record, job_record_buffer
RESTART IDENTITY;

-- Imágenes (salvo las conservadas). DELETE y no TRUNCATE: así las colecciones de objetivos
-- que tuvieran imagen se quedan sin ella (ON DELETE SET NULL) en vez de bloquear el borrado.
DELETE FROM asset WHERE id NOT IN (SELECT id FROM imagenes_conservadas);

-- Usuarios de clientes: todos menos los de administradores y los dueños de claves de API.
DELETE FROM authentication_method WHERE "userId" NOT IN (
    SELECT "userId" FROM administrator UNION SELECT "ownerId" FROM api_key UNION SELECT "userId" FROM api_key);
DELETE FROM "user" WHERE id NOT IN (
    SELECT "userId" FROM administrator UNION SELECT "ownerId" FROM api_key UNION SELECT "userId" FROM api_key);

-- Colecciones: todas salvo la raíz y el árbol de objetivos (slug «objetivos» y descendientes).
DELETE FROM collection WHERE "isRoot" = false AND id NOT IN (
    SELECT cc.id_descendant FROM collection_closure cc
    JOIN collection_translation ct ON ct."baseId" = cc.id_ancestor AND ct.slug = 'objetivos');

-- Facetas: todas salvo la de objetivos.
DELETE FROM facet_value_translation WHERE "baseId" IN (
    SELECT fv.id FROM facet_value fv JOIN facet f ON f.id = fv."facetId" WHERE f.code <> 'objetivo-tienda');
DELETE FROM facet_value WHERE "facetId" IN (SELECT id FROM facet WHERE code <> 'objetivo-tienda');
DELETE FROM facet_translation WHERE "baseId" IN (SELECT id FROM facet WHERE code <> 'objetivo-tienda');
DELETE FROM facet WHERE code <> 'objetivo-tienda';

-- Secuencias de las tablas con borrado parcial: siguiente id = máximo + 1.
SELECT setval(pg_get_serial_sequence('"' || t || '"', 'id'), COALESCE(m, 0) + 1, false)
FROM (VALUES ('asset', (SELECT max(id) FROM asset)), ('user', (SELECT max(id) FROM "user")),
             ('authentication_method', (SELECT max(id) FROM authentication_method)),
             ('collection', (SELECT max(id) FROM collection)), ('facet', (SELECT max(id) FROM facet)),
             ('facet_value', (SELECT max(id) FROM facet_value))) AS s(t, m);

-- Comprobación final: si algo no ha quedado a cero, se deshace todo.
DO $$
DECLARE
    restos text;
BEGIN
    SELECT string_agg(nombre || '=' || n, ', ') INTO restos FROM (
        SELECT 'clientes' AS nombre, count(*) AS n FROM customer
        UNION ALL SELECT 'pedidos', count(*) FROM "order"
        UNION ALL SELECT 'facturas', count(*) FROM invoice
        UNION ALL SELECT 'productos', count(*) FROM product
        UNION ALL SELECT 'variantes', count(*) FROM product_variant
        UNION ALL SELECT 'usuarios-no-admin', count(*) FROM "user" WHERE id NOT IN (SELECT "userId" FROM administrator)
    ) x WHERE n > 0;
    IF restos IS NOT NULL THEN
        RAISE EXCEPTION 'La limpieza no ha dejado todo a cero (%): se deshace.', restos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM administrator) THEN
        RAISE EXCEPTION 'No queda ningún administrador: se deshace.';
    END IF;
END $$;

COMMIT;

\echo '== Después =='
SELECT (SELECT count(*) FROM customer) AS clientes, (SELECT count(*) FROM "order") AS pedidos,
       (SELECT count(*) FROM invoice) AS facturas, (SELECT count(*) FROM product) AS productos,
       (SELECT count(*) FROM product_variant) AS variantes, (SELECT count(*) FROM asset) AS imagenes,
       (SELECT count(*) FROM collection) AS colecciones, (SELECT count(*) FROM "user") AS usuarios,
       (SELECT count(*) FROM administrator) AS administradores,
       (SELECT count(*) FROM limpieza_archivos) AS archivos_por_borrar;
