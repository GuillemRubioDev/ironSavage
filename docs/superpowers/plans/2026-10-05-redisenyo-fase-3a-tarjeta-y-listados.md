# Rediseño · Fase 3A: tarjeta de producto, selector rápido y listados · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nueva `ProductCard` con botón **Añadir** y selector rápido de variante (`QuickAddButton`), y listados (productos, categoría/objetivo, búsqueda) con franja oscura, filtros a la izquierda, etiquetas de filtros activos y panel de filtros desde abajo en móvil.

**Architecture:** La fase 3 del spec se parte en dos: 3A (este plan: tarjeta, selector rápido, listados) y 3B (ficha de producto). La regla de selección de variante vive en un módulo puro (`variant-selection.ts`), sin dependencias, que también usará la ficha en 3B; se prueba de verdad con `node --test`, porque Node 24 importa `.ts`. El selector rápido pide el producto con una acción de servidor al pulsar Añadir. Con una sola variante la añade directamente con la acción `addToCart` de siempre; si hay más, abre un diálogo en escritorio o un panel desde abajo en móvil. Los tres listados comparten `ListingHeader` y `CatalogResults`.

**Tech Stack:** Next.js 16.3 (`cacheComponents`), React 19.3, Tailwind 4, shadcn sobre Base UI (Dialog, Sheet), next-intl, sonner y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (tabla de componentes `ProductCard` y `QuickAddSheet`, sección 5.3, reglas 7.1, 7.8 y 7.9).

## Global Constraints

- No se cambia la lógica de negocio: se añade al carrito con la acción existente `addToCart(variantId, quantity)`, y los precios, el stock y la visibilidad son los de la API.
- Opciones únicas marcadas por defecto. Si el producto tiene una sola variante, Añadir funciona directamente sin abrir el selector (spec 7.8).
- La selección no se recuerda: empieza vacía en cada apertura, salvo las opciones únicas, y no se guarda en la URL ni en almacenamiento (spec 7.9).
- Sin librerías nuevas. Textos nuevos en `es` y `en` con las mismas claves. Cada feature usa solo sus namespaces (`Product` en products, `Filters`/`Sort`/`Search` en search).
- `features` no importan de `site`. Comentarios en español. Movimiento solo con las utilidades de la fase 1.
- Nunca se dejan servidores de prueba arrancados ni se toca el `npm run dev` del usuario. La verificación usa una copia temporal en el puerto 3200.

## Review Focus

- **Producto de una sola variante o sin grupos de opciones:** Añadir lo mete en el carrito sin abrir nada (test de `findVariant` en la Task 1 y test de fuente en la Task 2).
- **Combinación imposible (sabor sin ese tamaño):** la opción sale desactivada y no deja elegir una variante inexistente (test de `isOptionAvailable`, Task 1).
- **Producto ocultado o desactivado entre el listado y el clic:** aviso de error y nada roto (la Task 2 comprueba el `null` de la carga y el aviso).
- **Agotado:** la tarjeta muestra el botón desactivado "Agotado". En el selector, una variante agotada no se puede añadir (Task 2).
- **Teclado y lector de pantalla:** cada tarjeta tiene una sola parada de tabulación para el producto (la imagen queda fuera, con `tabIndex={-1}`) más el botón Añadir, y el nombre accesible del botón contiene el texto visible (Task 3).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/storefront/src/features/products/variant-selection.ts` (nuevo) | Regla pura de selección de variante |
| `apps/storefront/src/features/search/search-helpers.ts` | `withFacets()` para construir la URL de filtros |
| `apps/storefront/src/features/products/quick-add-data.ts` (nuevo) | Carga en caché de los datos mínimos del selector |
| `apps/storefront/src/features/products/quick-add.ts` (nuevo) | Acción de servidor `getQuickAddProduct(slug)` |
| `apps/storefront/src/features/products/components/quick-add-button.tsx` (nuevo) | Botón Añadir y selector rápido |
| `apps/storefront/src/features/products/components/product-card.tsx` | Tarjeta nueva |
| `apps/storefront/src/features/products/components/product-carousel.tsx` | Ajuste para la tarjeta nueva |
| `apps/storefront/src/features/products/components/listing-header.tsx` (nuevo) | Franja oscura de los listados |
| `apps/storefront/src/features/products/product-grid.tsx` | Barra con etiquetas de filtros y orden; `ProductCount` |
| `apps/storefront/src/features/search/active-filters.tsx` (nuevo) | Etiquetas de filtros activos |
| `apps/storefront/src/features/search/catalog-results.tsx` (nuevo) | Filtros más rejilla, común a los tres listados |
| `apps/storefront/src/features/search/facet-filters.tsx` | Panel desde abajo en móvil con "Ver X productos" |
| `apps/storefront/src/features/products/routes/list-page.tsx`, `features/collections/routes/page.tsx`, `features/search/routes/*` | Los tres listados con la estructura nueva |
| `apps/storefront/tests/design/catalog.test.mjs` (nuevo) | Tests de la fase |

Los bloques de código precedidos de `<!-- archivo: ruta -->` son el contenido completo de ese archivo.

---

### Task 1: Regla de selección de variante y URL de filtros

**Files:**
- Create: `apps/storefront/src/features/products/variant-selection.ts`
- Modify: `apps/storefront/src/features/search/search-helpers.ts` (añadir `withFacets` al final)
- Test: `apps/storefront/tests/design/catalog.test.mjs`

**Interfaces:**
- Produces: `initialSelection(groups) → Selection`, `findVariant(variants, groups, selection) → V | undefined`, `isOptionAvailable(variants, selection, groupId, optionId) → boolean`, con `Selection = Record<groupId, optionId>`.
- Produces: `withFacets(params: URLSearchParams, facetIds: string[]) → string` (query sin `page`).

- [ ] **Step 1: Escribir los tests que fallan**

<!-- archivo: apps/storefront/tests/design/catalog.test.mjs -->
```js
// Fase 3A del rediseño (tarjeta, selector rápido y listados).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

const sabor = {id: 'g1', options: [{id: 'choc'}, {id: 'van'}]};
const tamano = {id: 'g2', options: [{id: '1kg'}, {id: '2kg'}]};
const unico = {id: 'g3', options: [{id: 'bote'}]};
const v = (id, ...opts) => ({id, options: opts.map(([groupId, oid]) => ({groupId, id: oid}))});
const variants = [v('a', ['g1', 'choc'], ['g2', '1kg']), v('b', ['g1', 'choc'], ['g2', '2kg']), v('c', ['g1', 'van'], ['g2', '1kg'])];

test('solo los grupos de una opción salen marcados al empezar', async () => {
    const {initialSelection} = await load('features/products/variant-selection.ts');
    assert.deepEqual(initialSelection([sabor, unico, tamano]), {g3: 'bote'});
});

test('la variante solo existe con todos los grupos elegidos', async () => {
    const {findVariant} = await load('features/products/variant-selection.ts');
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'choc'}), undefined);
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'choc', g2: '2kg'})?.id, 'b');
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'van', g2: '2kg'}), undefined);
});

test('producto sin grupos y con una sola variante: esa variante, sin elegir nada', async () => {
    const {findVariant} = await load('features/products/variant-selection.ts');
    assert.equal(findVariant([v('solo')], [], {})?.id, 'solo');
    assert.equal(findVariant([v('x'), v('y')], [], {}), undefined);
});

test('una opción sin variante posible con el resto de la selección sale no disponible', async () => {
    const {isOptionAvailable} = await load('features/products/variant-selection.ts');
    assert.equal(isOptionAvailable(variants, {g1: 'van'}, 'g2', '2kg'), false);
    assert.equal(isOptionAvailable(variants, {g1: 'van'}, 'g2', '1kg'), true);
    assert.equal(isOptionAvailable(variants, {}, 'g1', 'van'), true);
});

test('withFacets cambia los filtros y vuelve a la página 1 sin tocar el resto', async () => {
    const {withFacets} = await load('features/search/search-helpers.ts');
    const params = new URLSearchParams('q=iso&facets=1&facets=2&page=3&sort=price-asc');
    assert.equal(withFacets(params, ['2', '5']), 'q=iso&sort=price-asc&facets=2&facets=5');
    assert.equal(withFacets(params, []), 'q=iso&sort=price-asc');
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs`
Expected: FAIL en los 5 tests (no existen las funciones).

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/variant-selection.ts -->
```ts
/**
 * Selección de variante a partir de las opciones elegidas: la usan el selector rápido
 * de las tarjetas y la ficha de producto. Sin dependencias, así que se prueba
 * directamente con node --test.
 *
 * Reglas del spec (7.8 y 7.9): un grupo con una sola opción sale ya marcado; la
 * selección vive solo en memoria (ni URL ni almacenamiento) y empieza vacía en cada
 * visita.
 */
export interface SelectableOption {
    id: string;
    groupId: string;
}

export interface SelectableVariant {
    id: string;
    options: SelectableOption[];
}

export interface SelectableGroup {
    id: string;
    options: Array<{id: string}>;
}

/** Grupo → opción elegida. */
export type Selection = Record<string, string>;

/** Marca de entrada solo los grupos que tienen una única opción. */
export function initialSelection(groups: SelectableGroup[]): Selection {
    const selection: Selection = {};
    for (const group of groups) {
        if (group.options.length === 1) selection[group.id] = group.options[0].id;
    }
    return selection;
}

function matches(variant: SelectableVariant, selection: Selection): boolean {
    return Object.entries(selection).every(([groupId, optionId]) =>
        variant.options.some(option => option.groupId === groupId && option.id === optionId),
    );
}

/** La variante de la selección; solo cuando todos los grupos están elegidos. */
export function findVariant<V extends SelectableVariant>(
    variants: V[],
    groups: SelectableGroup[],
    selection: Selection,
): V | undefined {
    if (groups.length === 0) return variants.length === 1 ? variants[0] : undefined;
    if (!groups.every(group => selection[group.id])) return undefined;
    return variants.find(variant => matches(variant, selection));
}

/** Si elegir esta opción deja alguna variante posible con lo ya elegido en los otros grupos. */
export function isOptionAvailable(
    variants: SelectableVariant[],
    selection: Selection,
    groupId: string,
    optionId: string,
): boolean {
    const next = {...selection, [groupId]: optionId};
    return variants.some(variant => matches(variant, next));
}
```

Al final de `features/search/search-helpers.ts`:

```ts
/**
 * Query de un listado con esta lista de filtros. Quita `page`, porque cambiar los
 * filtros vuelve a la página 1, y conserva el resto (búsqueda, orden).
 */
export function withFacets(params: URLSearchParams, facetIds: string[]): string {
    const next = new URLSearchParams(params);
    next.delete('facets');
    next.delete('page');
    facetIds.forEach(id => next.append('facets', id));
    return next.toString();
}
```

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs`
Expected: PASS 5/5.

- [ ] **Step 5: Commit** — `feat(catálogo): regla de selección de variante y URL de filtros`

---

### Task 2: Selector rápido de variante

**Files:**
- Create: `apps/storefront/src/features/products/quick-add-data.ts`, `quick-add.ts`, `components/quick-add-button.tsx`
- Modify: `apps/storefront/src/features/products/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/catalog.test.mjs`

**Interfaces:**
- Consumes: Task 1 (`initialSelection`, `findVariant`, `isOptionAvailable`); `addToCart(variantId, quantity)` existente; `getDisplayOptionGroups(product)` existente.
- Produces: `QuickAddButton({slug, productName, inStock})` (cliente).

- [ ] **Step 1: Escribir el test que falla** (añadir a `catalog.test.mjs`)

```js
test('el selector rápido carga el producto al pulsar y lo oculta si no está a la venta', async () => {
    const data = await read('features/products/quick-add-data.ts');
    assert.match(data, /'use cache'/);
    assert.match(data, /!product\.enabled \|\| product\.customFields\?\.visibleInStorefront === false/);
    assert.match(data, /getDisplayOptionGroups\(product\)/);
    assert.match(await read('features/products/quick-add.ts'), /^'use server';/);
});

test('Añadir mete directamente un producto de una sola variante y si no abre el selector', async () => {
    const button = await read('features/products/components/quick-add-button.tsx');
    assert.match(button, /loaded\.variants\.length === 1/);
    assert.match(button, /addToCart\(variant\.id, qty\)/);
    assert.match(button, /initialSelection\(loaded\.optionGroups\)/);
    assert.match(button, /side="bottom"/);
    assert.match(button, /<DialogContent/);
    assert.match(button, /disabled=\{!available\}/);
    assert.match(button, /t\('productUnavailable'\)/);
    assert.doesNotMatch(button, /localStorage|sessionStorage|searchParams/);
});

test('textos nuevos del selector rápido en es y en', async () => {
    for (const loc of ['es', 'en']) {
        const p = (await json(`features/products/messages/${loc}.json`)).Product;
        for (const k of ['quickAdd', 'quickAddLabel', 'quickAddTitle', 'quantity', 'decreaseQuantity', 'increaseQuantity', 'viewDetails', 'productUnavailable']) {
            assert.ok(p[k], `${loc}: falta Product.${k}`);
        }
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs`
Expected: FAIL en los 3 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/quick-add-data.ts -->
```ts
import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetProductDetailQuery} from '@/features/products/graphql';
import {getDisplayOptionGroups} from '@/features/products/product-options';

export interface QuickAddVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    imageUrl: string | null;
    options: Array<{id: string; groupId: string}>;
}

export interface QuickAddProduct {
    name: string;
    slug: string;
    imageUrl: string | null;
    optionGroups: Array<{id: string; name: string; options: Array<{id: string; name: string}>}>;
    variants: QuickAddVariant[];
}

/**
 * Datos mínimos del selector rápido de las tarjetas. Usa la misma consulta y las
 * mismas etiquetas de caché que la ficha, así que se revalida con ella. Devuelve null
 * si el producto ya no existe, está desactivado u oculto en la tienda.
 */
export async function loadQuickAddProduct(slug: string, locale: string, currencyCode: string): Promise<QuickAddProduct | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`product-${slug}-${locale}-${currencyCode}`);
    cacheTag('products');

    const {data} = await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
    const product = data.product;
    if (!product || !product.enabled || product.customFields?.visibleInStorefront === false) return null;

    return {
        name: product.name,
        slug: product.slug,
        imageUrl: product.assets[0]?.preview ?? null,
        optionGroups: getDisplayOptionGroups(product).map(group => ({
            id: group.id,
            name: group.name,
            options: group.options.map(option => ({id: option.id, name: option.name})),
        })),
        variants: product.variants.map(variant => ({
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            priceWithTax: variant.priceWithTax,
            discountedPriceWithTax: variant.discountedPriceWithTax,
            stockLevel: variant.stockLevel,
            imageUrl: variant.featuredAsset?.preview ?? null,
            options: variant.options.map(option => ({id: option.id, groupId: option.groupId})),
        })),
    };
}
```

<!-- archivo: apps/storefront/src/features/products/quick-add.ts -->
```ts
'use server';

import {getLocale} from 'next-intl/server';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {loadQuickAddProduct} from '@/features/products/quick-add-data';

/** Acción del selector rápido: el producto en el idioma y la moneda activos, o null. */
export async function getQuickAddProduct(slug: string) {
    const [locale, currencyCode] = await Promise.all([getLocale(), getActiveCurrencyCode()]);
    const product = await loadQuickAddProduct(slug, locale, currencyCode);
    return product ? {...product, currencyCode} : null;
}
```

<!-- archivo: apps/storefront/src/features/products/components/quick-add-button.tsx -->
```tsx
'use client';

import {useState, useTransition} from 'react';
import Image from 'next/image';
import {Minus, Plus, ShoppingBag} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Sheet, SheetContent, SheetTitle} from '@/components/ui/sheet';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';
import {Link} from '@/platform/i18n/navigation';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {addToCart} from '@/features/products/add-to-cart';
import {getQuickAddProduct} from '@/features/products/quick-add';
import type {QuickAddProduct, QuickAddVariant} from '@/features/products/quick-add-data';
import {findVariant, initialSelection, isOptionAvailable, type Selection} from '@/features/products/variant-selection';
import {Price} from '@/features/pricing/price';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';

type Loaded = QuickAddProduct & {currencyCode: string};

/**
 * Botón "Añadir" de las tarjetas. Al pulsarlo pide el producto (precio y stock al
 * día). Con una sola variante la añade directamente; si no, abre el selector rápido:
 * un diálogo en escritorio o un panel desde abajo en móvil. La selección empieza
 * vacía en cada apertura, salvo los grupos de una sola opción, y no se guarda.
 */
export function QuickAddButton({slug, productName, inStock}: {slug: string; productName: string; inStock: boolean}) {
    const t = useTranslations('Product');
    const isMobile = useIsMobile();
    const [product, setProduct] = useState<Loaded | null>(null);
    const [open, setOpen] = useState(false);
    const [selection, setSelection] = useState<Selection>({});
    const [quantity, setQuantity] = useState(1);
    const [loading, startLoading] = useTransition();
    const [adding, startAdding] = useTransition();

    const add = (loaded: Loaded, variant: QuickAddVariant, qty: number) => startAdding(async () => {
        const result = await addToCart(variant.id, qty);
        if (!result.success) {
            toast.error(t('errorTitle'), {description: result.error || t('errorAddToCart')});
            return;
        }
        const price = toMajorUnits(variant.priceWithTax);
        trackEvent('add_to_cart', {
            currency: loaded.currencyCode,
            value: price * qty,
            items: [{item_id: variant.sku || variant.id, item_name: loaded.name, item_variant: variant.name, price, quantity: qty}],
        });
        toast.success(t('addedToCartMessage'), {description: t('addedToCartDescription', {name: loaded.name})});
        setOpen(false);
    });

    const handleClick = () => startLoading(async () => {
        const loaded = await getQuickAddProduct(slug);
        if (!loaded) {
            toast.error(t('errorTitle'), {description: t('productUnavailable')});
            return;
        }
        setProduct(loaded);
        setQuantity(1);
        setSelection(initialSelection(loaded.optionGroups));
        const only = loaded.variants.length === 1 ? loaded.variants[0] : undefined;
        if (only && only.stockLevel !== 'OUT_OF_STOCK') {
            add(loaded, only, 1);
            return;
        }
        setOpen(true);
    });

    const busy = loading || adding;
    const body = product && (
        <QuickAddBody
            product={product}
            selection={selection}
            onSelect={(groupId, optionId) => setSelection(current => ({...current, [groupId]: optionId}))}
            quantity={quantity}
            onQuantity={setQuantity}
            adding={adding}
            onAdd={variant => add(product, variant, quantity)}
        />
    );

    return (
        <>
            <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!inStock || busy}
                onClick={handleClick}
                // El nombre accesible incluye el texto visible ("Añadir") más el producto.
                aria-label={inStock && !busy ? t('quickAddLabel', {name: productName}) : undefined}
            >
                <ShoppingBag aria-hidden="true" />
                {!inStock ? t('outOfStock') : busy ? t('adding') : t('quickAdd')}
            </Button>
            {product && (isMobile ? (
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-5">
                        <SheetTitle className="sr-only">{t('quickAddTitle')}</SheetTitle>
                        {body}
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogTitle className="sr-only">{t('quickAddTitle')}</DialogTitle>
                        {body}
                    </DialogContent>
                </Dialog>
            ))}
        </>
    );
}

function QuickAddBody({product, selection, onSelect, quantity, onQuantity, adding, onAdd}: {
    product: Loaded;
    selection: Selection;
    onSelect: (groupId: string, optionId: string) => void;
    quantity: number;
    onQuantity: (quantity: number) => void;
    adding: boolean;
    onAdd: (variant: QuickAddVariant) => void;
}) {
    const t = useTranslations('Product');
    const variant = findVariant(product.variants, product.optionGroups, selection);
    const image = variant?.imageUrl ?? product.imageUrl;
    const inStock = variant ? variant.stockLevel !== 'OUT_OF_STOCK' : false;
    const minPrice = Math.min(...product.variants.map(item => item.discountedPriceWithTax));
    const label = adding ? t('adding') : !variant ? t('selectOptions') : !inStock ? t('outOfStock') : t('addToCart');

    return (
        <div className="grid gap-5">
            <div className="flex gap-4 pr-8">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image && <Image src={image} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                    <p className="font-display text-2xl font-extrabold uppercase italic leading-none">{product.name}</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                        {variant ? (
                            <PriceWithDiscount before={variant.priceWithTax} after={variant.discountedPriceWithTax} currencyCode={product.currencyCode} />
                        ) : (
                            <>
                                <span className="mr-1 font-sans text-xs font-normal text-muted-foreground">{t('from')}</span>
                                <Price value={minPrice} currencyCode={product.currencyCode} />
                            </>
                        )}
                    </p>
                    <Link href={`/productos/${product.slug}`} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                        {t('viewDetails')}
                    </Link>
                </div>
            </div>

            {product.optionGroups.map(group => (
                <fieldset key={group.id}>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</legend>
                    <div className="flex flex-wrap gap-2">
                        {group.options.map(option => {
                            const selected = selection[group.id] === option.id;
                            const available = isOptionAvailable(product.variants, selection, group.id, option.id);
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={selected}
                                    disabled={!available}
                                    onClick={() => onSelect(group.id, option.id)}
                                    className={cn(
                                        'press rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40',
                                        selected ? 'border-primary-solid bg-primary-solid text-primary-foreground' : 'border-border hover:border-foreground',
                                    )}
                                >
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            ))}

            <div className="flex items-center gap-3">
                <div role="group" aria-label={t('quantity')} className="flex items-center rounded-md border border-border">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={t('decreaseQuantity')}>
                        <Minus aria-hidden="true" />
                    </Button>
                    <span aria-live="polite" className="w-8 text-center font-mono text-sm">{quantity}</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} aria-label={t('increaseQuantity')}>
                        <Plus aria-hidden="true" />
                    </Button>
                </div>
                <Button type="button" size="lg" className="flex-1" disabled={!variant || !inStock || adding} onClick={() => variant && onAdd(variant)}>
                    {label}
                </Button>
            </div>
        </div>
    );
}
```

Mensajes `Product` nuevos:
- es: `quickAdd` "Añadir", `quickAddLabel` "Añadir {name} al carrito", `quickAddTitle` "Elige tu opción", `quantity` "Cantidad", `decreaseQuantity` "Quitar uno", `increaseQuantity` "Añadir uno", `viewDetails` "Ver ficha completa", `productUnavailable` "Este producto ya no está disponible".
- en: `quickAdd` "Add", `quickAddLabel` "Add {name} to cart", `quickAddTitle` "Choose your option", `quantity` "Quantity", `decreaseQuantity` "Decrease quantity", `increaseQuantity` "Increase quantity", `viewDetails` "View full details", `productUnavailable` "This product is no longer available".

(Si alguna clave ya existe, se conserva su valor y no se duplica.)

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs && npx tsc --noEmit -p .`
Expected: PASS; tsc sin errores en `src` (ignorar los de `.next/`).

- [ ] **Step 5: Commit** — `feat(catálogo): selector rápido de variante con añadir directo para variante única`

---

### Task 3: Tarjeta de producto nueva

**Files:**
- Modify: `apps/storefront/src/features/products/components/product-card.tsx` (reescritura)
- Modify: `apps/storefront/src/features/products/components/product-carousel.tsx`
- Test: `apps/storefront/tests/design/catalog.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('la tarjeta tiene imagen fuera del tabulador, nombre como enlace y Añadir fuera del enlace', async () => {
    const card = await read('features/products/components/product-card.tsx');
    assert.match(card, /<article/);
    assert.match(card, /tabIndex=\{-1\} aria-hidden="true"/);
    assert.match(card, /<QuickAddButton slug=\{product\.slug\}/);
    assert.match(card, /hover-lift/);
    // Sin foto: el nombre en grande, no "Sin imagen".
    assert.doesNotMatch(card, /t\('noImage'\)/);
    // El botón no puede ir dentro de un <Link> (interactivo dentro de interactivo).
    const links = card.split('<Link').slice(1).map(s => s.split('</Link>')[0]);
    assert.ok(links.every(l => !l.includes('QuickAddButton')));
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/components/product-card.tsx -->
```tsx
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {Link} from '@/platform/i18n/navigation';
import {ProductCardFragment} from '@/features/products/graphql';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {discountPercent} from '@/features/pricing/discount-percent';
import {ProductBadges} from '@/features/products/components/product-badges';
import {QuickAddButton} from '@/features/products/components/quick-add-button';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    categoryName?: string;
}

/**
 * Tarjeta de producto: imagen (o el nombre en grande si no hay foto), etiquetas
 * Nuevo/Oferta, categoría principal, nombre, "desde X €" y botón Añadir con el
 * selector rápido. La imagen repite el enlace del nombre, así que queda fuera del
 * orden de tabulación y oculta a lectores de pantalla: una sola parada por producto
 * más el botón.
 */
export function ProductCard({product: productProp, categoryName}: ProductCardProps) {
    const t = useTranslations('Product');
    const product = readFragment(ProductCardFragment, productProp);
    const href = `/productos/${product.slug}`;
    const price = product.priceWithTax;
    const before = price.__typename === 'PriceRange' ? price.min : price.__typename === 'SinglePrice' ? price.value : 0;
    const isRange = price.__typename === 'PriceRange' && price.min !== price.max;

    return (
        <article className="hover-lift group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
            <Link href={href} tabIndex={-1} aria-hidden="true" className="img-zoom relative block aspect-square overflow-hidden bg-muted">
                {product.productAsset ? (
                    <Image
                        src={product.productAsset.preview}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-4 text-center font-display text-3xl font-black uppercase italic leading-none text-foreground/15 md:text-4xl">
                        {product.productName}
                    </span>
                )}
                <ProductBadges percent={discountPercent(before, product.discountedPriceWithTax.min)} isNew={product.isNew} />
                {!product.inStock && (
                    <span className="absolute bottom-3 left-3 rounded bg-background/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('outOfStock')}
                    </span>
                )}
            </Link>
            <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
                {categoryName && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{categoryName}</p>
                )}
                <h3 className="text-lg leading-tight md:text-xl">
                    <Link href={href} className="line-clamp-2 transition-colors hover:text-primary">{product.productName}</Link>
                </h3>
                <p className="mt-auto pt-2 font-mono text-base font-semibold">
                    {isRange && <span className="mr-1 font-sans text-xs font-normal normal-case text-muted-foreground">{t('from')}</span>}
                    <PriceWithDiscount before={before} after={product.discountedPriceWithTax.min} currencyCode={product.currencyCode} />
                </p>
                <div className="pt-2">
                    <QuickAddButton slug={product.slug} productName={product.productName} inStock={product.inStock} />
                </div>
            </div>
        </article>
    );
}
```

En `product-carousel.tsx`:
- quitar `hover-lift` del `className` de `CarouselItem` (ahora lo lleva la tarjeta);
- añadir `py-2` al `className` de `CarouselContent`, para que la elevación al pasar el ratón no se recorte con el `overflow-hidden` del carrusel;
- borrar el comentario del relleno horizontal, que hablaba de la tarjeta antigua.

Comprobar con `grep -rn "noImage" src` que la clave sigue usándose en otra parte; si no, se deja, porque el test de i18n no exige quitarla.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -5 && npx tsc --noEmit -p .`
Expected: PASS, salvo los 3 tests conocidos de `tests/upgrade`.

- [ ] **Step 5: Commit** — `feat(catálogo): tarjeta de producto nueva con botón Añadir`

---

### Task 4: Listados con franja oscura, filtros y etiquetas

**Files:**
- Create: `apps/storefront/src/features/products/components/listing-header.tsx`, `apps/storefront/src/features/search/active-filters.tsx`, `apps/storefront/src/features/search/catalog-results.tsx`
- Modify: `apps/storefront/src/features/products/product-grid.tsx`, `apps/storefront/src/features/search/facet-filters.tsx`, `apps/storefront/src/features/products/routes/list-page.tsx`, `apps/storefront/src/features/collections/routes/page.tsx`, `apps/storefront/src/features/search/routes/{page,search-term,search-results}.tsx`
- Modify: `apps/storefront/src/features/search/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/catalog.test.mjs`

**Interfaces:**
- Consumes: `withFacets` (Task 1).
- Produces: `ListingHeader({crumbs, title, count?, watermark?})`, `ProductCount({productDataPromise})`, `CatalogResults({productDataPromise, currentPage, showCount?})` y `ActiveFilters({facetValues})`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('los tres listados usan la franja oscura y la misma estructura de filtros y rejilla', async () => {
    for (const f of ['features/products/routes/list-page.tsx', 'features/collections/routes/page.tsx', 'features/search/routes/search-term.tsx']) {
        assert.match(await read(f), /<ListingHeader/, `${f} sin ListingHeader`);
    }
    for (const f of ['features/products/routes/list-page.tsx', 'features/collections/routes/page.tsx', 'features/search/routes/search-results.tsx']) {
        assert.match(await read(f), /<CatalogResults/, `${f} sin CatalogResults`);
    }
    assert.match(await read('features/products/routes/list-page.tsx'), /<ProductCount/);
});

test('etiquetas de filtros activos que se quitan y orden encima de la rejilla', async () => {
    const grid = await read('features/products/product-grid.tsx');
    assert.match(grid, /<ActiveFilters/);
    assert.match(grid, /<SortDropdown/);
    assert.match(grid, /grid-cols-2/);
    const chips = await read('features/search/active-filters.tsx');
    assert.match(chips, /withFacets\(/);
    assert.match(chips, /t\('removeFilter', \{name: value\.name\}\)/);
});

test('en móvil los filtros salen desde abajo, no se cierran al marcar y muestran "Ver X productos"', async () => {
    const filters = await read('features/search/facet-filters.tsx');
    assert.match(filters, /side="bottom"/);
    assert.match(filters, /t\('showResults', \{count: searchResult\.totalItems\}\)/);
    assert.doesNotMatch(filters, /setSheetOpen\(false\)/);
    assert.match(filters, /withFacets\(/);
    for (const loc of ['es', 'en']) {
        const m = await json(`features/search/messages/${loc}.json`);
        for (const k of ['showResults', 'removeFilter', 'activeFilters']) assert.ok(m.Filters[k], `${loc}: falta Filters.${k}`);
        assert.ok(m.Search.home, `${loc}: falta Search.home`);
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/catalog.test.mjs`
Expected: FAIL en los 3 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/components/listing-header.tsx -->
```tsx
import type {ReactNode} from 'react';
import {ChevronRight} from 'lucide-react';
import {BrandBand} from '@/components/brand/brand-band';
import {Link} from '@/platform/i18n/navigation';

/** Cabecera de los listados: franja oscura con migas de pan, título grande y nº de productos. */
export function ListingHeader({crumbs, title, count, watermark}: {
    crumbs: Array<{label: string; href?: string}>;
    title: string;
    count?: ReactNode;
    watermark?: string;
}) {
    return (
        <BrandBand
            watermark={watermark}
            title={title}
            eyebrow={
                <nav aria-label="breadcrumb">
                    <ol className="flex flex-wrap items-center gap-1">
                        {crumbs.map((crumb, i) => (
                            <li key={`${i}-${crumb.label}`} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                                {crumb.href ? (
                                    <Link href={crumb.href} className="transition-colors hover:text-brand-fg">{crumb.label}</Link>
                                ) : (
                                    <span aria-current="page" className="text-brand-fg">{crumb.label}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            }
        >
            {count && <p className="mt-2 text-sm text-brand-muted">{count}</p>}
        </BrandBand>
    );
}
```

<!-- archivo: apps/storefront/src/features/search/active-filters.tsx -->
```tsx
'use client';

import {X} from 'lucide-react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {withFacets} from '@/features/search/search-helpers';

/** Etiquetas de los filtros activos encima de la rejilla; cada una quita su filtro. */
export function ActiveFilters({facetValues}: {facetValues: Array<{id: string; name: string}>}) {
    const t = useTranslations('Filters');
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const selected = searchParams.getAll('facets');
    const active = selected
        .map(id => facetValues.find(value => value.id === id))
        .filter((value): value is {id: string; name: string} => Boolean(value));
    if (!active.length) return null;

    const go = (ids: string[]) => router.push(`${pathname}?${withFacets(new URLSearchParams(searchParams), ids)}`);

    return (
        <ul aria-label={t('activeFilters')} className="flex flex-wrap items-center gap-2">
            {active.map(value => (
                <li key={value.id}>
                    <button
                        type="button"
                        onClick={() => go(selected.filter(id => id !== value.id))}
                        aria-label={t('removeFilter', {name: value.name})}
                        className="press inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold transition-colors hover:border-foreground"
                    >
                        {value.name}
                        <X className="size-3" aria-hidden="true" />
                    </button>
                </li>
            ))}
            {active.length > 1 && (
                <li>
                    <button type="button" onClick={() => go([])} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                        {t('clearAll')}
                    </button>
                </li>
            )}
        </ul>
    );
}
```

<!-- archivo: apps/storefront/src/features/search/catalog-results.tsx -->
```tsx
import {Suspense} from 'react';
import type {ResultOf} from '@/platform/vendure/graphql';
import {SearchProductsQuery} from '@/features/search/graphql';
import {FacetFilters} from '@/features/search/facet-filters';
import {ProductGrid} from '@/features/products/product-grid';
import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

/** Filtros a la izquierda y rejilla de productos: la misma estructura en productos, categoría y búsqueda. */
export function CatalogResults({productDataPromise, currentPage, showCount = false}: {
    productDataPromise: Promise<{data: ResultOf<typeof SearchProductsQuery>; token?: string}>;
    currentPage: number;
    showCount?: boolean;
}) {
    return (
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-4 lg:gap-8">
            <aside className="lg:col-span-1">
                <Suspense fallback={<div className="h-11 animate-pulse rounded-lg bg-muted lg:h-64" />}>
                    <FacetFilters productDataPromise={productDataPromise} />
                </Suspense>
            </aside>
            <div className="lg:col-span-3">
                <Suspense fallback={<ProductGridSkeleton />}>
                    <ProductGrid productDataPromise={productDataPromise} currentPage={currentPage} take={12} showCount={showCount} />
                </Suspense>
            </div>
        </div>
    );
}
```

`product-grid.tsx`:
1. Sacar el cálculo de visibles a `async function countVisible(searchResult)`, que devuelve `{visibleItems, totalItems}` con la misma fórmula de hoy.
2. Añadir `export async function ProductCount({productDataPromise})`, que pinta `t('productCount', {count: totalItems})`.
3. Prop nueva `showCount?: boolean` (por defecto `false`).
4. La barra superior pasa a ser:
   ```tsx
   <div className="flex flex-wrap items-center justify-between gap-3">
       <div className="flex flex-wrap items-center gap-3">
           {showCount && <p className="text-sm text-muted-foreground">{t('productCount', {count: totalItems})}</p>}
           <ActiveFilters facetValues={searchResult.facetValues.map(f => ({id: f.facetValue.id, name: f.facetValue.name}))} />
       </div>
       <SortDropdown/>
   </div>
   ```
5. La rejilla pasa a `grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3`.

`facet-filters.tsx`:
- `toggleFacet` y `clearFilters` usan `withFacets(new URLSearchParams(searchParams), ids)` y dejan de cerrar el panel (se quitan los dos `setSheetOpen(false)`).
- El `SheetContent` móvil pasa a `side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-6"` con un pie fijo:
  ```tsx
  <div className="sticky bottom-0 -mx-6 mt-4 border-t border-border bg-background px-6 pt-4">
      <SheetClose render={<Button size="lg" className="w-full" />}>
          {t('showResults', {count: searchResult.totalItems})}
      </SheetClose>
  </div>
  ```
  (importar `SheetClose`). En escritorio no cambia nada.

Páginas:
- `list-page.tsx`: el `return` pasa a ser
  ```tsx
  <>
      <ListingHeader crumbs={[{label: t('home'), href: '/'}, {label: t('allProducts')}]} title={t('allProducts')} watermark="P"
          count={<Suspense fallback={null}><ProductCount productDataPromise={productDataPromise} /></Suspense>} />
      <CatalogResults productDataPromise={productDataPromise} currentPage={page} />
  </>
  ```
  Así `/productos` gana también los filtros. Se quitan los imports que sobran (`Breadcrumb*`, `Link`, `ProductGrid`, `ProductGridSkeleton`).
- `collections/routes/page.tsx`: igual, con `crumbs={[{label: t('home'), href: '/'}, {label: collectionName}]}`, `title={collectionName}` y `watermark={collectionName.charAt(0)}`.
- `search/routes/search-term.tsx`: devuelve `<ListingHeader crumbs={[{label: t('home'), href: '/'}, {label: t('title')}]} title={searchTerm ? t('resultsFor', {query: searchTerm}) : t('title')} />`. El esqueleto pasa a `<div className="h-40 animate-pulse bg-brand" />`.
- `search/routes/search-results.tsx`: devuelve `<CatalogResults productDataPromise={productDataPromise} currentPage={page} showCount />`. En la búsqueda la franja no lleva recuento, así que se muestra en la barra.
- `search/routes/page.tsx`: quitar el `div.container`, porque cada pieza trae el suyo.

Mensajes `search`:
- es: `Filters.showResults` "{count, plural, one {Ver # producto} other {Ver # productos}}", `Filters.removeFilter` "Quitar filtro: {name}", `Filters.activeFilters` "Filtros activos", `Search.home` "Inicio".
- en: `Filters.showResults` "{count, plural, one {Show # product} other {Show # products}}", `Filters.removeFilter` "Remove filter: {name}", `Filters.activeFilters` "Active filters", `Search.home` "Home".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -5 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de `tests/upgrade`; tsc y eslint limpios.

- [ ] **Step 5: Commit** — `feat(catálogo): listados con franja oscura, etiquetas de filtros y panel de filtros en móvil`

---

### Task 5: Verificación

- [ ] **Step 1:** `npm test`, `tsc` y `eslint` (solo fallan los 3 tests conocidos de upgrade).
- [ ] **Step 2:** `next build` en la copia temporal `tmp-fase3a/storefront` (unión de `node_modules`, variables de entorno de la API de desarrollo), seguido de `next start -p 3200`.
- [ ] **Step 3:** Capturas con `scratchpad/pw/visual-check.mjs` (`MSYS_NO_PATHCONV=1 OUT=fase3a PAGES=/productos,/categorias/proteinas,/search?q=iso`), en escritorio y móvil y en claro y oscuro. Además, un script que:
  - abre el selector rápido de un producto con varias variantes y captura el diálogo (escritorio) y el panel (móvil);
  - comprueba que, sin elegir nada, el botón dice "Selecciona opciones" y está desactivado;
  - pulsa Añadir en un producto de una sola variante y comprueba el aviso "Añadido al carrito" sin que se abra el selector.

  Expected: estado 200, 0 bloques ocultos y las comprobaciones en verde.
- [ ] **Step 4:** Limpieza: matar solo el árbol de procesos del puerto 3200, quitar la unión con `rmdir` desde dentro de la copia, borrar `tmp-fase3a` y comprobar que `apps/storefront/node_modules` sigue intacto.
