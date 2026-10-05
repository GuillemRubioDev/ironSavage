# Rediseño · Fase 4A: pendientes menores, carrito, canje de puntos y panel lateral · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- cerrar los detalles menores que dejaron las revisiones de las fases 2, 3A y 3B;
- rehacer el carrito con resumen oscuro fijo (barra fija en móvil) y canje de puntos con sesión;
- añadir el panel lateral (`CartDrawer`) que se abre al añadir un producto.

**Architecture:** La fase 4 del spec se parte en 4A (este plan) y 4B (checkout y confirmación). El canje de puntos vive en la feature de puntos: regla pura (`redemption.ts`), acciones de servidor que llaman a las mutaciones que el servidor ya expone (`redeemLoyaltyPoints` y `cancelLoyaltyPointsRedemption`) y un componente cliente; el carrito solo lo coloca. El panel lateral es un proveedor de contexto cliente de la feature de carrito (`cart-drawer.tsx`), montado en `site/locale-layout.tsx`. Las features de productos lo abren tras añadir con `useCartDrawer().open(slug)` y una acción de servidor le pasa el pedido activo y los productos para combinar.

**Tech Stack:** Next.js 16.3 (`cacheComponents`, `'use cache: private'`), React 19.3, Tailwind 4, Base UI (Sheet), next-intl, sonner y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md`: componente `CartDrawer`, 5.5 (carrito) y 7.2. Pendientes: informes de revisión final de las fases 2, 3A y 3B.

## Global Constraints

- No se cambia la lógica de negocio. El canje usa las mutaciones existentes y el servidor decide (mínimo, tope por pedido, que no supere el total, saldo); la tienda solo muestra lo que el servidor permite y traduce sus códigos de error. Añadir, quitar y cambiar cantidades usa las acciones existentes.
- La barra de "envío gratis" del spec **no** se hace: la API de la tienda no expone el importe mínimo de envío gratis (vive en la condición del método de envío del admin), y el spec dice "solo si existe".
- Sin librerías nuevas: se quita `embla-carousel-autoplay`, que ya no se usa. Textos en `es` y `en` con las mismas claves. Las features solo importan módulos de primer nivel de otras features; `site/` compone.
- Comentarios en español. Nunca se dejan servidores de prueba arrancados.

## Review Focus

- **Invitado en el carrito:** no aparece el canje (solo con sesión) y el resumen funciona igual (test de la Task 4).
- **Saldo por debajo del mínimo o pedido pequeño:** el canje explica el mínimo y no ofrece un botón que el servidor rechazaría. El máximo ofrecido respeta saldo, tope por pedido y total del pedido (tests de `maxRedeemablePoints`, Task 4).
- **Canje ya aplicado:** se ve la línea de descuento en el resumen (el recargo negativo del pedido) y se puede quitar. El total cuadra con lo que cobra el servidor (test de la Task 3: el resumen pinta `surcharges`).
- **Añadir con el panel:** el panel se abre tras añadir desde la tarjeta o la ficha. Si falla la carga de datos del panel, el producto ya está añadido y el panel muestra al menos "Ver carrito" (test de la Task 5).
- **Carrito vacío:** sin títulos duplicados, con un enlace a seguir comprando (test de la Task 3).

---

### Task 1: Pendientes de portada y listados (revisiones de las fases 2 y 3A)

**Files (Modify):**
- `features/loyalty/loyalty-teaser.tsx` y `features/loyalty/messages/{es,en}.json`
- `components/brand/collection-tile.tsx`
- `platform/revalidation/handler.ts`
- `site/home/messages/{es,en}.json`, `site/home/hero-banner.tsx`
- `features/products/quick-add-data.ts` y `components/quick-add-button.tsx`, `features/products/messages/{es,en}.json`
- `features/products/product-grid.tsx`
- `features/search/catalog-results.tsx` y `facet-filters.tsx`
- `app/[locale]/globals.css`; Delete `components/parallax-layer.tsx`; `package.json` (desinstalar `embla-carousel-autoplay`)

Todas las rutas cuelgan de `apps/storefront/src`, salvo `package.json`.

**Test:** `apps/storefront/tests/design/pending-fixes.test.mjs` (nuevo; misma cabecera `read`/`exists`/`json` que los tests de las fases anteriores).

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/pending-fixes.test.mjs -->
```js
// Detalles menores de las revisiones finales de las fases 2, 3A y 3B, cerrados en la fase 4A.
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..', '..');
const src = path.join(root, 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));

test('portada: plural de puntos, número de objetivo oculto, etiqueta revalidable y textos de puntos con cuenta', async () => {
    for (const loc of ['es', 'en']) {
        assert.match((await json(`features/loyalty/messages/${loc}.json`)).Loyalty.teaser.stats.earn, /\{count, plural/);
        assert.match((await json(`site/home/messages/${loc}.json`)).Home.trust.points.text, loc === 'es' ? /cuenta/ : /account/);
    }
    const teaser = await read('features/loyalty/loyalty-teaser.tsx');
    assert.match(teaser, /t\('stats\.earn', \{count: config\.pointsPerEuro\}\)/);
    assert.match(teaser, /getLoyaltyProgramConfig\(\)\.catch\(\(\) => null\)/);
    assert.match(teaser, /text-3xl sm:text-4xl md:text-5xl/);
    assert.match(await read('components/brand/collection-tile.tsx'), /<span aria-hidden="true" className="font-mono/);
    assert.match(await read('platform/revalidation/handler.ts'), /\{match: 'loyalty-config', kind: 'exact'\}/);
    assert.match(await read('site/home/hero-banner.tsx'), /&& Boolean\(banner\.image\)/);
});

test('restos sin uso eliminados: parallax y embla-carousel-autoplay', async () => {
    assert.equal(await exists('components/parallax-layer.tsx'), false);
    assert.doesNotMatch(await read('app/[locale]/globals.css'), /parallax-layer/);
    assert.doesNotMatch(await readFile(path.join(root, 'package.json'), 'utf8'), /embla-carousel-autoplay/);
});

test('listados: "Ver X" cuenta visibles, título del selector con el producto, misma visibilidad que la ficha y filtros quitables con 0 resultados', async () => {
    assert.match(await read('features/search/facet-filters.tsx'), /t\('showResults', \{count: visibleTotal\}\)/);
    assert.match(await read('features/search/catalog-results.tsx'), /visibleTotalPromise=\{visibleTotal\(productDataPromise\)\}/);
    assert.match(await read('features/products/quick-add-data.ts'), /!product\.customFields\?\.visibleInStorefront/);
    assert.match(await read('features/products/components/quick-add-button.tsx'), /t\('quickAddTitle', \{name: product\.name\}\)/);
    for (const loc of ['es', 'en']) assert.match((await json(`features/products/messages/${loc}.json`)).Product.quickAddTitle, /\{name\}/);
    const grid = await read('features/products/product-grid.tsx');
    assert.match(grid, /export async function visibleTotal/);
    const empty = grid.slice(grid.indexOf('if (!visibleItems.length)'), grid.indexOf('if (!visibleItems.length)') + 600);
    assert.match(empty, /<ActiveFilters/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/pending-fixes.test.mjs`
Expected: FAIL en los 3 tests.

- [ ] **Step 3: Implementar**

1. **Plural de puntos.** `Loyalty.teaser.stats.earn` pasa a ser:
   - es: `"{count, plural, one {punto por cada euro} other {puntos por cada euro}}"`
   - en: `"{count, plural, one {point per euro spent} other {points per euro spent}}"`

   En `loyalty-teaser.tsx`, `label: t('stats.earn', {count: config.pointsPerEuro})`.
2. **Teaser a prueba de fallos.** En `loyalty-teaser.tsx` la configuración se lee con `getLoyaltyProgramConfig().catch(() => null)`. Si es `null`, no se pinta la lista de cifras y el resto del bloque sigue igual.
3. **Cifras en móvil.** En `loyalty-teaser.tsx`, la clase del valor pasa a `text-3xl sm:text-4xl md:text-5xl`.
4. **Número del objetivo.** En `collection-tile.tsx`, el span del número `01` gana `aria-hidden="true"` (queda `<span aria-hidden="true" className="font-mono …">`).
5. **Etiqueta revalidable.** En `handler.ts`, añadir `{match: 'loyalty-config', kind: 'exact'},` a `TAG_RULES`.
6. **Textos de puntos.** `Home.trust.points.text`: es "Puntos en cada pedido con tu cuenta" / en "Points on every order with an account".
7. **Banner lateral sin foto.** En `hero-banner.tsx`, `const side = (banner.imageLayout === 'left' || banner.imageLayout === 'right') && Boolean(banner.image);`.
8. **Restos sin uso.** Borrar `components/parallax-layer.tsx` y el bloque CSS `.parallax-layer` de `globals.css`, con su comentario y su `@media`. Ejecutar `npm uninstall embla-carousel-autoplay -w storefront --ignore-scripts` desde la raíz del repo; actualiza `package.json` y `package-lock.json`, y el paquete no lo usa nadie (`grep` sin resultados).
9. **Visibilidad igual que la ficha.** En `quick-add-data.ts`, la condición pasa a `!product || !product.enabled || !product.customFields?.visibleInStorefront`.
10. **Título del selector.** `Product.quickAddTitle`: es "Elige tu opción: {name}" / en "Choose your option: {name}". En `quick-add-button.tsx` se usa `t('quickAddTitle', {name: product.name})` en los dos `Title`.
11. **"Ver X productos" con visibles.** En `product-grid.tsx`, exportar:
    ```ts
    /** Total de productos visibles de un listado (para el botón "Ver X productos" de los filtros en móvil). */
    export async function visibleTotal(productDataPromise: ProductGridProps['productDataPromise']): Promise<number> {
        const result = await productDataPromise;
        return (await countVisible(result.data.search)).totalItems;
    }
    ```
    `CatalogResults` pasa `visibleTotalPromise={visibleTotal(productDataPromise)}` a `FacetFilters`. `FacetFilters` declara la prop `visibleTotalPromise: Promise<number>`, lee `const visibleTotal = use(visibleTotalPromise);` y usa `t('showResults', {count: visibleTotal})`.
12. **Filtros con 0 resultados.** En el estado vacío de `ProductGrid` se pinta también `<ActiveFilters facetValues={…}/>` encima del mensaje "No se han encontrado productos", con el mismo `map` que en la barra, para poder quitar el filtro.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/pending-fixes.test.mjs && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 tests conocidos de `tests/upgrade`.

- [ ] **Step 5: Commit** — `fix(rediseño): pendientes menores de portada y listados`

---

### Task 2: Pendientes de la ficha (revisión de la fase 3B)

**Files (Modify):**
- `features/products/routes/page.tsx`
- `components/product-info.tsx`, `components/quick-add-button.tsx`
- `components/product-details.tsx`, `components/product-gallery.tsx`, `components/key-figures.tsx`
- `features/products/product-facts.ts`, `messages/{es,en}.json`

- [ ] **Step 1: Escribir el test que falla** (añadir a `pending-fixes.test.mjs`)

```js
test('ficha a prueba de fallos: sin configuración de puntos o sin variantes no se rompe', async () => {
    assert.match(await read('features/products/routes/page.tsx'), /getLoyaltyProgramConfig\(\)\.catch\(\(\) => null\)/);
    assert.match(await read('features/products/routes/page.tsx'), /pointsPerEuro=\{loyalty\?\.pointsPerEuro \?\? 0\}/);
    assert.match(await read('features/products/components/product-info.tsx'), /product\.variants\.length > 0 \? Math\.min/);
});

test('desplegables encontrables con Ctrl+F y con encabezado h2', async () => {
    const details = await read('features/products/components/product-details.tsx');
    assert.match(details, /hiddenUntilFound/);
    assert.match(details, /headingLevel=\{2\}/);
});

test('galería: sin parpadeo al saltar, zoom nítido, región con teclado y puntos de 24 px', async () => {
    const gallery = await read('features/products/components/product-gallery.tsx');
    assert.match(gallery, /programmaticScroll\.current/);
    assert.match(gallery, /tabIndex=\{0\}/);
    assert.match(gallery, /size-6/);
    assert.match(gallery, /\(max-width: 1024px\) 100vw, 1100px/);
});

test('opciones no disponibles anunciadas, "formato" no es cantidad y claves huérfanas fuera', async () => {
    for (const f of ['features/products/components/product-info.tsx', 'features/products/components/quick-add-button.tsx']) {
        assert.match(await read(f), /t\('optionUnavailable'\)/, f);
    }
    assert.doesNotMatch(await read('features/products/product-facts.ts'), /formato/);
    assert.match(await read('features/products/components/key-figures.tsx'), /break-words/);
    for (const loc of ['es', 'en']) {
        const p = (await json(`features/products/messages/${loc}.json`)).Product;
        assert.ok(p.optionUnavailable, `${loc}: falta optionUnavailable`);
        for (const k of ['noImagesAvailable', 'previousImage', 'nextImage']) assert.equal(p[k], undefined, `${loc}: sobra ${k}`);
        assert.equal(p.food.title, undefined, `${loc}: sobra food.title`);
    }
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/pending-fixes.test.mjs`
Expected: FAIL en los 4 tests nuevos.

- [ ] **Step 3: Implementar**

1. **Ficha sin configuración de puntos.** En `routes/page.tsx`, `getLoyaltyProgramConfig().catch(() => null)` dentro del `Promise.all`, y `pointsPerEuro={loyalty?.pointsPerEuro ?? 0}`.
2. **Ficha sin variantes.** En `product-info.tsx`, `const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.discountedPriceWithTax)) : null;`. Si es `null` no se pinta precio: ni en el bloque ni en la barra móvil.
3. **Desplegables.** En `product-details.tsx`, `AccordionContent` con `hiddenUntilFound` en lugar de `keepMounted`, para que el contenido siga en el HTML y además Ctrl+F lo encuentre. `AccordionTrigger` con `headingLevel={2}`.
4. **Galería:**
   - `const programmaticScroll = useRef(false);`. `goTo` lo pone a `true` y lo devuelve a `false` en el evento `scrollend`, o con un `setTimeout` de 600 ms si el navegador no tiene `scrollend`. `onScroll` sale sin hacer nada mientras `programmaticScroll.current` sea `true`.
   - La región gana `tabIndex={0}` y `aria-roledescription="carrusel"` (en: tomarlo de `t('galleryRole')`; es "carrusel" / en "carousel").
   - Los puntos de móvil pasan a ser `button` de `size-6`, con el punto visual dentro: `<span className={cn('h-1.5 rounded-full …')} />`.
   - `sizes` de la foto: `"(max-width: 1024px) 100vw, 1100px"`, para que el zoom ×2 no se vea pixelado.
5. **Opciones no disponibles.** En `product-info.tsx` y `quick-add-button.tsx`, dentro del botón de opción, si `!available && !selected`: `<span className="sr-only"> ({t('optionUnavailable')})</span>`. Mensaje `Product.optionUnavailable`: es "no disponible con la selección actual" / en "not available with the current selection".
6. **"Formato" no es cantidad.** En `product-facts.ts`, `SIZE = /peso|tama[nñ]o|size|weight|cantidad/i`.
7. **Cifras largas.** En `key-figures.tsx`, el valor gana `break-words`. Si contiene `·`, usa `text-3xl md:text-4xl` en vez de `text-5xl md:text-6xl`.
8. **Claves huérfanas.** Quitar de `Product` (es y en) `noImagesAvailable`, `previousImage`, `nextImage` y `food.title`, tras comprobar con `grep -rn` que nadie las usa. Añadir `galleryRole`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS. Si algún test anterior comprobaba `keepMounted`, se actualiza a `hiddenUntilFound` y se deja un ruling.

- [ ] **Step 5: Commit** — `fix(rediseño): pendientes menores de la ficha de producto`

---

### Task 3: Carrito con resumen oscuro y barra fija en móvil

**Files:**
- Modify: `apps/storefront/src/features/cart/graphql.ts` (`GetActiveOrderQuery` gana `surcharges { id sku description priceWithTax }`)
- Modify: `apps/storefront/src/features/cart/routes/order-summary.tsx`, `cart-items.tsx`, `cart.tsx`, `page.tsx`
- Modify: `apps/storefront/src/features/cart/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/cart.test.mjs` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/cart.test.mjs -->
```js
// Fase 4A del rediseño: carrito, canje de puntos y panel lateral.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('resumen oscuro con recargos (canje de puntos) y barra fija en móvil', async () => {
    assert.match(await read('features/cart/graphql.ts'), /surcharges \{\s*id\s*sku\s*description\s*priceWithTax\s*\}/);
    const summary = await read('features/cart/routes/order-summary.tsx');
    assert.match(summary, /bg-brand/);
    assert.match(summary, /activeOrder\.surcharges/);
    assert.match(summary, /lg:hidden fixed inset-x-0 bottom-0/);
});

test('carrito vacío sin título duplicado y con enlace a seguir comprando', async () => {
    const items = await read('features/cart/routes/cart-items.tsx');
    assert.doesNotMatch(items, /<h1/);
    assert.match(items, /href="\/productos"/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/cart.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

- **`graphql.ts`:** en `GetActiveOrderQuery`, tras `discounts { … }`:
  ```graphql
              surcharges {
                  id
                  sku
                  description
                  priceWithTax
              }
  ```
- **`order-summary.tsx`:**
  - `ActiveOrder` gana `surcharges?: Array<{id: string; sku: string; description: string; priceWithTax: number}> | null`.
  - El contenedor pasa a `rounded-lg bg-brand p-6 text-brand-fg lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]`. Los textos `text-muted-foreground` pasan a `text-brand-muted` y los bordes a `border-brand-line`. El botón "Seguir comprando" pasa a la variante `brand`.
  - Tras los descuentos, cada recargo se pinta como una línea: `activeOrder.surcharges?.map(s => …)` con su `description` y `<Price value={s.priceWithTax} …/>`, en `text-primary-text` si es negativo.
  - Nueva prop `redemptionSlot?: ReactNode`, que se pinta antes del total (la rellena la Task 4).
  - Al final del componente, una barra fija para móvil: `<div className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-brand-line bg-brand px-4 py-3 text-brand-fg" style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}>`, con el total (`font-mono text-lg`) y el botón "Finalizar compra" (`flex-1`).
- **`cart.tsx`:** el contenedor de la rejilla gana `pb-24 lg:pb-0`, para que la barra fija no tape el final.
- **`cart-items.tsx`:**
  - Estado vacío sin `container` ni `h1`: un bloque centrado con el icono `ShoppingBag` (`size-12 text-muted-foreground`), `<p className="text-display text-2xl">{t('empty')}</p>`, el mensaje y `<Button render={<Link href="/productos" />} …>{t('continueShopping')}</Button>`.
  - En las líneas, el nombre pasa a la fuente display (`font-display text-lg font-extrabold uppercase italic`) y la imagen a `rounded-lg bg-muted`. La lógica no cambia.
- **`page.tsx`:** el `h1` pasa a `<h1 className="text-5xl md:text-6xl mb-8">{t('title')}</h1>` y el contenedor a `py-10 md:py-14`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/cart.test.mjs && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(carrito): resumen oscuro con recargos y barra fija en móvil`

---

### Task 4: Canje de puntos en el carrito (solo con sesión)

**Files:**
- Create: `apps/storefront/src/features/loyalty/redemption.ts` (puro), `redeem-actions.ts` (`'use server'`), `points-redemption.tsx` (cliente)
- Modify: `apps/storefront/src/features/loyalty/graphql.ts`, `messages/{es,en}.json`
- Modify: `apps/storefront/src/features/cart/routes/cart.tsx` (lee saldo y configuración y pasa `redemptionSlot`)
- Test: `apps/storefront/tests/design/cart.test.mjs`

**Interfaces:**
- Produces: `maxRedeemablePoints({balance, pointValueInCents, maxDiscountPerOrderCents, orderTotalWithTax}) → number`; `redeemPoints(points) → {success: true} | {success: false; error: string}`; `cancelRedemption() → {success: boolean}`; `PointsRedemption({balance, minPoints, maxPoints, pointValueInCents, currencyCode, applied: {points: number; amount: number} | null})`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('el máximo canjeable respeta saldo, tope por pedido y total del pedido', async () => {
    const {maxRedeemablePoints} = await load('features/loyalty/redemption.ts');
    const base = {pointValueInCents: 1, maxDiscountPerOrderCents: 2000};
    assert.equal(maxRedeemablePoints({...base, balance: 500, orderTotalWithTax: 8139}), 500);
    assert.equal(maxRedeemablePoints({...base, balance: 5000, orderTotalWithTax: 8139}), 2000);
    assert.equal(maxRedeemablePoints({...base, balance: 5000, orderTotalWithTax: 1500}), 1499);
    assert.equal(maxRedeemablePoints({...base, balance: 0, orderTotalWithTax: 1500}), 0);
});

test('el canje usa las mutaciones del servidor, refresca el carrito y solo aparece con sesión', async () => {
    assert.match(await read('features/loyalty/graphql.ts'), /redeemLoyaltyPoints\(points: \$points\)/);
    assert.match(await read('features/loyalty/graphql.ts'), /cancelLoyaltyPointsRedemption/);
    const actions = await read('features/loyalty/redeem-actions.ts');
    assert.match(actions, /^'use server';/);
    assert.match(actions, /updateTag\('cart'\)/);
    assert.match(actions, /t\(`redeem\.errors\.\$\{code\}`\)/);
    const cart = await read('features/cart/routes/cart.tsx');
    assert.match(cart, /loyaltyAccount/);
    assert.match(cart, /redemptionSlot=\{/);
    assert.match(cart, /sku === 'LOYALTY_POINTS_DISCOUNT'/);
    const ui = await read('features/loyalty/points-redemption.tsx');
    assert.match(ui, /maxPoints < minPoints/);
    for (const loc of ['es', 'en']) {
        const r = (await json(`features/loyalty/messages/${loc}.json`)).Loyalty.redeem;
        for (const k of ['title', 'available', 'equals', 'apply', 'applied', 'remove', 'minimum']) assert.ok(r[k], `${loc}: falta redeem.${k}`);
        for (const c of ['BELOW_MINIMUM', 'ALREADY_REDEEMED', 'EXCEEDS_MAX_DISCOUNT', 'EXCEEDS_ORDER_TOTAL', 'INSUFFICIENT_BALANCE', 'NO_CUSTOMER', 'generic']) assert.ok(r.errors[c], `${loc}: falta redeem.errors.${c}`);
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/cart.test.mjs`
Expected: FAIL en los 2 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/loyalty/redemption.ts -->
```ts
/**
 * Regla del canje de puntos en el carrito, sin dependencias (se prueba con node --test).
 * Refleja las comprobaciones del servidor (LoyaltyService.redeemPoints) para no ofrecer
 * un canje que se va a rechazar; quien decide sigue siendo el servidor.
 */
export function maxRedeemablePoints({balance, pointValueInCents, maxDiscountPerOrderCents, orderTotalWithTax}: {
    balance: number;
    pointValueInCents: number;
    maxDiscountPerOrderCents: number;
    orderTotalWithTax: number;
}): number {
    if (balance <= 0 || pointValueInCents <= 0) return 0;
    const byCap = Math.floor(maxDiscountPerOrderCents / pointValueInCents);
    // El descuento tiene que quedar por debajo del total (el servidor rechaza >=).
    const byTotal = Math.floor((orderTotalWithTax - 1) / pointValueInCents);
    return Math.max(0, Math.min(balance, byCap, byTotal));
}
```

En `features/loyalty/graphql.ts`, al final:

```ts
// Canje de puntos sobre el pedido activo (el servidor valida mínimo, tope, total y saldo).
export const RedeemLoyaltyPointsMutation = graphql(`
    mutation RedeemLoyaltyPoints($points: Int!) {
        redeemLoyaltyPoints(points: $points) {
            __typename
            ... on LoyaltyRedemption {
                discountCents
                balance
            }
            ... on LoyaltyRedemptionError {
                errorCode
                message
            }
        }
    }
`);

export const CancelLoyaltyRedemptionMutation = graphql(`
    mutation CancelLoyaltyRedemption {
        cancelLoyaltyPointsRedemption
    }
`);
```

<!-- archivo: apps/storefront/src/features/loyalty/redeem-actions.ts -->
```ts
'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {updateTag} from 'next/cache';
import {mutate} from '@/platform/vendure/api';
import {CancelLoyaltyRedemptionMutation, RedeemLoyaltyPointsMutation} from '@/features/loyalty/graphql';

const KNOWN_ERRORS = ['BELOW_MINIMUM', 'ALREADY_REDEEMED', 'EXCEEDS_MAX_DISCOUNT', 'EXCEEDS_ORDER_TOTAL', 'INSUFFICIENT_BALANCE', 'NO_CUSTOMER'];

/** Canjea puntos sobre el pedido activo con la mutación del servidor y refresca el carrito. */
export async function redeemPoints(points: number): Promise<{success: true} | {success: false; error: string}> {
    const t = await getTranslations({locale: await getLocale(), namespace: 'Loyalty'});
    try {
        const {data} = await mutate(RedeemLoyaltyPointsMutation, {points}, {useAuthToken: true});
        const result = data.redeemLoyaltyPoints;
        if (result.__typename === 'LoyaltyRedemption') {
            updateTag('cart');
            updateTag('active-order');
            return {success: true};
        }
        const code = KNOWN_ERRORS.includes(result.errorCode) ? result.errorCode : 'generic';
        return {success: false, error: t(`redeem.errors.${code}`)};
    } catch {
        return {success: false, error: t('redeem.errors.generic')};
    }
}

/** Deshace el canje del pedido activo (el servidor devuelve los puntos) y refresca el carrito. */
export async function cancelRedemption(): Promise<{success: boolean}> {
    try {
        const {data} = await mutate(CancelLoyaltyRedemptionMutation, {}, {useAuthToken: true});
        updateTag('cart');
        updateTag('active-order');
        return {success: data.cancelLoyaltyPointsRedemption};
    } catch {
        return {success: false};
    }
}
```

<!-- archivo: apps/storefront/src/features/loyalty/points-redemption.tsx -->
```tsx
'use client';

import {useState, useTransition} from 'react';
import {Star} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {cancelRedemption, redeemPoints} from '@/features/loyalty/redeem-actions';

/**
 * Canje de puntos Iron Rewards en el resumen del carrito (solo se monta con sesión).
 * Ofrece hasta el máximo que el servidor aceptaría; con un canje aplicado muestra los
 * puntos usados y permite quitarlo.
 */
export function PointsRedemption({balance, minPoints, maxPoints, pointValueInCents, currencyCode, applied}: {
    balance: number;
    minPoints: number;
    maxPoints: number;
    pointValueInCents: number;
    currencyCode: string;
    applied: {points: number; amount: number} | null;
}) {
    const t = useTranslations('Loyalty.redeem');
    const [points, setPoints] = useState(maxPoints);
    const [pending, startTransition] = useTransition();

    if (applied) {
        return (
            <div className="rounded-md border border-brand-line p-3 text-sm">
                <p className="flex items-center gap-2">
                    <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
                    {t('applied', {points: applied.points})}
                </p>
                <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    className="mt-2"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                        const result = await cancelRedemption();
                        if (!result.success) toast.error(t('errors.generic'));
                    })}
                >
                    {t('remove')}
                </Button>
            </div>
        );
    }

    if (maxPoints < minPoints) {
        return (
            <p className="rounded-md border border-brand-line p-3 text-xs text-brand-muted">
                {t('available', {balance})} · {t('minimum', {min: minPoints})}
            </p>
        );
    }

    const value = Math.min(Math.max(points, minPoints), maxPoints);

    return (
        <form
            className="rounded-md border border-brand-line p-3 text-sm"
            onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                    const result = await redeemPoints(value);
                    if (!result.success) toast.error(result.error);
                });
            }}
        >
            <p className="flex items-center gap-2 font-semibold">
                <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
                {t('title')}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{t('available', {balance})}</p>
            <div className="mt-3 flex items-center gap-2">
                <label className="sr-only" htmlFor="redeem-points">{t('title')}</label>
                <input
                    id="redeem-points"
                    type="number"
                    inputMode="numeric"
                    min={minPoints}
                    max={maxPoints}
                    step={1}
                    value={value}
                    onChange={(event) => setPoints(Number(event.target.value) || minPoints)}
                    className="h-9 w-24 rounded-md border border-brand-line bg-transparent px-2 font-mono text-brand-fg"
                />
                <span className="text-xs text-brand-muted">
                    {t('equals')} <Price value={value * pointValueInCents} currencyCode={currencyCode} />
                </span>
                <Button type="submit" size="sm" className="ml-auto" disabled={pending}>{t('apply')}</Button>
            </div>
        </form>
    );
}
```

En `features/cart/routes/cart.tsx`:
- importar `GetMyLoyaltyQuery` de `@/features/loyalty/graphql`, `getLoyaltyProgramConfig` de `@/features/loyalty/program-config`, `maxRedeemablePoints` de `@/features/loyalty/redemption` y `PointsRedemption` de `@/features/loyalty/points-redemption`;
- junto a la consulta del pedido, en un `Promise.all`, leer `query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true})` y `getLoyaltyProgramConfig()`, los dos con `.catch(() => null)`;
- `const loyaltyAccount = loyalty?.data.loyaltyAccount ?? null;` Si es `null` (invitado o sin cuenta), no se monta el canje;
- canje aplicado:
  ```ts
  const appliedSurcharge = activeOrder.surcharges?.find(s => s.sku === 'LOYALTY_POINTS_DISCOUNT');
  const applied = appliedSurcharge && config
      ? {points: Math.round(-appliedSurcharge.priceWithTax / config.pointValueInCents), amount: appliedSurcharge.priceWithTax}
      : null;
  ```
- `redemptionSlot={loyaltyAccount && config ? <PointsRedemption balance={loyaltyAccount.balance} minPoints={config.minRedeemablePoints} maxPoints={maxRedeemablePoints({balance: loyaltyAccount.balance, pointValueInCents: config.pointValueInCents, maxDiscountPerOrderCents: config.maxDiscountPerOrderCents, orderTotalWithTax: activeOrder.totalWithTax})} pointValueInCents={config.pointValueInCents} currencyCode={activeOrder.currencyCode} applied={applied} /> : null}`.

Nota: el recargo del canje puede llevar IVA; los puntos se calculan sobre `priceWithTax` y se redondean. Lo que manda es el importe del recargo, que el resumen ya muestra.

Mensajes `Loyalty.redeem`:
- es:
  - `title` "Canjea tus puntos"
  - `available` "Tienes {balance} puntos"
  - `equals` "="
  - `apply` "Canjear"
  - `applied` "Has canjeado {points} puntos en este pedido"
  - `remove` "Quitar canje"
  - `minimum` "necesitas al menos {min} puntos para canjear"
  - `errors`:
    - `BELOW_MINIMUM` "Tienes que canjear al menos el mínimo de puntos."
    - `ALREADY_REDEEMED` "Ya has canjeado puntos en este pedido."
    - `EXCEEDS_MAX_DISCOUNT` "Superas el descuento máximo por pedido."
    - `EXCEEDS_ORDER_TOTAL` "El descuento no puede igualar o superar el total del pedido."
    - `INSUFFICIENT_BALANCE` "No tienes puntos suficientes."
    - `NO_CUSTOMER` "Inicia sesión para canjear puntos."
    - `generic` "No se han podido canjear los puntos. Inténtalo de nuevo."
- en:
  - `title` "Redeem your points"
  - `available` "You have {balance} points"
  - `equals` "="
  - `apply` "Redeem"
  - `applied` "You redeemed {points} points on this order"
  - `remove` "Remove"
  - `minimum` "you need at least {min} points to redeem"
  - `errors`:
    - `BELOW_MINIMUM` "You need to redeem at least the minimum points."
    - `ALREADY_REDEEMED` "You already redeemed points on this order."
    - `EXCEEDS_MAX_DISCOUNT` "This exceeds the maximum discount per order."
    - `EXCEEDS_ORDER_TOTAL` "The discount can't equal or exceed the order total."
    - `INSUFFICIENT_BALANCE` "You don't have enough points."
    - `NO_CUSTOMER` "Sign in to redeem points."
    - `generic` "Points couldn't be redeemed. Please try again."

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/cart.test.mjs && npx tsc --noEmit -p . && npx eslint src/features/loyalty src/features/cart`
Expected: PASS y limpio. Si el tipo de `errorCode` de gql.tada no es `string`, se hace `String(result.errorCode)` y se deja un ruling.

- [ ] **Step 5: Commit** — `feat(carrito): canje de puntos Iron Rewards con sesión`

---

### Task 5: Panel lateral al añadir (`CartDrawer`)

**Files:**
- Create: `apps/storefront/src/features/cart/cart-drawer.tsx` (cliente: proveedor, hook y panel), `apps/storefront/src/features/cart/drawer-data.ts` (`'use server'` más carga en caché)
- Modify: `apps/storefront/src/site/locale-layout.tsx` (monta `CartDrawerProvider`)
- Modify: `apps/storefront/src/features/products/components/quick-add-button.tsx` y `product-info.tsx` (al añadir con éxito, `openCartDrawer(slug)`)
- Modify: `apps/storefront/src/features/cart/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/cart.test.mjs`

**Interfaces:**
- Produces: `CartDrawerProvider({children})`, `useCartDrawer() → {open: (productSlug: string) => void}`, `getCartDrawerData(slug) → {order: {totalQuantity, subTotalWithTax, currencyCode, line: {name, variantName, quantity, imageUrl, linePrice} | null} | null; related: Array<{slug, name, imageUrl, price, currencyCode}>} | null`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('panel lateral: se abre tras añadir desde la tarjeta y la ficha, con pedido activo y "Combínalo con"', async () => {
    const drawer = await read('features/cart/cart-drawer.tsx');
    assert.match(drawer, /^'use client';/);
    assert.match(drawer, /export function useCartDrawer\b/);
    assert.match(drawer, /export function CartDrawerProvider\b/);
    assert.match(drawer, /side="right"/);
    assert.match(drawer, /href="\/carrito"/);
    assert.match(drawer, /href="\/checkout"/);
    const data = await read('features/cart/drawer-data.ts');
    assert.match(data, /^'use server';/);
    assert.match(data, /filterVisibleProducts/);
    assert.match(await read('site/locale-layout.tsx'), /<CartDrawerProvider>/);
    assert.match(await read('features/products/components/quick-add-button.tsx'), /openCartDrawer\(loaded\.slug\)/);
    assert.match(await read('features/products/components/product-info.tsx'), /openCartDrawer\(product\.slug\)/);
    for (const loc of ['es', 'en']) {
        const c = (await json(`features/cart/messages/${loc}.json`)).Cart;
        for (const k of ['drawerTitle', 'combineWith', 'viewCart', 'drawerError']) assert.ok(c[k], `${loc}: falta Cart.${k}`);
    }
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/cart.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/cart/drawer-data.ts -->
```ts
'use server';

import {cacheLife, cacheTag} from 'next/cache';
import {getLocale} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {readFragment} from '@/platform/vendure/graphql';
import {GetActiveOrderQuery} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {GetProductDetailQuery, ProductCardFragment} from '@/features/products/graphql';
import {filterVisibleProducts} from '@/features/products/visibility';
import {SearchProductsQuery} from '@/features/search/graphql';

type Related = Array<{slug: string; name: string; imageUrl: string | null; price: number; currencyCode: string}>;

/** "Combínalo con": productos visibles de la categoría principal del producto añadido. */
async function loadRelated(slug: string, locale: string, currencyCode: string): Promise<Related> {
    'use cache';
    cacheLife('hours');
    cacheTag(`related-products-${slug}-${locale}-${currencyCode}`);
    cacheTag('products');

    const {data} = await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
    const collections = data.product?.collections ?? [];
    const primary = collections.find(c => c.parent?.id) ?? collections[0];
    if (!primary) return [];
    const result = await query(SearchProductsQuery, {
        input: {collectionSlug: primary.slug, take: 8, skip: 0, groupByProduct: true},
    }, {languageCode: locale, currencyCode});
    const visible = await filterVisibleProducts(result.data.search.items);
    return visible
        .map(item => readFragment(ProductCardFragment, item))
        .filter(item => item.slug !== slug)
        .slice(0, 3)
        .map(item => ({
            slug: item.slug,
            name: item.productName,
            imageUrl: item.productAsset?.preview ?? null,
            price: item.discountedPriceWithTax.min,
            currencyCode: item.currencyCode,
        }));
}

/**
 * Datos del panel lateral tras añadir: el pedido activo (sin caché, es del cliente),
 * la línea del producto añadido y los productos para combinar. null si algo falla:
 * el producto ya está en el carrito y el panel muestra igualmente "Ver carrito".
 */
export async function getCartDrawerData(slug: string) {
    try {
        const [locale, currencyCode] = await Promise.all([getLocale(), getActiveCurrencyCode()]);
        const [{data}, related] = await Promise.all([
            query(GetActiveOrderQuery, {}, {useAuthToken: true, languageCode: locale, currencyCode}),
            loadRelated(slug, locale, currencyCode).catch(() => [] as Related),
        ]);
        const order = data.activeOrder;
        const line = order?.lines.find(l => l.productVariant.product.slug === slug) ?? null;
        return {
            order: order ? {
                totalQuantity: order.totalQuantity,
                subTotalWithTax: order.subTotalWithTax,
                currencyCode: order.currencyCode,
                line: line ? {
                    name: line.productVariant.product.name,
                    variantName: line.productVariant.name,
                    quantity: line.quantity,
                    imageUrl: line.productVariant.product.featuredAsset?.preview ?? null,
                    linePrice: line.discountedLinePriceWithTax,
                } : null,
            } : null,
            related: related.filter(r => !order?.lines.some(l => l.productVariant.product.slug === r.slug)),
        };
    } catch {
        return null;
    }
}
```

<!-- archivo: apps/storefront/src/features/cart/cart-drawer.tsx -->
```tsx
'use client';

import {createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode} from 'react';
import Image from 'next/image';
import {CheckCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTitle} from '@/components/ui/sheet';
import {Link} from '@/platform/i18n/navigation';
import {Price} from '@/features/pricing/price';
import {getCartDrawerData} from '@/features/cart/drawer-data';

type DrawerData = Awaited<ReturnType<typeof getCartDrawerData>>;

const CartDrawerContext = createContext<{open: (productSlug: string) => void} | null>(null);

/** Abre el panel lateral del carrito tras añadir. Fuera del proveedor no hace nada. */
export function useCartDrawer() {
    return useContext(CartDrawerContext) ?? {open: () => {}};
}

/**
 * Panel lateral que se abre al añadir un producto: confirmación, línea añadida,
 * subtotal, "Combínalo con" y botones Finalizar compra / Ver carrito. Lee el pedido
 * activo al abrirse; si eso falla, el producto ya está añadido y quedan los botones.
 */
export function CartDrawerProvider({children}: {children: ReactNode}) {
    const t = useTranslations('Cart');
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<DrawerData | undefined>(undefined);
    const [loading, startLoading] = useTransition();

    const openDrawer = useCallback((productSlug: string) => {
        setData(undefined);
        setOpen(true);
        startLoading(async () => setData(await getCartDrawerData(productSlug)));
    }, []);
    const value = useMemo(() => ({open: openDrawer}), [openDrawer]);

    const order = data?.order;
    const close = () => setOpen(false);

    return (
        <CartDrawerContext.Provider value={value}>
            {children}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                    <div className="border-b border-border p-5">
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
                            {t('drawerTitle')}
                        </SheetTitle>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto p-5" aria-busy={loading}>
                        {loading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
                        {!loading && data === null && <p className="text-sm text-muted-foreground">{t('drawerError')}</p>}
                        {order?.line && (
                            <div className="flex gap-4">
                                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                                    {order.line.imageUrl && <Image src={order.line.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
                                </div>
                                <div className="min-w-0 text-sm">
                                    <p className="font-display text-lg font-extrabold uppercase italic leading-tight">{order.line.name}</p>
                                    {order.line.variantName !== order.line.name && <p className="text-muted-foreground">{order.line.variantName}</p>}
                                    <p className="mt-1 font-mono">{order.line.quantity} × · <Price value={order.line.linePrice} currencyCode={order.currencyCode} /></p>
                                </div>
                            </div>
                        )}
                        {order && (
                            <p className="flex justify-between border-t border-border pt-4 text-sm">
                                <span className="text-muted-foreground">{t('subtotal')} ({order.totalQuantity})</span>
                                <span className="font-mono font-semibold"><Price value={order.subTotalWithTax} currencyCode={order.currencyCode} /></span>
                            </p>
                        )}
                        {data?.related && data.related.length > 0 && (
                            <section aria-labelledby="drawer-combine">
                                <h3 id="drawer-combine" className="mb-3 text-xl">{t('combineWith')}</h3>
                                <ul className="space-y-3">
                                    {data.related.map(item => (
                                        <li key={item.slug}>
                                            <Link href={`/productos/${item.slug}`} onClick={close} className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-muted">
                                                <span className="relative size-14 shrink-0 overflow-hidden rounded bg-muted">
                                                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                                                </span>
                                                <span className="min-w-0 flex-1 text-sm font-semibold">{item.name}</span>
                                                <span className="font-mono text-sm"><Price value={item.price} currencyCode={item.currencyCode} /></span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <div className="grid gap-2 border-t border-border p-5">
                        <Button render={<Link href="/checkout" onClick={close} />} nativeButton={false} size="lg">{t('proceedToCheckout')}</Button>
                        <Button render={<Link href="/carrito" onClick={close} />} nativeButton={false} size="lg" variant="outline">{t('viewCart')}</Button>
                    </div>
                </SheetContent>
            </Sheet>
        </CartDrawerContext.Provider>
    );
}
```

- **`site/locale-layout.tsx`:** importar `CartDrawerProvider` de `@/features/cart/cart-drawer` y envolver con él el contenido dentro de `NextIntlClientProvider` (cabecera, `main` y pie), para que el panel tenga traducciones y lo puedan usar las tarjetas y la ficha.
- **`quick-add-button.tsx`:** `const {open: openCartDrawer} = useCartDrawer();` (import de `@/features/cart/cart-drawer`). En `add`, tras el éxito, en lugar de `toast.success(...)`: `openCartDrawer(loaded.slug);` (el panel confirma). Los errores siguen saliendo como aviso.
- **`product-info.tsx`:** igual. `ProductInfo` necesita `product.slug`: se añade `slug: string` a `DetailProduct` en `product-detail-types.ts`; la consulta ya lo trae. Tras el éxito, `openCartDrawer(product.slug)` en lugar del aviso. Se mantienen `setIsAdded` y el evento de analítica.

Mensajes `Cart`:
- `drawerTitle`: "Añadido al carrito" / "Added to cart"
- `combineWith`: "Combínalo con" / "Pairs well with"
- `viewCart`: "Ver carrito" / "View cart"
- `drawerError`: "El producto está en tu carrito. No hemos podido cargar el resumen." / "The product is in your cart. We couldn't load the summary."

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de upgrade; limpio.

- [ ] **Step 5: Commit** — `feat(carrito): panel lateral al añadir con pedido activo y "Combínalo con"`

---

### Task 6: Verificación

- [ ] **Step 1:** `npm test`, `tsc` y `eslint`.
- [ ] **Step 2:** `next build` en la copia `tmp-fase4a` y `next start -p 3200` contra la API de desarrollo.
- [ ] **Step 3:** Con playwright:
  - en `/productos`, pulsar Añadir en un producto de una variante: se abre el panel con "Añadido al carrito", la línea y el subtotal;
  - pulsar "Ver carrito": carrito con el resumen oscuro (escritorio) y la barra fija (móvil);
  - capturas del carrito vacío y del carrito con productos, en claro y oscuro y en escritorio y móvil;
  - el canje solo se puede probar con sesión: se comprueba que como invitado no aparece. Con sesión queda como comprobación manual del usuario en develop, y se dice así.
- [ ] **Step 4:** Limpieza: solo el árbol del puerto 3200; quitar la unión con `rmdir` desde dentro de la copia; borrar la copia; comprobar `node_modules`.
