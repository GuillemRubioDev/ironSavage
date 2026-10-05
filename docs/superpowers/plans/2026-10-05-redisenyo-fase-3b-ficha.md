# Rediseño · Fase 3B: ficha de producto · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer la ficha de producto según el spec 5.4:
- galería por variante con zoom y carrusel en móvil;
- selección sin URL y con las opciones únicas marcadas;
- bloque de compra con cantidad, puntos y mini franja de confianza;
- desplegables de información;
- franja oscura de cifras clave.

**Architecture:** Se reutiliza la regla pura de la 3A (`variant-selection.ts`: `initialSelection`, `findVariant`, `selectOption`, `isOptionAvailable`). Se añade otro módulo puro, `product-facts.ts`, con la galería ordenada por variante, las cifras clave y los puntos; se prueba de verdad con `node --test`. La selección vive solo en el estado del componente cliente: se quita `?grupo=opcion` de la URL. Los desplegables y las cifras clave son componentes de servidor. El resumen de estrellas lo aporta la feature de reseñas mediante un hueco (`ratingSlot`) que rellena `site/`, igual que ya se hace con la sección de reseñas.

**Tech Stack:** Next.js 16.3 (`cacheComponents`), React 19.3, Tailwind 4, Base UI (Accordion), next-intl y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (5.4, 7.8 y 7.9).

## Global Constraints

- No se cambia la lógica de negocio: se añade con `addToCart(variantId, quantity)`, y los precios y el stock son los de la API.
- Los puntos se calculan con `loyaltyProgramConfig.pointsPerEuro`, con la misma fórmula que el servidor (`floor(euros × puntosPorEuro)`).
- Al entrar no hay nada marcado salvo las opciones únicas. La selección no se guarda en la URL ni en almacenamiento (7.8 y 7.9).
- La información alimentaria (Reg. 1169/2011) tiene que seguir presente en la página antes de comprar: los desplegables montan su contenido aunque estén cerrados (`keepMounted`).
- Sin librerías nuevas. Textos en `es` y `en` con las mismas claves. Las features solo importan módulos de primer nivel de otras features; `site/` compone las funcionalidades.
- Comentarios en español. Nunca se dejan servidores de prueba arrancados.

## Review Focus

- **Producto sin fotos:** se muestra el nombre en grande, no una caja con "Sin imagen" (test de la Task 3).
- **Variante sin fotos propias:** se ven las del producto; con fotos propias, primero las suyas y después las del producto, sin repetir (test de `galleryFor`, Task 1).
- **Volver a la ficha (enlace o "atrás"):** nada marcado salvo las opciones únicas, y la URL ya no lleva `?grupo=opcion` (test de la Task 2).
- **Información nutricional sin columna por dosis o en texto libre:** no se inventa la proteína; si no hay ninguna cifra, la franja no aparece (tests de la Task 1).
- **Cantidad mayor que 1:** se añade esa cantidad y los puntos crecen con ella (test de `pointsFor`, Task 1, y test de fuente de la Task 2).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/storefront/src/features/products/product-facts.ts` (nuevo) | Galería por variante, cifras clave y puntos (puro) |
| `apps/storefront/src/features/products/graphql.ts` | `assets` de cada variante |
| `apps/storefront/src/features/products/components/product-detail-types.ts` (nuevo) | Tipos compartidos de la ficha |
| `apps/storefront/src/features/products/components/product-detail-client.tsx` | Selección en estado y galería por variante |
| `apps/storefront/src/features/products/components/product-info.tsx` | Bloque de compra |
| `apps/storefront/src/features/products/components/product-gallery.tsx` (nuevo, sustituye a `product-image-carousel.tsx`) | Galería con zoom y carrusel en móvil |
| `apps/storefront/src/features/products/components/product-details.tsx` (nuevo, sustituye a `food-information.tsx`) | Desplegables de información |
| `apps/storefront/src/features/products/components/key-figures.tsx` (nuevo) | Franja de cifras clave |
| `apps/storefront/src/features/products/routes/page.tsx` | Composición de la ficha |
| `apps/storefront/src/features/reviews/product-rating-summary.tsx` (nuevo), `graphql.ts`, `product-reviews-section.tsx` | Estrellas junto al nombre; ancla `#resenas` |
| `apps/storefront/src/site/products/product-detail-page.tsx` | Rellena `ratingSlot` |
| `apps/storefront/tests/design/product-page.test.mjs` (nuevo) | Tests de la fase |

Los bloques precedidos de `<!-- archivo: ruta -->` son el contenido completo de ese archivo.

---

### Task 1: Módulo puro de la ficha y fotos por variante

**Files:**
- Create: `apps/storefront/src/features/products/product-facts.ts`
- Modify: `apps/storefront/src/features/products/graphql.ts` (en `variants`, tras `featuredAsset {…}`, añadir `assets { id preview source }`)
- Test: `apps/storefront/tests/design/product-page.test.mjs`

**Interfaces:**
- Produces:
  - `galleryFor(productAssets, variant?) → A[]`
  - `proteinPerServing(nutrition) → string | null`
  - `flavorCount(groups) → number | null`
  - `netQuantityLabel(variants, groups) → string | null`
  - `pointsFor(priceCents, quantity, pointsPerEuro) → number`

- [ ] **Step 1: Escribir los tests que fallan**

<!-- archivo: apps/storefront/tests/design/product-page.test.mjs -->
```js
// Fase 3B del rediseño (ficha de producto).
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

const a = id => ({id});

test('galería: primero las fotos de la variante, después las del producto, sin repetir', async () => {
    const {galleryFor} = await load('features/products/product-facts.ts');
    const product = [a('p1'), a('p2')];
    assert.deepEqual(galleryFor(product, null).map(x => x.id), ['p1', 'p2']);
    assert.deepEqual(galleryFor(product, {featuredAsset: a('v1'), assets: [a('v1'), a('v2'), a('p2')]}).map(x => x.id), ['v1', 'v2', 'p2', 'p1']);
    assert.deepEqual(galleryFor(product, {featuredAsset: null, assets: []}).map(x => x.id), ['p1', 'p2']);
});

test('proteína por dosis solo si la tabla tiene columna por dosis', async () => {
    const {proteinPerServing} = await load('features/products/product-facts.ts');
    assert.equal(proteinPerServing('Proteínas | 80 g | 24 g\nGrasas | 2 g | 0,6 g'), '24 g');
    assert.equal(proteinPerServing('Energía | 400 kcal | 120 kcal\nProteínas | 80 g | 24 g'), '24 g');
    assert.equal(proteinPerServing('Proteínas | 80 g'), null);
    assert.equal(proteinPerServing('Rico en proteínas'), null);
    assert.equal(proteinPerServing(null), null);
});

test('nº de sabores y cantidad neta salen de datos reales', async () => {
    const {flavorCount, netQuantityLabel} = await load('features/products/product-facts.ts');
    const groups = [{code: 'iso-savage-peso', name: 'Peso', options: [{name: '1 kg'}]}, {code: 'iso-savage-sabor', name: 'Sabor', options: [{name: 'A'}, {name: 'B'}, {name: 'C'}]}];
    assert.equal(flavorCount(groups), 3);
    assert.equal(flavorCount([{code: 'x-sabor', name: 'Sabor', options: [{name: 'A'}]}]), null);
    assert.equal(netQuantityLabel([{customFields: {netQuantity: null}}], groups), '1 kg');
    assert.equal(netQuantityLabel([{customFields: {netQuantity: '900 g'}}, {customFields: {netQuantity: '900 g'}}], groups), '900 g');
    assert.equal(netQuantityLabel([{customFields: null}], []), null);
});

test('los puntos siguen la fórmula del servidor y crecen con la cantidad', async () => {
    const {pointsFor} = await load('features/products/product-facts.ts');
    assert.equal(pointsFor(8139, 1, 1), 81);
    assert.equal(pointsFor(8139, 2, 1), 162);
    assert.equal(pointsFor(999, 1, 0), 0);
});

test('la consulta de la ficha trae las fotos de cada variante', async () => {
    assert.match(await read('features/products/graphql.ts'), /featuredAsset \{[^}]*\}\s*assets \{\s*id\s*preview\s*source\s*\}/);
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs`
Expected: FAIL en los 5 tests.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/product-facts.ts -->
```ts
/**
 * Datos derivados de la ficha de producto, sin dependencias (se prueban con
 * node --test): orden de la galería según la variante, cifras clave a partir de
 * datos reales del producto y puntos que suma una compra.
 */

/** Fotos de la variante elegida (la principal primero) y después las del producto, sin repetir. */
export function galleryFor<A extends {id: string}>(
    productAssets: A[],
    variant?: {featuredAsset?: A | null; assets?: A[] | null} | null,
): A[] {
    const ordered = variant ? [variant.featuredAsset, ...(variant.assets ?? []), ...productAssets] : productAssets;
    const seen = new Set<string>();
    return ordered.filter((asset): asset is A => {
        if (!asset || seen.has(asset.id)) return false;
        seen.add(asset.id);
        return true;
    });
}

/**
 * Proteína por dosis: última columna de la fila "Proteínas" de la tabla nutricional
 * ("Nutriente | por 100 g | por dosis"). Sin columna por dosis no se deduce nada.
 */
export function proteinPerServing(nutrition?: string | null): string | null {
    if (!nutrition) return null;
    for (const line of nutrition.split(/\r?\n/)) {
        const cells = line.split('|').map(cell => cell.trim());
        if (cells.length >= 3 && /^prote/i.test(cells[0])) return cells[cells.length - 1] || null;
    }
    return null;
}

type FactGroup = {code: string; name: string; options: Array<{name: string}>};
const FLAVOR = /sabor|flavou?r/i;
const SIZE = /peso|tama[nñ]o|size|weight|cantidad|formato/i;
const findGroup = (groups: FactGroup[], pattern: RegExp) => groups.find(group => pattern.test(group.code) || pattern.test(group.name));

/** Nº de sabores (grupo de opciones Sabor/Flavour); solo cuando hay dos o más. */
export function flavorCount(groups: FactGroup[]): number | null {
    const group = findGroup(groups, FLAVOR);
    return group && group.options.length >= 2 ? group.options.length : null;
}

/**
 * Cantidad neta: el campo netQuantity de las variantes; si ninguna lo tiene, las
 * opciones del grupo de peso o tamaño. Varias se juntan con " · ".
 */
export function netQuantityLabel(
    variants: Array<{customFields?: {netQuantity?: string | null} | null}>,
    groups: FactGroup[],
): string | null {
    const values = [...new Set(variants.map(variant => variant.customFields?.netQuantity?.trim()).filter((v): v is string => Boolean(v)))];
    if (values.length) return values.join(' · ');
    const group = findGroup(groups, SIZE);
    return group?.options.length ? group.options.map(option => option.name).join(' · ') : null;
}

/** Puntos de una compra: la misma fórmula que el servidor, floor(euros × puntos por euro). */
export function pointsFor(priceCents: number, quantity: number, pointsPerEuro: number): number {
    return Math.floor(((priceCents * quantity) / 100) * pointsPerEuro);
}
```

En `graphql.ts`, dentro de `variants { … }`, tras el bloque `featuredAsset { id preview source }`:

```graphql
                assets {
                    id
                    preview
                    source
                }
```

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs && npx tsc --noEmit -p .`
Expected: PASS 5/5 y tsc limpio en `src`. `graphql-env.d.ts` ya incluye `ProductVariant.assets`; si tsc se queja, se lleva al ledger como ruling.

- [ ] **Step 5: Commit** — `feat(ficha): módulo puro de galería, cifras clave y puntos; fotos por variante`

---

### Task 2: Selección sin URL y bloque de compra

**Files:**
- Create: `apps/storefront/src/features/products/components/product-detail-types.ts`
- Modify (reescritura): `apps/storefront/src/features/products/components/product-detail-client.tsx`, `apps/storefront/src/features/products/components/product-info.tsx`
- Modify: `apps/storefront/src/features/products/routes/page.tsx` (props nuevas; deja de pasar `searchParams`)
- Modify: `apps/storefront/src/features/products/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/product-page.test.mjs`

**Interfaces:**
- Consumes: `initialSelection`, `findVariant`, `selectOption`, `isOptionAvailable` (3A); `galleryFor` y `pointsFor` (Task 1); `ProductGallery({images, productName})` (Task 3; hasta entonces se usa el carrusel actual).
- Produces: `ProductDetailClient({product, currencyCode, categoryName?, pointsPerEuro, ratingSlot?, detailsSlot?})`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('la selección vive solo en el estado: sin URL, con las opciones únicas marcadas', async () => {
    const client = await read('features/products/components/product-detail-client.tsx');
    assert.match(client, /useState<Selection>\(\(\) => initialSelection\(product\.optionGroups\)\)/);
    assert.match(client, /selectOption\(product\.variants, current, groupId, optionId\)/);
    assert.match(client, /galleryFor\(product\.assets, selectedVariant\)/);
    assert.doesNotMatch(client, /useSearchParams|router\.push|searchParams/);
    assert.doesNotMatch(await read('features/products/routes/page.tsx'), /searchParams=\{/);
});

test('bloque de compra con cantidad, puntos y mini franja de confianza', async () => {
    const info = await read('features/products/components/product-info.tsx');
    assert.match(info, /addToCart\(selectedVariant\.id, quantity\)/);
    assert.match(info, /pointsFor\(selectedVariant\.discountedPriceWithTax, quantity, pointsPerEuro\)/);
    assert.match(info, /t\('pointsEarned', \{points\}\)/);
    assert.match(info, /t\('trustBadges\.secureCheckout'\)/);
    assert.match(info, /isOptionAvailable\(product\.variants, selection, group\.id, option\.id\)/);
    const page = await read('features/products/routes/page.tsx');
    assert.match(page, /getLoyaltyProgramConfig\(\)/);
    assert.match(page, /pointsPerEuro=\{loyalty\.pointsPerEuro\}/);
    for (const loc of ['es', 'en']) {
        assert.ok((await json(`features/products/messages/${loc}.json`)).Product.pointsEarned, `${loc}: falta pointsEarned`);
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs`
Expected: FAIL en los 2 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/components/product-detail-types.ts -->
```ts
/** Tipos de la ficha de producto compartidos por sus componentes de cliente. */
export interface DetailAsset {
    id: string;
    preview: string;
    source: string;
}

export interface DetailVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    customFields?: {netQuantity?: string | null; isNew?: boolean | null} | null;
    featuredAsset?: DetailAsset | null;
    assets: DetailAsset[];
    options: Array<{id: string; code: string; name: string; groupId: string}>;
}

export interface DetailOptionGroup {
    id: string;
    code: string;
    name: string;
    options: Array<{id: string; code: string; name: string}>;
}

export interface DetailProduct {
    id: string;
    name: string;
    customFields?: {isNew?: boolean | null} | null;
    assets: DetailAsset[];
    variants: DetailVariant[];
    optionGroups: DetailOptionGroup[];
}
```

<!-- archivo: apps/storefront/src/features/products/components/product-detail-client.tsx -->
```tsx
'use client';

import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {ProductImageCarousel} from '@/features/products/components/product-image-carousel';
import {ProductInfo} from '@/features/products/components/product-info';
import {ProductBadges} from '@/features/products/components/product-badges';
import {discountPercent} from '@/features/pricing/discount-percent';
import {findVariant, initialSelection, selectOption, type Selection} from '@/features/products/variant-selection';
import {galleryFor} from '@/features/products/product-facts';
import type {DetailProduct} from '@/features/products/components/product-detail-types';

interface ProductDetailClientProps {
    product: DetailProduct;
    currencyCode: string;
    /** Categoría principal, encima del nombre. */
    categoryName?: string;
    /** Puntos por euro del programa Iron Rewards (configuración real del servidor). */
    pointsPerEuro: number;
    /** Estrellas y nº de reseñas (los aporta la feature de reseñas desde site/). */
    ratingSlot?: ReactNode;
    /** Desplegables de información (componente de servidor). */
    detailsSlot?: ReactNode;
}

export function ProductDetailClient({product, currencyCode, categoryName, pointsPerEuro, ratingSlot, detailsSlot}: ProductDetailClientProps) {
    // La selección vive solo aquí (spec 7.9): ni URL ni almacenamiento. Al volver a la
    // ficha empieza de cero, salvo los grupos de una sola opción (7.8).
    const [selection, setSelection] = useState<Selection>(() => initialSelection(product.optionGroups));
    const selectedVariant = useMemo(
        () => findVariant(product.variants, product.optionGroups, selection),
        [product.variants, product.optionGroups, selection],
    );

    // view_item de GA4: una vez por producto, y otra si se elige otra variante.
    const viewedVariantId = selectedVariant?.id;
    useEffect(() => {
        const variant = product.variants.find((v) => v.id === viewedVariantId) ?? product.variants[0];
        if (!variant) return;
        const price = toMajorUnits(variant.priceWithTax);
        trackEvent('view_item', {
            currency: currencyCode,
            value: price,
            items: [{item_id: variant.sku || variant.id, item_name: product.name, item_variant: variant.name, price, quantity: 1}],
        });
    }, [viewedVariantId, product.id, product.name, product.variants, currencyCode]);

    // Al elegir variante se ven todas sus fotos y después las del producto.
    const images = useMemo(() => galleryFor(product.assets, selectedVariant), [product.assets, selectedVariant]);

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="relative lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start">
                <ProductImageCarousel key={selectedVariant?.id ?? 'default'} images={images} productName={product.name} />
                <ProductBadges
                    percent={selectedVariant ? discountPercent(selectedVariant.priceWithTax, selectedVariant.discountedPriceWithTax) : 0}
                    isNew={(product.customFields?.isNew ?? false) || (selectedVariant?.customFields?.isNew ?? false)}
                />
            </div>
            <div className="space-y-8">
                <ProductInfo
                    product={product}
                    currencyCode={currencyCode}
                    categoryName={categoryName}
                    selection={selection}
                    selectedVariant={selectedVariant}
                    onSelect={(groupId, optionId) => setSelection(current => selectOption(product.variants, current, groupId, optionId))}
                    pointsPerEuro={pointsPerEuro}
                    ratingSlot={ratingSlot}
                />
                {detailsSlot}
            </div>
        </div>
    );
}
```

<!-- archivo: apps/storefront/src/features/products/components/product-info.tsx -->
```tsx
'use client';

import {useState, useTransition, type ReactNode} from 'react';
import {CheckCircle2, Clock, Minus, Plus, RotateCcw, ShieldCheck, ShoppingCart, Star, Truck} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {addToCart} from '@/features/products/add-to-cart';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {Price} from '@/features/pricing/price';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {isOptionAvailable, type Selection} from '@/features/products/variant-selection';
import {pointsFor} from '@/features/products/product-facts';
import type {DetailProduct, DetailVariant} from '@/features/products/components/product-detail-types';

interface ProductInfoProps {
    product: DetailProduct;
    currencyCode: string;
    categoryName?: string;
    selection: Selection;
    selectedVariant: DetailVariant | undefined;
    onSelect: (groupId: string, optionId: string) => void;
    pointsPerEuro: number;
    ratingSlot?: ReactNode;
}

/**
 * Bloque de compra de la ficha: categoría, nombre, reseñas, precio con IVA, opciones
 * (las que no casan con lo elegido salen tachadas pero se pueden pulsar), stock,
 * cantidad, Añadir al carrito, puntos que suma la compra y mini franja de confianza.
 * En móvil, el botón vive en una barra fija abajo.
 */
export function ProductInfo({product, currencyCode, categoryName, selection, selectedVariant, onSelect, pointsPerEuro, ratingSlot}: ProductInfoProps) {
    const t = useTranslations('Product');
    const [quantity, setQuantity] = useState(1);
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);

    const isInStock = !!selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK';
    const minPrice = Math.min(...product.variants.map((variant) => variant.discountedPriceWithTax));
    const points = selectedVariant && pointsPerEuro > 0 ? pointsFor(selectedVariant.discountedPriceWithTax, quantity, pointsPerEuro) : 0;

    const handleAddToCart = () => {
        if (!selectedVariant) return;
        startTransition(async () => {
            const result = await addToCart(selectedVariant.id, quantity);
            if (!result.success) {
                toast.error(t('errorTitle'), {description: result.error || t('errorAddToCart')});
                return;
            }
            setIsAdded(true);
            const price = toMajorUnits(selectedVariant.priceWithTax);
            trackEvent('add_to_cart', {
                currency: currencyCode,
                value: price * quantity,
                items: [{item_id: selectedVariant.sku || selectedVariant.id, item_name: product.name, item_variant: selectedVariant.name, price, quantity}],
            });
            toast.success(t('addedToCartMessage'), {description: t('addedToCartDescription', {name: product.name})});
            // Quita el estado «añadido» a los 2 segundos.
            setTimeout(() => setIsAdded(false), 2000);
        });
    };

    const buttonLabel = isAdded
        ? t('addedToCart')
        : isPending
            ? t('adding')
            : !selectedVariant
                ? t('selectOptions')
                : !isInStock
                    ? t('outOfStock')
                    : t('addToCart');

    const addButton = (className: string) => (
        <Button size="lg" className={className} disabled={!isInStock || isPending} onClick={handleAddToCart}>
            {isAdded ? <CheckCircle2 aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
            {buttonLabel}
        </Button>
    );

    const price = selectedVariant ? (
        <PriceWithDiscount before={selectedVariant.priceWithTax} after={selectedVariant.discountedPriceWithTax} currencyCode={currencyCode} size="lg" />
    ) : (
        <>
            <span className="mr-1 font-sans text-sm font-normal text-muted-foreground">{t('from')}</span>
            <Price value={minPrice} currencyCode={currencyCode} />
        </>
    );

    const trust = [
        {icon: Truck, label: t('trustBadges.fastShipping')},
        {icon: ShieldCheck, label: t('trustBadges.secureCheckout')},
        {icon: RotateCcw, label: t('trustBadges.freeReturns')},
        {icon: Clock, label: t('trustBadges.guarantee')},
    ];

    return (
        <>
            <div className="space-y-6">
                <div className="space-y-2">
                    {categoryName && <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{categoryName}</p>}
                    <h1 className="text-5xl md:text-6xl">{product.name}</h1>
                    {ratingSlot}
                    <div className="pt-2">
                        <p className="font-mono text-3xl font-semibold">{price}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('taxIncluded')}</p>
                    </div>
                </div>

                {product.optionGroups.map((group) => (
                    <fieldset key={group.id}>
                        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</legend>
                        <div className="flex flex-wrap gap-2">
                            {group.options.map((option) => {
                                const selected = selection[group.id] === option.id;
                                const available = isOptionAvailable(product.variants, selection, group.id, option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => onSelect(group.id, option.id)}
                                        className={cn(
                                            'press rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                                            selected
                                                ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                                                : available
                                                    ? 'border-border hover:border-foreground'
                                                    : 'border-dashed border-border text-muted-foreground line-through hover:border-foreground',
                                        )}
                                    >
                                        {option.name}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                ))}

                {selectedVariant && (
                    <p className="text-sm">
                        {isInStock ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-success">
                                <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                                {t('inStock')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                                <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
                                {t('outOfStock')}
                            </span>
                        )}
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <div role="group" aria-label={t('quantity')} className="flex h-12 items-center rounded-md border border-border">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={t('decreaseQuantity')}>
                            <Minus aria-hidden="true" />
                        </Button>
                        <span aria-live="polite" className="w-8 text-center font-mono">{quantity}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} aria-label={t('increaseQuantity')}>
                            <Plus aria-hidden="true" />
                        </Button>
                    </div>
                    {/* En móvil el botón va en la barra fija de abajo. */}
                    <div className="hidden flex-1 lg:block">{addButton('h-12 w-full text-base')}</div>
                </div>

                {points > 0 && (
                    <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
                        <Star className="size-4 shrink-0 text-primary-solid" fill="currentColor" aria-hidden="true" />
                        {t('pointsEarned', {points})}
                    </p>
                )}

                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {trust.map(({icon: Icon, label}) => (
                        <li key={label} className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0 text-primary-solid" aria-hidden="true" />
                            {label}
                        </li>
                    ))}
                </ul>

                {selectedVariant && (
                    <p className="font-mono text-xs text-muted-foreground">
                        {selectedVariant.customFields?.netQuantity && <>{t('netQuantity', {quantity: selectedVariant.customFields.netQuantity})} · </>}
                        {t('sku', {sku: selectedVariant.sku})}
                    </p>
                )}
            </div>

            {/* Móvil: barra de compra fija abajo, para que la acción principal quede al
                alcance del pulgar esté donde esté el scroll. */}
            <div
                className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden"
                style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
            >
                <p className="shrink-0 font-mono text-lg font-semibold">{price}</p>
                {addButton('h-12 flex-1 text-base')}
            </div>
        </>
    );
}
```

En `routes/page.tsx`:
- importar `getLoyaltyProgramConfig` de `@/features/loyalty/program-config`;
- leer `const [result, loyalty] = await Promise.all([getProductData(slug, currencyCode), getLoyaltyProgramConfig()]);`;
- dejar de leer y pasar `searchParams` (quitarlo también de la desestructuración de props si ya no se usa);
- `productForDisplay` ya no necesita `description` saneada para el cliente (la descripción pasa a los desplegables en la Task 4). Mientras tanto se deja el campo como está;
- `<ProductDetailClient product={productForDisplay} currencyCode={currencyCode} categoryName={primaryCollection?.name} pointsPerEuro={loyalty.pointsPerEuro} ratingSlot={ratingSlot?.({productId: product.id})} />`;
- `ProductDetailPageProps` gana `ratingSlot?: (product: {productId: string}) => ReactNode;` y la función la recibe.

Mensajes `Product.pointsEarned`:
- es: `"{points, plural, one {Con esta compra sumas # punto} other {Con esta compra sumas # puntos}}"`
- en: `"{points, plural, one {You earn # point with this purchase} other {You earn # points with this purchase}}"`

Nota: hasta la Task 4 la descripción del producto deja de verse en la ficha, porque `ProductInfo` ya no la pinta. Es aceptable entre commits de la misma fase.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs && npx tsc --noEmit -p . && npx eslint src/features/products`
Expected: PASS; tsc y eslint limpios.

- [ ] **Step 5: Commit** — `feat(ficha): selección sin URL con opciones únicas marcadas y bloque de compra con cantidad y puntos`

---

### Task 3: Galería con zoom y carrusel en móvil

**Files:**
- Create: `apps/storefront/src/features/products/components/product-gallery.tsx`
- Delete: `apps/storefront/src/features/products/components/product-image-carousel.tsx`
- Modify: `product-detail-client.tsx` (usar `ProductGallery`); `messages/{es,en}.json` (`Product.gallery`)
- Test: `apps/storefront/tests/design/product-page.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('galería única: carrusel deslizable en móvil, zoom que sigue al ratón en escritorio y nombre si no hay fotos', async () => {
    assert.equal(await exists('features/products/components/product-image-carousel.tsx'), false);
    const gallery = await read('features/products/components/product-gallery.tsx');
    assert.match(gallery, /snap-x snap-mandatory/);
    assert.match(gallery, /transformOrigin: `\$\{zoom\.x\}% \$\{zoom\.y\}%`/);
    assert.match(gallery, /\(hover: hover\)/);
    assert.match(gallery, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(gallery, /noImagesAvailable/);
    // Un solo juego de imágenes (no uno para móvil y otro para escritorio).
    assert.equal((gallery.match(/src=\{image\.source\}/g) ?? []).length, 1);
    assert.match(await read('features/products/components/product-detail-client.tsx'), /<ProductGallery/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/components/product-gallery.tsx -->
```tsx
'use client';

import {useRef, useState, type MouseEvent} from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';

type GalleryImage = {id: string; preview: string; source: string};

/**
 * Galería de la ficha con un único juego de imágenes (no se descargan dos):
 * - móvil: carrusel deslizable con puntos;
 * - escritorio: la misma tira sin barra de desplazamiento, con miniaturas y zoom que
 *   sigue al ratón (solo con puntero que permite pasar por encima).
 * Sin fotos, el nombre del producto en grande.
 */
export function ProductGallery({images, productName}: {images: GalleryImage[]; productName: string}) {
    const t = useTranslations('Product');
    const [current, setCurrent] = useState(0);
    const [zoom, setZoom] = useState<{x: number; y: number} | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    if (!images.length) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-muted p-8 text-center">
                <span className="font-display text-5xl font-black uppercase italic leading-none text-foreground/15">{productName}</span>
            </div>
        );
    }

    const goTo = (index: number) => {
        setCurrent(index);
        const track = trackRef.current;
        if (!track) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        track.scrollTo({left: index * track.clientWidth, behavior: reduced ? 'auto' : 'smooth'});
    };

    const onScroll = () => {
        const track = trackRef.current;
        if (track) setCurrent(Math.round(track.scrollLeft / track.clientWidth));
    };

    const onMove = (event: MouseEvent<HTMLDivElement>) => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setZoom({x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100});
    };

    return (
        <div className="space-y-3">
            <div
                ref={trackRef}
                role="region"
                aria-label={t('gallery')}
                onScroll={onScroll}
                onMouseMove={onMove}
                onMouseLeave={() => setZoom(null)}
                className="flex snap-x snap-mandatory overflow-x-auto rounded-lg bg-muted scrollbar-none lg:cursor-zoom-in lg:overflow-hidden"
            >
                {images.map((image, index) => (
                    <div key={image.id} className="relative aspect-square w-full shrink-0 snap-center overflow-hidden">
                        <Image
                            src={image.source}
                            alt={t('imageAlt', {name: productName, index: index + 1, total: images.length})}
                            fill
                            priority={index === 0}
                            sizes="(max-width: 1024px) 100vw, 55vw"
                            className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
                            style={zoom && index === current ? {transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%`} : undefined}
                        />
                    </div>
                ))}
            </div>

            {images.length > 1 && (
                <>
                    {/* Móvil: puntos. */}
                    <div className="flex justify-center gap-1.5 lg:hidden">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={t('showImage', {index: index + 1, total: images.length})}
                                aria-current={index === current ? 'true' : undefined}
                                className={cn('h-1.5 rounded-full transition-all', index === current ? 'w-6 bg-primary-solid' : 'w-1.5 bg-foreground/25')}
                            />
                        ))}
                    </div>
                    {/* Escritorio: miniaturas. */}
                    <div className="hidden grid-cols-5 gap-2 lg:grid">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={t('showImage', {index: index + 1, total: images.length})}
                                aria-current={index === current ? 'true' : undefined}
                                className={cn(
                                    'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                                    index === current ? 'border-primary-solid' : 'border-transparent opacity-70 hover:opacity-100',
                                )}
                            >
                                <Image src={image.preview} alt="" fill sizes="10vw" className="object-cover" />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
```

En `product-detail-client.tsx`, cambiar el import y el uso de `ProductImageCarousel` por `ProductGallery`, manteniendo `key={selectedVariant?.id ?? 'default'}` para volver a la primera foto al cambiar de variante. Borrar `product-image-carousel.tsx`.

Mensajes `Product.gallery`: es "Galería de fotos" / en "Photo gallery".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(ficha): galería con zoom en escritorio y carrusel deslizable en móvil`

---

### Task 4: Desplegables, cifras clave, reseñas y composición final

**Files:**
- Create: `apps/storefront/src/features/products/components/product-details.tsx`, `apps/storefront/src/features/products/components/key-figures.tsx`, `apps/storefront/src/features/reviews/product-rating-summary.tsx`
- Delete: `apps/storefront/src/features/products/components/food-information.tsx`
- Modify: `apps/storefront/src/features/products/routes/page.tsx`, `apps/storefront/src/features/reviews/graphql.ts`, `apps/storefront/src/features/reviews/product-reviews-section.tsx`, `apps/storefront/src/site/products/product-detail-page.tsx`
- Modify: `apps/storefront/src/features/products/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/product-page.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('desplegables con la información (montada aunque estén cerrados) y la descripción', async () => {
    assert.equal(await exists('features/products/components/food-information.tsx'), false);
    const details = await read('features/products/components/product-details.tsx');
    assert.match(details, /<Accordion multiple defaultValue=\{\['description'\]\}/);
    assert.match(details, /keepMounted/);
    for (const key of ['nutrition', 'directions', 'ingredientsAllergens', 'warnings', 'storage']) assert.match(details, new RegExp(`'${key}'`));
    assert.match(details, /legalWarnings\.dose/);
});

test('franja de cifras clave con datos reales; nada si no hay ninguna', async () => {
    const figures = await read('features/products/components/key-figures.tsx');
    assert.match(figures, /proteinPerServing\(nutrition\)/);
    assert.match(figures, /flavorCount\(optionGroups\)/);
    assert.match(figures, /netQuantityLabel\(variants, optionGroups\)/);
    assert.match(figures, /if \(!figures\.length\) return null/);
    assert.match(figures, /bg-brand/);
});

test('la ficha compone desplegables, cifras, reseñas con ancla y estrellas junto al nombre', async () => {
    const page = await read('features/products/routes/page.tsx');
    assert.match(page, /detailsSlot=\{<ProductDetails/);
    assert.match(page, /<KeyFigures/);
    assert.doesNotMatch(page, /FoodInformation|trustBadges\.guarantee/);
    const site = await read('site/products/product-detail-page.tsx');
    assert.match(site, /ratingSlot=\{/);
    assert.match(site, /<ProductRatingSummary productId=\{productId\}/);
    assert.match(await read('features/reviews/product-rating-summary.tsx'), /if \(!reviewCount\) return null/);
    assert.match(await read('features/reviews/product-reviews-section.tsx'), /id="resenas"/);
    for (const loc of ['es', 'en']) {
        const p = (await json(`features/products/messages/${loc}.json`)).Product;
        for (const k of ['description', 'ingredientsAllergens', 'otherInfo']) assert.ok(p.food[k], `${loc}: falta food.${k}`);
        for (const k of ['title', 'protein', 'flavors', 'netQuantity']) assert.ok(p.facts?.[k], `${loc}: falta facts.${k}`);
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/product-page.test.mjs`
Expected: FAIL en los 3 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/products/components/product-details.tsx -->
```tsx
import {Fragment, type ReactNode} from 'react';
import {getTranslations} from 'next-intl/server';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';

export interface FoodInformationData {
    isFoodSupplement?: boolean | null;
    foodIngredients?: string | null;
    foodAllergens?: string | null;
    foodNutrition?: string | null;
    foodDirections?: string | null;
    foodWarnings?: string | null;
    foodStorage?: string | null;
    foodOrigin?: string | null;
    foodOperator?: string | null;
}

/** Las palabras en mayúsculas (≥ 2 letras) son alérgenos por convención: se muestran en negrita (Reg. 1169/2011 art. 21). */
function highlightAllergens(text: string): ReactNode[] {
    return text.split(/(\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})*\b)/u).map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
}

/**
 * Líneas "Nutriente | por 100 g | por dosis" → filas de tabla. La primera fila es
 * cabecera cuando nombra las columnas ("Nutriente…", "Por 100 g", "Per serving") en
 * vez de llevar un valor.
 */
function parseNutrition(text: string): {header: string[] | null; rows: string[][]} | null {
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split('|').map((c) => c.trim()));
    if (!rows.length || rows.every((r) => r.length < 2)) return null;
    const [first] = rows;
    const looksLikeHeader = /^(nutriente|nutrient|informaci[oó]n|valor(es)? medio|typical values)/i.test(first[0])
        || first.slice(1).some((c) => /^(por|per)( |$)/i.test(c));
    const header = looksLikeHeader ? first : null;
    return {header, rows: header ? rows.slice(1) : rows};
}

const text = 'text-sm leading-relaxed text-muted-foreground whitespace-pre-line';

/**
 * Desplegables de la ficha: descripción (abierta) e información alimentaria
 * obligatoria (Reg. (UE) 1169/2011 art. 14: disponible antes de comprar). El
 * contenido se monta aunque el desplegable esté cerrado (keepMounted), así que está
 * siempre en la página. Solo aparecen los bloques rellenos; en los complementos
 * alimenticios se añaden siempre las advertencias del RD 1487/2009.
 */
export async function ProductDetails({locale, description, data}: {locale: string; description: string; data: FoodInformationData}) {
    const t = await getTranslations({locale, namespace: 'Product.food'});
    const nutrition = data.foodNutrition?.trim() ? parseNutrition(data.foodNutrition) : null;
    const other = [data.foodOrigin?.trim() && `${t('origin')}: ${data.foodOrigin}`, data.foodOperator?.trim() && `${t('operator')}: ${data.foodOperator}`].filter(Boolean).join('\n');

    const items: Array<{value: string; title: string; body: ReactNode}> = [];
    if (description.trim()) {
        items.push({value: 'description', title: t('description'), body: <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{__html: description}} />});
    }
    if (data.foodNutrition?.trim()) {
        items.push({
            value: 'nutrition',
            title: t('nutrition'),
            body: nutrition ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        {nutrition.header && (
                            <thead>
                                <tr>{nutrition.header.map((h, i) => <th key={i} scope="col" className="border-b py-2 pr-4 text-left font-semibold">{h}</th>)}</tr>
                            </thead>
                        )}
                        <tbody>
                            {nutrition.rows.map((row, r) => (
                                <tr key={r}>
                                    {row.map((cell, c) => c === 0
                                        ? <th key={c} scope="row" className="border-b py-1.5 pr-4 text-left font-normal text-foreground">{cell}</th>
                                        : <td key={c} className="border-b py-1.5 pr-4 font-mono text-muted-foreground">{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className={text}>{data.foodNutrition}</p>,
        });
    }
    if (data.foodDirections?.trim()) items.push({value: 'directions', title: t('directions'), body: <p className={text}>{data.foodDirections}</p>});
    if (data.foodIngredients?.trim() || data.foodAllergens?.trim()) {
        items.push({
            value: 'ingredientsAllergens',
            title: t('ingredientsAllergens'),
            body: (
                <div className="space-y-3">
                    {data.foodIngredients?.trim() && <p className={text}><span className="font-semibold text-foreground">{t('ingredients')}: </span>{highlightAllergens(data.foodIngredients)}</p>}
                    {data.foodAllergens?.trim() && <p className={text}><span className="font-semibold text-foreground">{t('allergens')}: </span>{highlightAllergens(data.foodAllergens)}</p>}
                </div>
            ),
        });
    }
    if (data.foodWarnings?.trim() || data.isFoodSupplement) {
        items.push({
            value: 'warnings',
            title: t('warnings'),
            body: (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {data.foodWarnings?.trim() && data.foodWarnings.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}
                    {data.isFoodSupplement && (
                        <>
                            <li>{t('legalWarnings.dose')}</li>
                            <li>{t('legalWarnings.diet')}</li>
                            <li>{t('legalWarnings.children')}</li>
                        </>
                    )}
                </ul>
            ),
        });
    }
    if (data.foodStorage?.trim()) items.push({value: 'storage', title: t('storage'), body: <p className={text}>{data.foodStorage}</p>});
    if (other) items.push({value: 'otherInfo', title: t('otherInfo'), body: <p className={text}>{other}</p>});

    if (!items.length) return null;

    return (
        <Accordion multiple defaultValue={['description']} className="w-full border-t border-border">
            {items.map((item) => (
                <AccordionItem key={item.value} value={item.value}>
                    <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">{item.title}</AccordionTrigger>
                    <AccordionContent keepMounted>{item.body}</AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
```

<!-- archivo: apps/storefront/src/features/products/components/key-figures.tsx -->
```tsx
import {getTranslations} from 'next-intl/server';
import {Reveal} from '@/components/motion/reveal';
import {flavorCount, netQuantityLabel, proteinPerServing} from '@/features/products/product-facts';

/**
 * Franja oscura de cifras clave de la ficha, derivadas de datos reales: proteína por
 * dosis (tabla nutricional), nº de sabores (opciones) y cantidad neta. Solo se
 * muestran las que existen; si no hay ninguna, la franja no aparece.
 */
export async function KeyFigures({locale, nutrition, optionGroups, variants}: {
    locale: string;
    nutrition?: string | null;
    optionGroups: Array<{code: string; name: string; options: Array<{name: string}>}>;
    variants: Array<{customFields?: {netQuantity?: string | null} | null}>;
}) {
    const t = await getTranslations({locale, namespace: 'Product.facts'});
    const protein = proteinPerServing(nutrition);
    const flavors = flavorCount(optionGroups);
    const net = netQuantityLabel(variants, optionGroups);
    const figures = [
        protein && {value: protein, label: t('protein')},
        flavors && {value: String(flavors), label: t('flavors')},
        net && {value: net, label: t('netQuantity')},
    ].filter((figure): figure is {value: string; label: string} => Boolean(figure));

    if (!figures.length) return null;

    return (
        <section aria-label={t('title')} className="mt-12 bg-brand py-12 text-brand-fg md:py-16">
            <Reveal className="container mx-auto px-4">
                <ul className="grid gap-4 sm:grid-cols-3">
                    {figures.map((figure) => (
                        <li key={figure.label} className="rounded-lg border border-brand-line bg-brand-surface p-6 text-center">
                            <span className="block font-display text-5xl font-black italic leading-none text-primary-text md:text-6xl">{figure.value}</span>
                            <span className="mt-2 block text-sm text-brand-muted">{figure.label}</span>
                        </li>
                    ))}
                </ul>
            </Reveal>
        </section>
    );
}
```

<!-- archivo: apps/storefront/src/features/reviews/product-rating-summary.tsx -->
```tsx
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';
import {GetProductRatingSummaryQuery} from '@/features/reviews/graphql';
import {StarRating} from '@/features/reviews/components/star-rating';

/** Estrellas y nº de reseñas junto al nombre en la ficha, con enlace a las reseñas; nada si aún no hay. */
export async function ProductRatingSummary({productId}: {productId: string}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Reviews'});
    const {data} = await query(GetProductRatingSummaryQuery, {productId});
    const {averageRating, reviewCount} = data.productReviewSummary;
    if (!reviewCount) return null;

    return (
        <a href="#resenas" className="inline-flex items-center gap-2 text-sm">
            <StarRating rating={averageRating} size="sm" />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground underline-offset-4 hover:underline">
                {reviewCount === 1 ? t('oneReview') : t('reviewCount', {count: reviewCount})}
            </span>
        </a>
    );
}
```

En `features/reviews/graphql.ts`, al final:

```ts
// Resumen para la ficha (junto al nombre): solo la media y el nº de reseñas.
export const GetProductRatingSummaryQuery = graphql(`
    query GetProductRatingSummary($productId: ID!) {
        productReviewSummary(productId: $productId) {
            averageRating
            reviewCount
        }
    }
`);
```

En `product-reviews-section.tsx`: la `<section>` raíz gana `id="resenas"` y `scroll-mt-24`.

En `site/products/product-detail-page.tsx`, importar `ProductRatingSummary` de `@/features/reviews/product-rating-summary` y pasar:

```tsx
ratingSlot={({productId}) => (
    <Suspense fallback={null}>
        <ProductRatingSummary productId={productId} />
    </Suspense>
)}
```

En `routes/page.tsx`:
- importar `ProductDetails` y `KeyFigures`;
- quitar `FoodInformation` y la sección de sellos de confianza (ahora va en el bloque de compra) junto con sus imports (`Truck`, `RotateCcw`, `ShieldCheck`, `Clock`), si ya no se usan;
- `productForDisplay` deja de llevar `description` (pasa a `detailsSlot`);
- `ProductDetailClient` recibe `detailsSlot={<ProductDetails locale={locale} description={sanitizeRichText(product.description)} data={product.customFields ?? {}} />}`;
- tras el bloque principal, `<KeyFigures locale={locale} nutrition={product.customFields?.foodNutrition} optionGroups={productForDisplay.optionGroups} variants={product.variants} />`;
- el `h2` de preguntas frecuentes pasa a `<SectionHeader title={t('faq.title')} />` (importar de `@/components/brand/section-header`).

Mensajes nuevos de `Product`:
- `food.description`: "Descripción" / "Description"
- `food.ingredientsAllergens`: "Ingredientes y alérgenos" / "Ingredients and allergens"
- `food.otherInfo`: "Otros datos" / "Other information"
- `facts.title`: "Cifras clave" / "Key figures"
- `facts.protein`: "de proteína por dosis" / "protein per serving"
- `facts.flavors`: "sabores" / "flavours"
- `facts.netQuantity`: "cantidad neta" / "net quantity"

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -5 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 tests de `tests/upgrade`; tsc y eslint limpios.

- [ ] **Step 5: Commit** — `feat(ficha): desplegables de información, franja de cifras clave y estrellas junto al nombre`

---

### Task 5: Verificación

- [ ] **Step 1:** `npm test`, `tsc` y `eslint`.
- [ ] **Step 2:** `next build` en la copia temporal `tmp-fase3b` y `next start -p 3200` contra la API de desarrollo.
- [ ] **Step 3:** Capturas de `/productos/iso-savage` y `/productos/gluta-savage`, en escritorio y móvil y en claro y oscuro, con `visual-check.mjs` (`OUT=fase3b`). Además, un script que en `/productos/iso-savage` comprueba:
  - al entrar, "1 kg" marcado, ningún sabor marcado y el botón "Selecciona opciones" desactivado;
  - al elegir "Chocolate" el botón dice "Añadir al carrito" y la URL no cambia;
  - aparece "Con esta compra sumas 81 puntos" y, con cantidad 2, "162 puntos";
  - la franja de cifras muestra "24 g" y "4".

  Expected: todo en verde y 0 bloques ocultos.
- [ ] **Step 4:** Limpieza: parar solo el árbol del puerto 3200, quitar la unión con `rmdir` desde dentro de la copia, borrar `tmp-fase3b` y comprobar que `apps/storefront/node_modules` sigue intacto.
