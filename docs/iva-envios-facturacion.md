# IVA, envíos, facturas rectificativas, información alimentaria e imágenes

Todo lo de este documento está implementado y probado. Lo que queda es **rellenar datos o elegir opciones**, casi
siempre desde el dashboard.

## IVA por producto y por territorio

`npm run seed` (idempotente) crea:

| Categoría de impuesto | España (península y Baleares) | Canarias, Ceuta y Melilla |
|---|---|---|
| General (por defecto) | 21 % | 0 % |
| Reducido | 10 % | 0 % |
| Superreducido | 4 % | 0 % |

- **Qué tipo lleva cada producto** se elige en cada variante: Dashboard → Catálogo → producto → variante →
  «Categoría de impuesto». Por defecto es General (21 %). Los complementos alimenticios suelen ir al Reducido
  (10 %), pero **lo confirma la gestoría producto a producto**.
- **Canarias, Ceuta y Melilla** se detectan por el código postal (35, 38, 51, 52), porque para Vendure son España.
  Sus pedidos van a la zona «Canarias, Ceuta y Melilla», sin IVA español. En la factura aparece la mención de
  exención del art. 21 de la Ley 37/1992; la gestoría debe confirmar la redacción. Código:
  `apps/server/src/plugins/spain-territories/`.
- Los tipos se pueden cambiar en Dashboard → Ajustes → Tipos de impuesto. El seed nunca pisa un tipo ya existente.

## Métodos de envío

El seed deja **«Envío estándar»**: 5 € + IVA, península y Baleares. Es un valor provisional. Las tarifas reales se
configuran en Dashboard → Ajustes → Métodos de envío. La condición **«Territorios de España y pedido mínimo»**
permite, sin programar:

| Ejemplo | Territorios marcados | Pedido mínimo | Tarifa |
|---|---|---|---|
| Envío península | España peninsular | 0 | 4,95 € |
| Envío Baleares | Islas Baleares | 0 | 9,95 € |
| Envío gratis | España peninsular | 50 € | 0 € |
| Envío Canarias | Islas Canarias | 0 | la que se decida, con IVA 0 % en la tarifa |

Mientras ningún método tenga marcada Canarias, Ceuta o Melilla, no se puede comprar desde allí: el checkout no ofrece
envío. Fuera de España nunca se ofrece envío.

## Facturas rectificativas

- Se emiten **solas** cuando un reembolso queda **liquidado**. Con Redsys el flujo es: reembolsar en el panel del
  banco y marcar el reembolso como liquidado en el dashboard (pedido → pagos → reembolso → «Liquidar»). Vale igual
  para reembolsos parciales y para «Reembolsar y cancelar».
- Serie **R** (R-000001…), importes negativos, «FACTURA RECTIFICATIVA», referencia a la factura original y su fecha,
  «Rectificación por diferencias» y el motivo (el que se escriba al reembolsar).
- El IVA se revierte por tipo: cada línea devuelta a su tipo, el envío al suyo, y cualquier importe libre repartido en
  proporción a lo cobrado.
- El cliente recibe un email «Factura rectificativa» con el PDF. También la ve en «Mi cuenta → Facturas».
- Se crea una por reembolso, sin duplicados aunque el evento se repita.

## Veri*Factu

**No está implementado el envío a la AEAT**, porque exige elegir cómo certificarse. Lo que sí está hecho es el punto
de enganche (`FiscalRegistrationProvider` en `apps/server/src/plugins/invoicing/types.ts`):

- Cada factura (ordinaria y rectificativa) se entrega al proveedor al emitirse, con emisor, destinatario, desglose de
  IVA y factura rectificada.
- El resultado (referencia, QR y leyenda) se guarda en la factura. El PDF imprime el QR y la leyenda.
- Si el proveedor falla, la factura se emite igual y queda marcada como FAILED para reintentarlo.

Lo que falta: que la gestoría elija un **proveedor homologado** (servicio con API) o software propio certificado.
Después hay que escribir un adaptador pequeño que llame a su API y pasarlo en
`InvoicingPlugin.init({ fiscalRegistration })` en `vendure-config.ts`.

## Información alimentaria (Reglamento UE 1169/2011)

Dashboard → Catálogo → producto → pestaña **«Información alimentaria»**:

- **Es un complemento alimenticio**: marcado por defecto; añade solas las advertencias del RD 1487/2009. Desmarcar
  en accesorios.
- **Ingredientes**: lista completa. Los **alérgenos en MAYÚSCULAS**: la ficha los pone en negrita.
- **Alérgenos**: resumen, p. ej. «Contiene LECHE. Puede contener trazas de SOJA».
- **Información nutricional**: una fila por línea, con las columnas separadas por barras verticales, p. ej.
  `Nutriente | Por 100 g | Por dosis` y debajo `Proteínas | 78 g | 23 g`. Se muestra como tabla.
- **Modo de empleo y dosis diaria recomendada**: obligatorio en complementos.
- **Advertencias específicas**: una por línea (cafeína, embarazo…).
- **Conservación, país de origen y operador responsable** (nombre y dirección del fabricante u operador).

Por variante: **«Cantidad neta»** (1 kg, 60 cápsulas…), que aparece junto al SKU. Los textos tienen versión en español
y en inglés. En la ficha se muestra una sección «Información alimentaria» solo con lo que esté rellenado.

## Imágenes de marca

Generadas a partir del logo. Para cambiarlas, sustituye el archivo:

- **Favicon**: `apps/storefront/src/app/[locale]/favicon.ico` e `icon.png` (512×512).
- **Icono de iPhone**: `apps/storefront/src/app/[locale]/apple-icon.png` (180×180).
- **Imagen al compartir** (WhatsApp, redes): `apps/storefront/public/og-image.png` (1200×630). Se usa en toda página
  que no tenga foto propia.

`robots.txt` (`site/seo/robots.ts`) deja indexar la tienda, excluye cuenta, carrito y checkout, y apunta al sitemap.
