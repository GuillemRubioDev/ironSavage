# Base de datos y migraciones

Este documento explica cómo se versiona el esquema de la base de datos en este
proyecto, qué cambios se han hecho y cómo aplicarlos en cualquier entorno
(máquina local, staging, producción o instalación nueva).

## Cómo funciona el versionado del esquema

- La base de datos es **PostgreSQL** y el backend es **Vendure** (TypeORM por debajo).
- `synchronize` está **desactivado** (`apps/server/src/vendure-config.ts`): el
  esquema **nunca** se modifica automáticamente a partir de las entidades.
- Cada cambio de esquema es un fichero de migración TypeORM versionado en git en
  [`apps/server/src/migrations/`](../apps/server/src/migrations/). TypeORM guarda
  en la tabla `migrations` cuáles se han aplicado ya, así que aplicar migraciones
  es idempotente: solo se ejecutan las pendientes, en orden.
- **Las migraciones pendientes se aplican solas al arrancar el servidor**:
  [`apps/server/src/index.ts`](../apps/server/src/index.ts) ejecuta
  `runMigrations(config)` antes de `bootstrap(config)`. Esto aplica tanto a
  `npm run dev` (el CLI `vendure dev` arranca `src/index.ts`) como a producción
  (`node dist/index.js`, el `CMD` del `apps/server/Dockerfile`). Si una migración
  falla, el proceso termina con código de error y el servidor no arranca.
- El worker (`index-worker.ts`) **no** ejecuta migraciones; depende de que el
  servidor lo haya hecho.

### Comandos reales del proyecto

Todos se ejecutan desde `apps/server`:

| Acción | Comando |
|---|---|
| Aplicar migraciones pendientes sin arrancar el servidor | `npx vendure migrate --run` |
| Generar una migración nueva tras cambiar entidades/custom fields | `npx vendure migrate --generate NombreDescriptivo` |
| Revertir la última migración aplicada | `npx vendure migrate --revert` |
| Crear la configuración comercial mínima (idempotente) | `npm run seed` |

No hay paso de "generación del ORM": TypeORM lee las entidades en tiempo de
ejecución. Los tipos GraphQL generados (`apps/server/src/gql/graphql-env.d.ts`
y `apps/storefront/src/graphql-env.d.ts`) están versionados en git y no hace
falta regenerarlos para usar la aplicación (ver más abajo si cambias la API).

## Cambio: rol ATLETA (migración `AddAthletes`)

- **Fichero**: [`apps/server/src/migrations/1790547825314-AddAthletes.ts`](../apps/server/src/migrations/1790547825314-AddAthletes.ts)
- **Plugin**: [`apps/server/src/plugins/athletes/`](../apps/server/src/plugins/athletes/)
- **Por qué existe**: añade atletas — clientes que no ganan puntos por sus
  propias compras sino cuando otros clientes compran con su código
  promocional — con recompensas trazables y reversibles.
- **Solo crea tablas nuevas.** No modifica ni transforma datos ni tablas
  existentes, así que es segura sobre bases de datos con datos reales. Los
  cupones/promociones existentes no se tocan.

### Tablas nuevas

#### `athlete` — un cliente marcado como atleta

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `createdAt`, `updatedAt` | timestamp | |
| `customerId` | integer NOT NULL | FK → `customer.id` `ON DELETE CASCADE`; **UNIQUE** (un cliente solo puede ser atleta una vez) |
| `enabled` | boolean NOT NULL default `true` | desactivado = sus códigos dejan de aplicar y vuelve a ganar puntos como cliente normal |
| `notes` | text NULL | notas internas del admin (nunca se exponen en la tienda) |

#### `athlete_code` — códigos promocionales de un atleta, con condiciones propias

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `athleteId` | integer NOT NULL | FK → `athlete.id` `ON DELETE CASCADE`; índice |
| `code` | varchar(32) NOT NULL | **UNIQUE**; siempre en mayúsculas (CHECK) → sin duplicados lógicos por mayúsculas/minúsculas |
| `enabled` | boolean NOT NULL default `true` | |
| `discountType` | varchar NOT NULL | `PERCENTAGE` \| `FIXED_AMOUNT` |
| `discountValue` | numeric(10,2) NOT NULL | % (0–100) o céntimos |
| `rewardType` | varchar NOT NULL | `PERCENTAGE` \| `FIXED_POINTS` |
| `rewardValue` | numeric(10,2) NOT NULL | % (0–100) o puntos por pedido |
| `promotionId` | integer NULL | FK → `promotion.id` `ON DELETE SET NULL`; **UNIQUE**. Promoción de Vendure que aplica el descuento en el checkout |

CHECK constraints: `CHK_athlete_code_canonical` (`code = UPPER(code)`),
`CHK_athlete_code_types` (tipos válidos), `CHK_athlete_code_values`
(valores ≥ 0 y porcentajes ≤ 100).

#### `athlete_reward` — una recompensa generada por un pedido (snapshot inmutable)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `athleteId` | integer NOT NULL | FK → `athlete.id` `ON DELETE CASCADE`; índice |
| `athleteCodeId` | integer NULL | FK → `athlete_code.id` `ON DELETE SET NULL`; índice |
| `code` | varchar(32) NOT NULL | código usado (snapshot) |
| `orderId` | integer NOT NULL | **UNIQUE** → garantiza como máximo una recompensa por pedido (idempotencia) |
| `orderCode` | varchar NOT NULL | snapshot |
| `customerId` | integer NULL | cliente que hizo el pedido (solo visible para admins) |
| `baseAmount` | integer NOT NULL | base de cálculo en céntimos (`subTotalWithTax` del pedido) |
| `customerDiscountAmount` | integer NOT NULL default 0 | descuento que recibió el cliente |
| `currencyCode` | varchar(3) NOT NULL | |
| `discountType`, `discountValue` | varchar / numeric(10,2) | condiciones del descuento en ese momento |
| `rewardType`, `rewardValue` | varchar / numeric(10,2) | regla de recompensa aplicada en ese momento |
| `pointValueInCents` | integer NOT NULL | valor del punto en ese momento |
| `points` | integer NOT NULL | puntos concedidos |
| `revertedPoints` | integer NOT NULL default 0 | puntos anulados después |
| `unrecoveredPoints` | integer NOT NULL default 0 | parte anulada que no se pudo descontar porque el atleta ya la había gastado |
| `status` | varchar NOT NULL default `ACTIVE` | `ACTIVE` \| `PARTIALLY_REVERTED` \| `REVERTED` |
| `loyaltyTransactionId` | integer NULL | movimiento `ATHLETE_REWARD` del ledger de puntos que abonó los puntos |

CHECK constraints: `CHK_athlete_reward_points` (0 ≤ `unrecoveredPoints` ≤
`revertedPoints` ≤ `points`), `CHK_athlete_reward_status`.

#### `athlete_reward_reversal` — cada anulación (total o parcial) de una recompensa

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `rewardId` | integer NOT NULL | FK → `athlete_reward.id` `ON DELETE CASCADE`; índice |
| `reason` | varchar NOT NULL | `ORDER_CANCELLED` \| `REFUND` \| `MANUAL` |
| `refundId` | integer NULL | reembolso de Vendure que la originó |
| `points` | integer NOT NULL | puntos anulados (> 0) |
| `debitedPoints` | integer NOT NULL | puntos realmente descontados del saldo |
| `loyaltyTransactionId` | integer NULL | movimiento `ATHLETE_REWARD_REVERSAL` del ledger |
| `note` | varchar NULL | |
| `administratorUserId` | integer NULL | admin que hizo una anulación manual |

Índices únicos parciales (idempotencia de reversiones):
`IDX_athlete_reward_reversal_refund` (`rewardId`, `refundId`) `WHERE "refundId" IS NOT NULL`
y `IDX_athlete_reward_reversal_cancel` (`rewardId`) `WHERE "reason" = 'ORDER_CANCELLED'`.
CHECK: `CHK_athlete_reward_reversal_points`, `CHK_athlete_reward_reversal_reason`.

### Tablas existentes

- **Ningún cambio de esquema.** La tabla `loyalty_transaction` recibe dos
  valores nuevos en la columna `type` (`ATHLETE_REWARD`,
  `ATHLETE_REWARD_REVERSAL`), pero esa columna es `varchar` sin constraint, así
  que no requiere migración.
- Al crear un código de atleta, el plugin crea una fila normal en `promotion`
  (y sus tablas asociadas) a través del `PromotionService` de Vendure. Son datos
  de aplicación, no esquema.

### Seeds

No se modifican: `npm run seed` crea configuración comercial (país, IVA,
envío, métodos de pago). Los atletas son datos de negocio que se crean desde
el dashboard (**Customers → Athletes**), igual que los clientes o productos.

## Cambio: un atleta no puede existir sin su cliente (migración `AddAthleteSoftDelete`)

- **Fichero**: [`apps/server/src/migrations/1790584974877-AddAthleteSoftDelete.ts`](../apps/server/src/migrations/1790584974877-AddAthleteSoftDelete.ts)
- **Por qué existe**: Vendure **nunca borra físicamente** un cliente (le pone
  `customer.deletedAt`), así que el `ON DELETE CASCADE` de `athlete.customerId`
  nunca se dispara. Sin esto, al borrar un cliente su atleta seguía existiendo
  y **sus códigos seguían dando descuento**.
- **Esquema**: columna nueva `athlete.deletedAt` (`timestamp NULL`).
- **Datos (transformación segura, idempotente)**: para los atletas cuyo cliente
  ya estaba borrado, marca el atleta como eliminado (`deletedAt`, `enabled = false`),
  desactiva sus códigos y borra (soft delete) sus promociones. No toca nada más.
  El `down` elimina la columna pero no deshace esa corrección de datos.
- **En ejecución**: el plugin escucha `CustomerEvent('deleted')` y hace lo
  mismo en cuanto se borra un cliente. La acción "Remove athlete role" del
  dashboard usa el mismo mecanismo (el cliente sigue existiendo). Si más tarde
  se vuelve a hacer atleta a ese cliente, se restaura el mismo registro y su
  historial de recompensas sigue asociado.

## Cambio: prueba de aceptación de las condiciones en cada pedido (migración `AddOrderTermsAcceptance`)

- **Fichero**: [`apps/server/src/migrations/1790607020732-AddOrderTermsAcceptance.ts`](../apps/server/src/migrations/1790607020732-AddOrderTermsAcceptance.ts)
- **Plugin**: [`apps/server/src/plugins/legal-acceptance/`](../apps/server/src/plugins/legal-acceptance/)
- **Por qué existe**: poder demostrar, ante una reclamación, cuándo aceptó el cliente los términos y condiciones y qué
  versión aceptó.
- **Esquema**: dos columnas nuevas en `order`, ambas `NULL`: `customFieldsTermsacceptedat` (`timestamp`) y
  `customFieldsTermsversion` (`varchar(255)`). Son los campos personalizados de pedido `termsAcceptedAt` y
  `termsVersion`.
- **Solo añade columnas.** No transforma datos. Los pedidos existentes quedan con los dos campos vacíos. Es segura
  sobre bases de datos con datos reales. El `down` elimina las dos columnas.
- **API**: la Shop API gana la mutación `acceptTermsForActiveOrder(version: String!)`. Los tipos del storefront
  (`apps/storefront/src/graphql-env.d.ts`) ya están regenerados. Detalles de funcionamiento en
  [legal.md](legal.md#prueba-de-aceptación-en-cada-pedido).

## Cambio: información alimentaria de los productos (migración `AddProductFoodInformation`)

- **Fichero**: [`apps/server/src/migrations/1790677439821-AddProductFoodInformation.ts`](../apps/server/src/migrations/1790677439821-AddProductFoodInformation.ts)
- **Definición**: [`apps/server/src/product-food-information.ts`](../apps/server/src/product-food-information.ts)
- **Por qué existe**: la información alimentaria obligatoria de cada producto (Reglamento UE 1169/2011) y las
  advertencias de los complementos alimenticios (RD 1487/2009). Ver [iva-envios-facturacion.md](iva-envios-facturacion.md).
- **Esquema**: columnas nuevas de campos personalizados, todas vacías salvo una:
  - `product_translation`: ingredientes, alérgenos, información nutricional, modo de empleo, advertencias,
    conservación y país de origen (traducibles).
  - `product`: `customFieldsIsfoodsupplement` (boolean, por defecto `true`) y `customFieldsFoodoperator`.
  - `product_variant_translation`: `customFieldsNetquantity`.
- **Solo añade columnas.** Segura con datos reales.

## Cambio: facturas rectificativas y registro fiscal (migración `AddRectifyingInvoices`)

- **Fichero**: [`apps/server/src/migrations/1790677970688-AddRectifyingInvoices.ts`](../apps/server/src/migrations/1790677970688-AddRectifyingInvoices.ts)
- **Plugin**: [`apps/server/src/plugins/invoicing/`](../apps/server/src/plugins/invoicing/)
- **Por qué existe**: emitir una factura rectificativa (serie R) por cada reembolso liquidado, y guardar el resultado
  del registro en Veri*Factu cuando se configure un proveedor.
- **Esquema** (tabla `invoice`):
  - Columnas nuevas: `type` (`ORDINARY` por defecto), `rectifiesInvoiceId`, `rectifiedInvoiceNumber`,
    `rectifiedInvoiceDate`, `refundId` (único), `reason` y `fiscalRegistration`.
  - El índice único sobre `orderId` pasa a ser **parcial**: una sola factura **ordinaria** por pedido, pero varias
    rectificativas.
- **Datos**: las facturas existentes quedan como `ORDINARY`. No se transforma nada más. Segura con datos reales.
- **No hay cambios de esquema** para IVA y envíos: las categorías, zonas y el método «Envío estándar» son datos que
  crea o actualiza `npm run seed`. Ejecútalo una vez tras actualizar, porque es idempotente.

## Actualizar tu base de datos local después de `git pull`

```bash
git pull
npm install                 # desde la raíz; necesario solo si cambió package-lock.json
cd apps/server
npx vendure migrate --run   # aplica AddAthletes, AddAthleteSoftDelete y cualquier otra pendiente
cd ../..
npm run dev
```

**Si ya tenías `npm run dev` arrancado, páralo y vuelve a arrancarlo.** El
servidor se reinicia solo al cambiar ficheros, pero el servidor Vite del
dashboard (puerto 5173) calcula la lista de plugins con extensiones **solo al
arrancar**: un plugin nuevo (p. ej. `customer-accounts`, con el bloque
"Account access" de la ficha de cliente) no aparece en el dashboard hasta
reiniciarlo.

El paso `npx vendure migrate --run` es opcional: `npm run dev` aplica las
migraciones pendientes al arrancar el servidor. Ejecutarlo antes permite ver
cualquier error de migración de forma aislada. No hace falta volver a ejecutar
`npm run seed`.

Para comprobar qué migraciones tiene aplicadas tu BD:

```bash
docker exec -it tienda-suple-30ab1ace-postgres_db-1 psql -U vendure -d vendure -c 'select name from migrations order by id;'
```

## Crear una base de datos completamente nueva

Con el Postgres local de `apps/server/docker-compose.yml`:

```bash
cd apps/server
docker compose up -d postgres_db   # si no está levantado
npx vendure migrate --run          # crea TODAS las tablas, incluidas las de atletas
npm run seed                       # configuración comercial mínima
cd ../..
npm run dev
```

Las migraciones en `apps/server/src/migrations/` son la única fuente del
esquema: una BD vacía queda exactamente en el esquema actual (16 migraciones a
fecha de este cambio). Este procedimiento se ha verificado de principio a fin
sobre una base de datos vacía nueva.

Si quieres empezar de cero en local borrando todos los datos:
`docker compose down -v` en `apps/server` (elimina el volumen de Postgres) y
repite los pasos anteriores.

## Producción

- No hay que ejecutar SQL manual. El contenedor del servidor arranca con
  `node dist/index.js`, que ejecuta `runMigrations()` antes de arrancar Vendure,
  así que el siguiente despliegue con este código aplica `AddAthletes`
  automáticamente (ver también `DOCKER_PRODUCTION.md` y `PRODUCTION_OPERATIONS.md`).
- Las migraciones se compilan a `dist/migrations/*.js` junto con el servidor
  (`npm run build`) y la configuración las carga desde `path.join(__dirname,
  './migrations/*.+(js|ts)')`.
- Una base de datos de producción nueva se crea igual que en local:
  `runMigrations` al primer arranque (o `npx vendure migrate --run`) y `npm run
  seed` con `APP_ENV=production` (que no crea el método de pago de prueba).
- Recomendación operativa habitual: backup de la BD antes de desplegar. Esta
  migración solo crea tablas nuevas y es reversible con `npx vendure migrate --revert`
  (verificado: up → down → up).

## Crear migraciones nuevas (para el equipo)

1. Cambia la entidad/custom field.
2. Asegúrate de que tu BD local tiene todas las migraciones existentes aplicadas
   (`npx vendure migrate --run`), si no la migración generada incluirá cambios ajenos.
3. `npx vendure migrate --generate NombreDescriptivo` desde `apps/server`.
4. Revisa el SQL generado (que solo contenga tu cambio) y súbelo a git junto con el código.
5. Nunca edites una migración ya compartida/aplicada en otros entornos: crea una nueva.

Si el cambio también modifica la API GraphQL, regenera los tipos versionados:
`npm run build` en `apps/server` (dashboard) y, con el servidor arrancado,
`../../node_modules/.bin/gql-tada generate-output` en `apps/storefront`.
