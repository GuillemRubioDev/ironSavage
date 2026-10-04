# Rediseño · Fase 2: portada · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer la portada con el nuevo sistema visual: banner fijo con el primer banner activo, categorías superpuestas, franja de confianza, destacados, bloque de objetivos, Iron Rewards con cifras reales, últimas noticias y desplegable "Objetivos" en la cabecera. Se retira el carrusel de texto con SVG.

**Architecture:** La portada (`src/site/home/page.tsx`) compone bloques de servidor independientes, cada uno dentro de su `Suspense`, y cada uno se oculta solo si no tiene datos. Los datos nuevos son dos consultas a la Shop API existente: colecciones de objetivos (slug `objetivo-*`, del seed) y `loyaltyProgramConfig`. Las dos se guardan en caché con `'use cache'` y una etiqueta de revalidación. El movimiento usa las utilidades de la fase 1 (`Reveal`, `.stagger`, `.animate-hero-in`, `.hover-lift`, `.img-zoom`) y un zoom lento nuevo para la foto del banner.

**Tech Stack:** Next.js 16.3 (App Router, `cacheComponents`), React 19.3, Tailwind CSS 4, shadcn sobre Base UI, next-intl y `node --test` para los tests.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (secciones 5.1 "Objetivos" en la cabecera, 5.2 Portada y 9 punto 7).

## Global Constraints

- No se cambia la lógica de negocio: precios, impuestos, stock, pedidos, puntos y login obligatorio siguen igual. Las cifras de Iron Rewards se **leen** de `loyaltyProgramConfig`; no se escriben a mano.
- Paleta y tipografía de la fase 1: zona *marca* (`bg-brand`, `text-brand-fg`, `text-brand-muted`, `border-brand-line`, `text-primary-text`) y zona *contenido* (`bg-background`, `text-foreground`). Titulares con la fuente display en cursiva por defecto en h1–h6.
- Movimiento: solo `transform` y `opacity`; todo se anula con `prefers-reduced-motion: reduce`.
- Sin librerías nuevas.
- Textos nuevos en `es` y `en` con las mismas claves (`tests/i18n/messages.test.mjs`). Las features solo usan sus propios namespaces de mensajes, así que los textos de la portada van en `Home` (`src/site/home/messages`).
- `src/app` solo reexporta; las features no importan de `site` (`tests/architecture/boundaries.test.mjs`).
- Comentarios y documentación en español.
- Nunca se dejan servidores de prueba arrancados ni se toca el `npm run dev` del usuario (puertos 3000/3001/5173). La verificación usa una copia temporal en el puerto 3200.

## Review Focus

- **Sin banner activo o sin imagen:** la portada debe mostrar el banner de marca oscuro con el titular "Entrena Savage" y su botón, nunca un hueco. Lo cubre el test de la Task 2 (rama de respaldo).
- **Colecciones sin imagen (los objetivos hoy no tienen ninguna):** las tarjetas de categoría y objetivo muestran una inicial grande en vez de una caja vacía. Lo cubren los tests de las Tasks 3 y 5.
- **Sin colecciones de objetivos (tienda sin el seed):** el bloque "¿Cuál es tu objetivo?" y el desplegable de la cabecera desaparecen sin dejar título suelto. Lo cubren los tests de las Tasks 5 y 8.
- **Texto del banner sobre foto clara:** el titular blanco debe leerse siempre, así que la variante con la foto de fondo lleva degradado oscuro. Lo cubre el test de la Task 2 y se comprueba en las capturas de la Task 9.
- **Reducir movimiento y bloques de `Reveal`:** con la preferencia activa no puede quedar nada con opacidad 0 ni el zoom del banner en marcha. Lo cubren el test de la Task 2 (CSS) y la captura con movimiento reducido de la Task 9.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/storefront/src/features/collections/graphql.ts` | Nueva consulta `GetGoalCollectionsQuery` |
| `apps/storefront/src/features/collections/data.ts` | Nueva función `getGoalCollections(locale)` |
| `apps/storefront/src/features/loyalty/graphql.ts` | Nueva consulta `GetLoyaltyProgramConfigQuery` |
| `apps/storefront/src/features/loyalty/program-config.ts` (nuevo) | `getLoyaltyProgramConfig()` en caché |
| `apps/storefront/src/site/home/hero-banner.tsx` (nuevo) | Banner fijo: primer banner activo o banner de marca |
| `apps/storefront/src/site/home/promo-carousel.tsx` | Se elimina |
| `apps/storefront/src/components/brand/logo.tsx` | Se quitan `LogoWordCrop` y `AnimatedWordmark`, que solo usaba el carrusel |
| `apps/storefront/src/components/brand/collection-tile.tsx` (nuevo) | Tarjeta de categoría u objetivo con imagen o inicial grande |
| `apps/storefront/src/site/home/categories-showcase.tsx` | Fila de categorías superpuesta al banner |
| `apps/storefront/src/site/home/goals-section.tsx` (nuevo) | Bloque "¿Cuál es tu objetivo?" |
| `apps/storefront/src/features/products/components/product-carousel.tsx` | Titular con `SectionHeader` (palabra destacada y enlace) |
| `apps/storefront/src/features/products/featured-products.tsx` | Destacados con el nuevo titular |
| `apps/storefront/src/features/loyalty/loyalty-teaser.tsx` | Bloque Iron Rewards con las cifras de la configuración |
| `apps/storefront/src/features/news/latest-news-section.tsx`, `components/article-card.tsx` | Noticias con `SectionHeader` y elevación al pasar el ratón |
| `apps/storefront/src/site/home/page.tsx` | Nuevo orden de bloques |
| `apps/storefront/src/site/navigation/navbar/navbar-collections.tsx`, `mobile-nav-wrapper.tsx`, `mobile-nav.tsx` | Desplegable y sección "Objetivos" |
| `apps/storefront/src/app/[locale]/globals.css` | Zoom lento del banner; se retiran el alias `--font-brand-display` y el CSS del carrusel antiguo |
| `apps/storefront/tests/design/home.test.mjs` (nuevo) | Tests de la fase |

Todos los tests de la fase van en `apps/storefront/tests/design/home.test.mjs` y empiezan con esta cabecera, que se escribe en la Task 1:

```js
// Fase 2 del rediseño (portada): cada test fija una pieza de la portada nueva.
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));
```

Los tests se lanzan con `cd apps/storefront && node --test tests/design/home.test.mjs`.

---

### Task 1: Datos de objetivos y de la configuración de puntos

**Files:**
- Modify: `apps/storefront/src/features/collections/graphql.ts`
- Modify: `apps/storefront/src/features/collections/data.ts`
- Modify: `apps/storefront/src/features/loyalty/graphql.ts`
- Create: `apps/storefront/src/features/loyalty/program-config.ts`
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Produces: `getGoalCollections(locale: string): Promise<Array<{id: string; name: string; slug: string; imageUrl: string | null}>>`, ordenadas por `position`.
- Produces: `getLoyaltyProgramConfig(): Promise<{pointsPerEuro: number; pointValueInCents: number; minRedeemablePoints: number; maxDiscountPerOrderCents: number}>`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('los objetivos se leen de las colecciones con slug objetivo-, ordenadas y en caché', async () => {
    const gql = await read('features/collections/graphql.ts');
    assert.match(gql, /query GetGoalCollections/);
    assert.match(gql, /slug: \{ contains: "objetivo-" \}/);
    const data = await read('features/collections/data.ts');
    assert.match(data, /export async function getGoalCollections\(locale: string\)/);
    assert.match(data, /cacheTag\('collections'\)/);
    assert.match(data, /\.sort\(\(a, b\) => a\.position - b\.position\)/);
});

test('las cifras de Iron Rewards salen de loyaltyProgramConfig, no de valores fijos', async () => {
    assert.match(await read('features/loyalty/graphql.ts'), /loyaltyProgramConfig \{/);
    const cfg = await read('features/loyalty/program-config.ts');
    assert.match(cfg, /export async function getLoyaltyProgramConfig\(\)/);
    assert.match(cfg, /'use cache'/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL en los dos tests (no existen la consulta ni el archivo).

- [ ] **Step 3: Implementar**

En `features/collections/graphql.ts`, al final:

```ts
// Colecciones de objetivo (las crea el seed de objetivos con slug `objetivo-<código>`).
// Se buscan por el prefijo del slug: la colección padre «Objetivos» es privada y no
// sale en la Shop API, así que filtrar por parentId no serviría.
export const GetGoalCollectionsQuery = graphql(`
    query GetGoalCollections {
        collections(options: { filter: { slug: { contains: "objetivo-" } }, take: 20 }) {
            items {
                id
                name
                slug
                position
                featuredAsset {
                    preview
                }
            }
        }
    }
`);
```

En `features/collections/data.ts`, importar `GetGoalCollectionsQuery` y añadir:

```ts
/** Objetivos para la portada y la cabecera; vacío si la tienda no tiene el seed de objetivos. */
export async function getGoalCollections(locale: string): Promise<CollectionWithImage[]> {
    'use cache';
    cacheLife('days');
    cacheTag(`goal-collections-${locale}`);
    cacheTag('collections');

    const result = await query(GetGoalCollectionsQuery, undefined, {languageCode: locale});
    return [...result.data.collections.items]
        .sort((a, b) => a.position - b.position)
        .map(c => ({id: c.id, name: c.name, slug: c.slug, imageUrl: c.featuredAsset?.preview ?? null}));
}
```

En `features/loyalty/graphql.ts`, al final:

```ts
// Reglas públicas del programa de puntos (las mismas que aplica el servidor).
export const GetLoyaltyProgramConfigQuery = graphql(`
    query GetLoyaltyProgramConfig {
        loyaltyProgramConfig {
            pointsPerEuro
            pointValueInCents
            minRedeemablePoints
            maxDiscountPerOrderCents
        }
    }
`);
```

Crear `features/loyalty/program-config.ts`:

```ts
import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetLoyaltyProgramConfigQuery} from '@/features/loyalty/graphql';

/**
 * Reglas del programa de puntos tal como las tiene configuradas el servidor
 * (LoyaltyPlugin.init en vendure-config.ts). Solo cambian con un despliegue, así que
 * se guardan en caché unos días; la etiqueta permite revalidarlas a mano.
 */
export async function getLoyaltyProgramConfig() {
    'use cache';
    cacheLife('days');
    cacheTag('loyalty-config');

    const result = await query(GetLoyaltyProgramConfigQuery);
    return result.data.loyaltyProgramConfig;
}
```

- [ ] **Step 4: Lanzar el test y ver que pasa**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs && npx tsc --noEmit -p .`
Expected: PASS y tsc sin errores (`graphql-env.d.ts` ya incluye `loyaltyProgramConfig` y `position`).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/features/collections apps/storefront/src/features/loyalty apps/storefront/tests/design/home.test.mjs
git commit -m "feat(portada): datos de objetivos y de la configuración de puntos"
```

---

### Task 2: Banner fijo (sustituye al carrusel con SVG)

**Files:**
- Create: `apps/storefront/src/site/home/hero-banner.tsx`
- Delete: `apps/storefront/src/site/home/promo-carousel.tsx`
- Modify: `apps/storefront/src/site/home/banners-data.ts` (el tipo `PromoBanner` pasa a vivir aquí)
- Modify: `apps/storefront/src/components/brand/logo.tsx` (quitar `LogoWordCrop`, `AnimatedWordmark` y lo que solo usaban ellos)
- Modify: `apps/storefront/src/app/[locale]/globals.css`
- Modify: `apps/storefront/src/site/home/page.tsx`
- Modify: `apps/storefront/src/site/home/messages/{es,en}.json` (quitar `Home.carousel`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Consumes: `getActiveBanners(): Promise<PromoBanner[]>` (existente).
- Produces: `HeroBanner({banner, locale, fallback}: {banner: PromoBanner | null; locale: string; fallback: {title: string; highlight: string; subtitle: string; cta: string}})`.
- Produces: `export interface PromoBanner` en `site/home/banners-data.ts` (mismos campos que hoy).

- [ ] **Step 1: Escribir el test que falla**

```js
test('la portada usa un banner fijo y ya no el carrusel con SVG', async () => {
    assert.equal(await exists('site/home/promo-carousel.tsx'), false);
    const page = await read('site/home/page.tsx');
    assert.match(page, /<HeroBanner/);
    assert.match(page, /banner=\{banners\[0\] \?\? null\}/);
    const hero = await read('site/home/hero-banner.tsx');
    assert.match(hero, /<h1/);
    assert.match(hero, /className="stagger/);
    assert.match(hero, /animate-hero-zoom/);
});

test('sin banner activo se pinta el banner de marca; con foto de fondo, degradado para leer el texto', async () => {
    const hero = await read('site/home/hero-banner.tsx');
    assert.match(hero, /if \(!banner\)/);
    assert.match(hero, /bg-brand/);
    assert.match(hero, /bg-gradient-to-r from-black\/80/);
});

test('el zoom del banner existe y se anula con reducir movimiento; se retira el CSS del carrusel', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes hero-zoom/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.animate-hero-zoom/);
    for (const old of ['--font-brand-display', '.section-spotlight', '.hero-glow', 'logo-wipe', 'logo-glow']) {
        assert.equal(css.includes(old), false, `queda ${old} en globals.css`);
    }
    assert.doesNotMatch(await read('components/brand/logo.tsx'), /AnimatedWordmark|LogoWordCrop/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL en los tres tests nuevos.

- [ ] **Step 3: Implementar**

Mover `PromoBanner` a `banners-data.ts`: quitar el import desde `promo-carousel` y declarar la interfaz allí (mismos campos: `id`, `titleEs`, `titleEn`, `subtitleEs?`, `subtitleEn?`, `ctaLabelEs`, `ctaLabelEn`, `href`, `align`, `imageLayout`, `image?: {preview: string} | null`).

Crear `site/home/hero-banner.tsx`:

```tsx
import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import type {PromoBanner} from '@/site/home/banners-data';

type Fallback = {title: string; highlight: string; subtitle: string; cta: string};

const ALIGN: Record<string, string> = {
    left: 'items-start text-left',
    center: 'items-center text-center mx-auto',
    right: 'items-end text-right ml-auto',
};

/**
 * Banner fijo de la portada: el primer banner activo de Marketing → Banners de portada.
 * Sin banner activo, un banner de marca oscuro con el lema. Titular escalonado
 * (.stagger) y zoom lento de la foto (.animate-hero-zoom); los dos se anulan con
 * "reducir movimiento". Siempre en zona de marca: texto blanco en los dos temas.
 */
export function HeroBanner({banner, locale, fallback}: {banner: PromoBanner | null; locale: string; fallback: Fallback}) {
    if (!banner) {
        return (
            <section className="relative overflow-hidden bg-brand text-brand-fg">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_80%_20%,rgb(231_0_11/22%),transparent)]" aria-hidden="true" />
                <div className="container relative mx-auto flex min-h-[60vh] flex-col justify-center gap-5 px-4 pb-28 pt-16 md:min-h-[68vh] md:pb-36">
                    <div className="stagger flex max-w-2xl flex-col items-start gap-5">
                        <h1 style={{'--i': 0} as React.CSSProperties} className="text-6xl md:text-8xl">
                            {fallback.title} <span className="text-primary-text">{fallback.highlight}</span>
                        </h1>
                        <p style={{'--i': 1} as React.CSSProperties} className="max-w-xl text-lg text-brand-muted md:text-xl">{fallback.subtitle}</p>
                        <div style={{'--i': 2} as React.CSSProperties}>
                            <Button render={<Link href="/productos" />} nativeButton={false} size="xl">
                                {fallback.cta} <ArrowRight aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const es = locale === 'es';
    const title = es ? banner.titleEs : banner.titleEn;
    const subtitle = (es ? banner.subtitleEs : banner.subtitleEn) ?? null;
    const cta = es ? banner.ctaLabelEs : banner.ctaLabelEn;
    const align = ALIGN[banner.align] ?? ALIGN.left;
    const side = banner.imageLayout === 'left' || banner.imageLayout === 'right';

    const text = (
        <div className={cn('stagger relative flex max-w-xl flex-col gap-5', align)}>
            <h1 style={{'--i': 0} as React.CSSProperties} className="text-6xl md:text-8xl">{title}</h1>
            {subtitle && <p style={{'--i': 1} as React.CSSProperties} className="text-lg text-white/80 md:text-xl">{subtitle}</p>}
            <div style={{'--i': 2} as React.CSSProperties}>
                <Button render={<Link href={banner.href} />} nativeButton={false} size="xl">
                    {cta} <ArrowRight aria-hidden="true" />
                </Button>
            </div>
        </div>
    );

    if (side) {
        // Foto a un lado (bote de producto): fondo de marca y la foto entera, sin recortar.
        return (
            <section className="relative overflow-hidden bg-brand text-brand-fg">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_75%_40%,rgb(231_0_11/20%),transparent)]" aria-hidden="true" />
                <div className="container relative mx-auto grid min-h-[60vh] items-center gap-8 px-4 pb-28 pt-12 md:min-h-[68vh] md:grid-cols-2 md:pb-36">
                    <div className={cn(banner.imageLayout === 'left' && 'md:order-2')}>{text}</div>
                    {banner.image && (
                        <div className="relative aspect-square w-full max-w-md justify-self-center md:max-w-lg">
                            <Image src={banner.image.preview} alt="" fill priority sizes="(min-width: 768px) 40vw, 80vw" className="animate-hero-zoom object-contain drop-shadow-[0_30px_40px_rgb(0_0_0/45%)]" />
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // Foto de fondo a todo el ancho con degradado oscuro hacia el lado del texto.
    return (
        <section className="relative overflow-hidden bg-brand text-brand-fg">
            {banner.image && (
                <Image src={banner.image.preview} alt="" fill priority sizes="100vw" className="animate-hero-zoom object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" aria-hidden="true" />
            <div className="container relative mx-auto flex min-h-[60vh] flex-col justify-center px-4 pb-28 pt-12 md:min-h-[68vh] md:pb-36">
                {text}
            </div>
        </section>
    );
}
```

`pb-28 md:pb-36` deja el hueco donde se superpone la fila de categorías (Task 3). El banner de respaldo lleva un solo botón: no existe un índice `/categorias` al que mandar un segundo botón, y dos botones al mismo destino sobran. Por eso se quita `Hero.viewCollections` de los mensajes.

En `globals.css`:
- borrar `--font-brand-display` de `:root`;
- borrar los bloques `@keyframes glow-pulse`, `.hero-glow` (y su `@media`), `.section-spotlight` (las cuatro reglas), `@keyframes logo-wipe`, `.animate-logo-wipe`, `.logo-glow-*` y sus `@keyframes`, con sus comentarios;
- tras `.animate-hero-in`, añadir:

```css
/* Zoom lento de la foto del banner de portada (site/home/hero-banner.tsx). */
@keyframes hero-zoom { from { transform: scale(1.08); } to { transform: scale(1); } }
.animate-hero-zoom { animation: hero-zoom 9s var(--ease-out) both; }
```

- en el último bloque `prefers-reduced-motion`, cambiar la línea por `.stagger > *, .animate-hero-in, .animate-hero-zoom, .marquee-track { animation: none !important; }`.

Antes de borrar nada de `globals.css`, comprobar con `grep -rn "font-brand-display\|section-spotlight\|hero-glow" src` que solo lo usan `promo-carousel.tsx` y la sección "why" de `page.tsx` (que se quita en la Task 7; mientras tanto se cambia su `section-spotlight` por `bg-brand`).

En `logo.tsx`, borrar `LogoWordCrop`, `AnimatedWordmark`, `WORD_MASKS` y los imports de las máscaras si ya no se usan (`grep -n "logoIronMask\|logoSavageMask\|CSSProperties" src/components/brand/logo.tsx`).

En `page.tsx`, sustituir el import y el uso de `PromoCarousel` por:

```tsx
<HeroBanner
    banner={banners[0] ?? null}
    locale={locale}
    fallback={{
        title: tHero('title'),
        highlight: tHero('titleHighlight'),
        subtitle: tHero('subtitle'),
        cta: tHero('shopNow'),
    }}
/>
```

Quitar `Home.carousel` y `Hero.viewCollections` de `site/home/messages/es.json` y `en.json`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p . && npx eslint src/site/home src/components/brand`
Expected: PASS (salvo los 3 tests conocidos de `tests/upgrade`), tsc y eslint limpios.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): banner fijo con el primer banner activo y banner de marca de respaldo"
```

---

### Task 3: Categorías superpuestas al banner y franja de confianza

**Files:**
- Create: `apps/storefront/src/components/brand/collection-tile.tsx`
- Modify: `apps/storefront/src/site/home/categories-showcase.tsx`
- Modify: `apps/storefront/src/site/home/page.tsx`
- Modify: `apps/storefront/src/site/home/messages/{es,en}.json` (`Home.trust.*`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Produces: `CollectionTile({href, name, imageUrl, variant = 'category' | 'goal', index?: number})`. Con imagen pinta la foto con zoom al pasar el ratón; sin imagen, una inicial grande en cursiva sobre la zona de marca.

- [ ] **Step 1: Escribir el test que falla**

```js
test('las tarjetas de colección usan imagen o, si no hay, una inicial grande', async () => {
    const tile = await read('components/brand/collection-tile.tsx');
    assert.match(tile, /export function CollectionTile\b/);
    assert.match(tile, /imageUrl \?/);
    assert.match(tile, /name\.charAt\(0\)/);
    assert.match(tile, /img-zoom/);
    assert.doesNotMatch(tile, /from '@\/(site|features)\//);
});

test('las categorías se superponen al borde del banner y la portada muestra la franja de confianza', async () => {
    const cats = await read('site/home/categories-showcase.tsx');
    assert.match(cats, /<CollectionTile/);
    assert.match(cats, /-mt-20 md:-mt-24/);
    const page = await read('site/home/page.tsx');
    assert.match(page, /<TrustStrip/);
    const es = await json('site/home/messages/es.json');
    assert.deepEqual(Object.keys(es.Home.trust), ['shipping', 'payment', 'returns', 'points']);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL en los dos tests nuevos.

- [ ] **Step 3: Implementar**

Crear `components/brand/collection-tile.tsx`:

```tsx
import Image from 'next/image';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';

/**
 * Tarjeta de categoría u objetivo. Con imagen de colección, la foto con zoom suave al
 * pasar el ratón; sin imagen, la inicial del nombre en grande sobre fondo de marca
 * (nunca una caja vacía). `goal` es más alta y numera el objetivo.
 */
export function CollectionTile({href, name, imageUrl, variant = 'category', index}: {
    href: string;
    name: string;
    imageUrl: string | null;
    variant?: 'category' | 'goal';
    index?: number;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'img-zoom hover-lift group relative block overflow-hidden rounded-lg bg-brand text-brand-fg ring-1 ring-brand-line',
                variant === 'goal' ? 'aspect-[3/4]' : 'aspect-square',
            )}
        >
            {imageUrl ? (
                <Image src={imageUrl} alt="" fill className="object-cover" sizes={variant === 'goal' ? '(min-width: 768px) 20vw, 45vw' : '(min-width: 768px) 16vw, 40vw'} />
            ) : (
                <span aria-hidden="true" className="absolute -right-2 -top-6 font-display text-[9rem] font-black italic leading-none text-white/[.07] transition-transform duration-[var(--dur-slow)] group-hover:scale-110">
                    {name.charAt(0)}
                </span>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
                {variant === 'goal' && index !== undefined && (
                    <span className="font-mono text-xs font-bold text-primary-text">{String(index + 1).padStart(2, '0')}</span>
                )}
                <span className="font-display text-xl font-extrabold uppercase italic leading-none md:text-2xl">{name}</span>
                <span aria-hidden="true" className="h-0.5 w-6 bg-primary-solid transition-[width] duration-[var(--dur-base)] group-hover:w-12" />
            </span>
        </Link>
    );
}
```

Reescribir el `return` de `categories-showcase.tsx` (mismos datos, `getTopCollectionsWithImages`, `slice(0, 6)`):

```tsx
return (
    <section aria-labelledby="home-categories" className="relative z-10 -mt-20 md:-mt-24">
        <div className="container mx-auto px-4">
            <h2 id="home-categories" className="sr-only">{t('title')}</h2>
            {/* Móvil: fila con desplazamiento horizontal; escritorio: una fila de 6. */}
            <ul className="stagger -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-none md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0">
                {collections.slice(0, 6).map((collection, i) => (
                    <li key={collection.id} style={{'--i': i} as React.CSSProperties} className="w-[40vw] shrink-0 snap-start sm:w-[28vw] md:w-auto">
                        <CollectionTile href={`/categorias/${collection.slug}`} name={collection.name} imageUrl={collection.imageUrl} />
                    </li>
                ))}
            </ul>
        </div>
    </section>
);
```

El titular queda solo para lectores de pantalla porque la fila visual va pegada al banner, como en la maqueta aprobada. Se borra el comentario antiguo de la rejilla de 3 columnas.

En `page.tsx`, después del `Suspense` de categorías:

```tsx
<div className="container mx-auto mt-10 px-4">
    <TrustStrip items={[
        {icon: Truck, title: t('trust.shipping.title'), text: t('trust.shipping.text')},
        {icon: ShieldCheck, title: t('trust.payment.title'), text: t('trust.payment.text')},
        {icon: RotateCcw, title: t('trust.returns.title'), text: t('trust.returns.text')},
        {icon: Star, title: t('trust.points.title'), text: t('trust.points.text')},
    ]} />
</div>
```

Mensajes `Home.trust`. Solo van afirmaciones reales: los textos legales no prometen plazos de entrega, así que no se inventa ninguno.
- es: `shipping` {title "Envío rápido", text "Sigue tu pedido desde tu cuenta"}; `payment` {"Pago seguro", "Tarjeta con Redsys"}; `returns` {"Devolución en 14 días", "Desde tu cuenta"}; `points` {"Iron Rewards", "Puntos en cada pedido"}.
- en: `shipping` {"Fast shipping", "Track your order from your account"}; `payment` {"Secure payment", "Card via Redsys"}; `returns` {"14-day returns", "From your account"}; `points` {"Iron Rewards", "Points on every order"}.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p .`
Expected: PASS (salvo los 3 de upgrade).

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): categorías superpuestas al banner y franja de confianza"
```

---

### Task 4: Destacados con el nuevo titular de sección

**Files:**
- Modify: `apps/storefront/src/features/products/components/product-carousel.tsx`
- Modify: `apps/storefront/src/features/products/featured-products.tsx`
- Modify: `apps/storefront/src/features/products/messages/{es,en}.json` (clave `featuredHighlight`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Produces: `ProductCarousel({title, highlight?, action?, products})`, que pinta `SectionHeader`. `related-products.tsx` sigue llamándolo solo con `title`.

Decisión: el spec habla de "Los más vendidos", pero la tienda no tiene datos de ventas (la consulta actual ordena por nombre). Llamarlo así sería falso, así que el bloque se llama "Productos **destacados**" / "Featured **products**". La tarjeta con "Añadir" es de la fase 3; mientras tanto la tarjeta actual sigue enlazando a la ficha.

- [ ] **Step 1: Escribir el test que falla**

```js
test('los destacados usan SectionHeader con palabra destacada y enlace a todos los productos', async () => {
    const carousel = await read('features/products/components/product-carousel.tsx');
    assert.match(carousel, /<SectionHeader title=\{title\} highlight=\{highlight\} action=\{action\}/);
    const featured = await read('features/products/featured-products.tsx');
    assert.match(featured, /highlight=\{t\('featuredHighlight'\)\}/);
    assert.match(featured, /action=\{\{href: '\/productos', label: t\('viewAllProducts'\)\}\}/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En `product-carousel.tsx`: importar `SectionHeader` de `@/components/brand/section-header`, añadir las props `highlight?: string` y `action?: {href: string; label: string}`, y cambiar el `<h2 …>{title}</h2>` por `<SectionHeader title={title} highlight={highlight} action={action} />`. Las tarjetas del carrusel (`CarouselItem`) reciben `className` con `hover-lift`. Cambiar la etiqueta `section` por `section className="py-12 md:py-20"`.

En `featured-products.tsx`, el `return` queda así:

```tsx
return (
    <ProductCarousel
        title={t('featuredProducts')}
        highlight={t('featuredHighlight')}
        action={{href: '/productos', label: t('viewAllProducts')}}
        products={products}
    />
);
```

Quitar los imports sobrantes (`Link`, `ArrowRight`).

Mensajes `Product`: `featuredProducts` pasa a "Productos" / "Featured" y se añade `featuredHighlight` "destacados" / "products". Antes, comprobar con `grep -rn "featuredProducts" src` que la clave no se usa en otra parte; si se usa, crear claves nuevas `featuredTitle` y `featuredHighlight` y dejar `featuredProducts` como está.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): destacados con titular de sección y enlace a todos los productos"
```

---

### Task 5: Bloque "¿Cuál es tu objetivo?"

**Files:**
- Create: `apps/storefront/src/site/home/goals-section.tsx`
- Modify: `apps/storefront/src/site/home/page.tsx`
- Modify: `apps/storefront/src/site/home/messages/{es,en}.json` (`Home.goals`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Consumes: `getGoalCollections(locale)` (Task 1) y `CollectionTile` (Task 3).
- Produces: `GoalsSection()` (componente de servidor asíncrono; devuelve `null` si no hay objetivos).

- [ ] **Step 1: Escribir el test que falla**

```js
test('el bloque de objetivos aparece solo si existen y enlaza a cada colección', async () => {
    const goals = await read('site/home/goals-section.tsx');
    assert.match(goals, /getGoalCollections\(locale\)/);
    assert.match(goals, /if \(!goals\.length\) return null/);
    assert.match(goals, /variant="goal"/);
    assert.match(goals, /href=\{`\/categorias\/\$\{goal\.slug\}`\}/);
    assert.match(await read('site/home/page.tsx'), /<GoalsSection\s*\/>/);
    const es = await json('site/home/messages/es.json');
    assert.ok(es.Home.goals.title && es.Home.goals.highlight && es.Home.goals.eyebrow);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Crear `site/home/goals-section.tsx`:

```tsx
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getGoalCollections} from '@/features/collections/data';
import {CollectionTile} from '@/components/brand/collection-tile';
import {SectionHeader} from '@/components/brand/section-header';
import {Reveal} from '@/components/motion/reveal';

/** "¿Cuál es tu objetivo?": colecciones de la faceta Objetivo (seed). Sin objetivos, no aparece. */
export async function GoalsSection() {
    const locale = await getRouteLocale();
    const [t, goals] = await Promise.all([
        getTranslations({locale, namespace: 'Home.goals'}),
        getGoalCollections(locale),
    ]);
    if (!goals.length) return null;

    return (
        <section className="bg-brand py-16 text-brand-fg md:py-24">
            <div className="container mx-auto px-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-brand-muted">{t('eyebrow')}</p>
                <SectionHeader title={t('title')} highlight={t('highlight')} tone="brand" />
                <Reveal>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
                        {goals.map((goal, i) => (
                            <li key={goal.id}>
                                <CollectionTile href={`/categorias/${goal.slug}`} name={goal.name} imageUrl={goal.imageUrl} variant="goal" index={i} />
                            </li>
                        ))}
                    </ul>
                </Reveal>
            </div>
        </section>
    );
}
```

Mensajes `Home.goals`:
- es: `{eyebrow: "Compra por objetivo", title: "¿Cuál es tu", highlight: "objetivo?"}`
- en: `{eyebrow: "Shop by goal", title: "What's your", highlight: "goal?"}`

En `page.tsx`, después de `FeaturedProducts`: `<Suspense><GoalsSection /></Suspense>`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): bloque de objetivos con las colecciones de la faceta Objetivo"
```

---

### Task 6: Iron Rewards con las cifras reales del programa

**Files:**
- Modify: `apps/storefront/src/features/loyalty/loyalty-teaser.tsx`
- Modify: `apps/storefront/src/features/loyalty/messages/{es,en}.json` (`Loyalty.teaser.*`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Consumes: `getLoyaltyProgramConfig()` (Task 1).

- [ ] **Step 1: Escribir el test que falla**

```js
test('Iron Rewards muestra las cifras de la configuración del programa', async () => {
    const teaser = await read('features/loyalty/loyalty-teaser.tsx');
    assert.match(teaser, /getLoyaltyProgramConfig\(\)/);
    assert.match(teaser, /config\.pointsPerEuro/);
    assert.match(teaser, /config\.minRedeemablePoints/);
    assert.match(teaser, /config\.maxDiscountPerOrderCents/);
    assert.match(teaser, /bg-brand/);
    const es = await json('features/loyalty/messages/es.json');
    for (const k of ['earn', 'redeem', 'cap']) assert.ok(es.Loyalty.teaser.stats[k], `falta teaser.stats.${k}`);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En `loyalty-teaser.tsx` la lógica de sesión y saldo no cambia. Se añade `const config = await getLoyaltyProgramConfig();` y se pinta este bloque (`Price` de `@/features/pricing/price` si existe, si no `Intl.NumberFormat` con `currency: 'EUR'`; comprobarlo con `ls src/features/pricing`):

```tsx
const minRedeemEuros = (config.minRedeemablePoints * config.pointValueInCents) / 100;
const capEuros = config.maxDiscountPerOrderCents / 100;
const stats = [
    {value: String(config.pointsPerEuro), label: t('stats.earn')},
    {value: String(config.minRedeemablePoints), label: t('stats.redeem', {euros: minRedeemEuros})},
    {value: `${capEuros} €`, label: t('stats.cap')},
];
```

Maquetación: `section` con `relative overflow-hidden bg-brand py-16 text-brand-fg md:py-24`; la estrella decorativa queda igual. Columna izquierda con el título (`h2 text-5xl md:text-6xl`, con "Iron" en blanco y "Rewards" en `text-primary-text`, a partir de `t('title')` partido en dos claves `titleLead` "Iron" y `titleHighlight` "Rewards", quitando `title`). Debajo, la descripción (`text-brand-muted`), el saldo si hay sesión y el botón de siempre. Columna derecha: `<ul className="stagger grid grid-cols-3 gap-3">` con cada cifra en una tarjeta `rounded-lg border border-brand-line bg-brand-surface p-4`: el valor en `font-display text-5xl font-black italic text-primary-text` y la etiqueta en `text-xs text-brand-muted`. Antes de quitar `title`, comprobar con `grep -rn "teaser" src` que nadie más lo usa.

Mensajes `Loyalty.teaser.stats`:
- es: `earn: "punto por cada euro"`, `redeem: "puntos = {euros} € de descuento"`, `cap: "de descuento máximo por pedido"`
- en: `earn: "point per euro spent"`, `redeem: "points = €{euros} off"`, `cap: "maximum discount per order"`

En inglés, `{capEuros} €` se pinta igual. Es una cifra; la moneda de la tienda es EUR y el tope del servidor está en céntimos de EUR.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): Iron Rewards con las cifras de la configuración del programa"
```

---

### Task 7: Últimas noticias y orden final de la portada

**Files:**
- Modify: `apps/storefront/src/features/news/latest-news-section.tsx`
- Modify: `apps/storefront/src/features/news/components/article-card.tsx`
- Modify: `apps/storefront/src/features/news/messages/{es,en}.json` (clave `homeHighlight`)
- Modify: `apps/storefront/src/site/home/page.tsx`
- Modify: `apps/storefront/src/site/home/messages/{es,en}.json` (quitar `whyShopWithUs` y `features`)
- Test: `apps/storefront/tests/design/home.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('noticias con SectionHeader y tarjetas que se elevan', async () => {
    const news = await read('features/news/latest-news-section.tsx');
    assert.match(news, /<SectionHeader title=\{t\('homeTitle'\)\} highlight=\{t\('homeHighlight'\)\}/);
    assert.match(await read('features/news/components/article-card.tsx'), /hover-lift/);
});

test('la portada sigue el orden del spec y sin la sección antigua "por qué"', async () => {
    const page = await read('site/home/page.tsx');
    const order = ['<HeroBanner', '<CategoriesShowcase', '<TrustStrip', '<FeaturedProducts', '<GoalsSection', '<LoyaltyTeaser', '<LatestNewsSection'];
    const idx = order.map(tag => page.indexOf(tag));
    assert.ok(idx.every(i => i >= 0), 'falta algún bloque');
    assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'orden incorrecto');
    assert.doesNotMatch(page, /whyShopWithUs|section-spotlight|featureKeys/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`latest-news-section.tsx`: sustituir la cabecera (`div` con `h2` y enlace) por `<SectionHeader title={t('homeTitle')} highlight={t('homeHighlight')} action={{href: '/noticias', label: t('viewAll')}} />` y quitar el enlace duplicado para móvil (el de `SectionHeader` se ve en todos los tamaños). Envolver la rejilla en `<Reveal>`. Mensajes `News`: `homeTitle` "Últimas" / "Latest" y `homeHighlight` "noticias" / "news". Comprobar antes con `grep -rn "homeTitle" src` que no se usa en otra parte.

`article-card.tsx`: añadir `hover-lift img-zoom` al `Link` y quitar `hover:shadow-lg transition-shadow duration-200` y el `group-hover:scale-105` de la imagen, porque `img-zoom` ya lo hace.

`page.tsx`: quitar la sección "why" (`featureKeys`, iconos `BadgeCheck/Tag/Zap`) y dejar el orden HeroBanner → CategoriesShowcase → TrustStrip → FeaturedProducts → GoalsSection → LoyaltyTeaser → LatestNewsSection. Quitar `whyShopWithUs` y `features` de `Home` en es/en.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p . && npx eslint src/site src/features/news src/features/loyalty src/features/products`
Expected: PASS y limpio.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(portada): últimas noticias con el nuevo titular y orden final de bloques"
```

---

### Task 8: "Objetivos" en la cabecera y en el menú móvil

**Files:**
- Modify: `apps/storefront/src/site/navigation/navbar/navbar-collections.tsx`
- Modify: `apps/storefront/src/site/navigation/navbar/mobile-nav-wrapper.tsx`
- Modify: `apps/storefront/src/site/navigation/navbar/mobile-nav.tsx`
- Modify: `apps/storefront/src/site/navigation/messages/{es,en}.json` (clave `Navigation.goals`)
- Test: `apps/storefront/tests/design/home.test.mjs`

**Interfaces:**
- Consumes: `getGoalCollections(locale)`.
- `MobileNav` recibe una prop nueva, `goals: Collection[]`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('la cabecera tiene un desplegable "Objetivos" que solo aparece si hay objetivos', async () => {
    const nav = await read('site/navigation/navbar/navbar-collections.tsx');
    assert.match(nav, /getGoalCollections\(locale\)/);
    assert.match(nav, /goals\.length > 0 &&/);
    assert.match(nav, /<NavigationMenuTrigger/);
    assert.match(nav, /<NavigationMenuContent/);
    const mobile = await read('site/navigation/navbar/mobile-nav.tsx');
    assert.match(mobile, /goals\.length > 0 &&/);
    assert.match(await read('site/navigation/navbar/mobile-nav-wrapper.tsx'), /goals=\{goals\}/);
    const es = await json('site/navigation/messages/es.json');
    assert.equal(es.Navigation.goals, 'Objetivos');
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/home.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En `navbar-collections.tsx`: añadir `cacheTag(\`goal-collections-${locale}\`)` y cargar `getGoalCollections(locale)` en el `Promise.all`. Entre las categorías y "Noticias":

```tsx
{goals.length > 0 && (
    <NavigationMenuItem>
        <NavigationMenuTrigger className="bg-transparent px-2.5 text-xs font-semibold uppercase tracking-wide text-brand-fg/80 hover:bg-white/10 hover:text-brand-fg focus:bg-white/10 data-popup-open:bg-white/10 data-popup-open:text-brand-fg">
            {t('goals')}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
            <ul className="grid w-56 gap-0.5 p-1">
                {goals.map(goal => (
                    <li key={goal.slug}>
                        <NavigationMenuLink render={<Link href={`/categorias/${goal.slug}`} />} className="w-full font-medium">
                            {goal.name}
                        </NavigationMenuLink>
                    </li>
                ))}
            </ul>
        </NavigationMenuContent>
    </NavigationMenuItem>
)}
```

Imports: `NavigationMenuTrigger`, `NavigationMenuContent` y `NavigationMenuLink` de `@/components/ui/navigation-menu`, `Link` de `@/platform/i18n/navigation`. Si el trigger de Base UI no se ve bien sobre la cabecera oscura (el selector `[&_[data-slot=button]]` de `navbar.tsx` no lo alcanza porque su `data-slot` es `navigation-menu-trigger`), se le dan las clases de arriba directamente.

En `mobile-nav-wrapper.tsx`: añadir `cacheTag(\`goal-collections-${locale}\`)`, cargar `const [collections, goals] = await Promise.all([getTopCollections(locale), getGoalCollections(locale)]);` y pasar `goals={goals}`.

En `mobile-nav.tsx`: añadir `goals: Collection[]` a `MobileNavProps` y, después del bloque de colecciones, una sección igual con título `t('goals')` y enlaces a `/categorias/${goal.slug}`, dentro de `{goals.length > 0 && (…)}`. Copiar exactamente el marcado del bloque `collections.length > 0` que ya existe (líneas ~111-130) cambiando las variables.

Mensajes `Navigation.goals`: "Objetivos" / "Goals".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -15 && npx tsc --noEmit -p . && npx eslint src/site/navigation`
Expected: PASS y limpio.

- [ ] **Step 5: Commit**

```bash
git add -A apps/storefront/src apps/storefront/tests
git commit -m "feat(cabecera): desplegable de objetivos en escritorio y sección en el menú móvil"
```

---

### Task 9: Verificación completa y capturas

**Files:** ninguno del repo (scripts en el scratchpad).

- [ ] **Step 1: Comprobaciones estáticas**

Run: `cd apps/storefront && npm test 2>&1 | tail -8 && npx tsc --noEmit -p . && npx eslint src`
Expected: solo fallan los 3 tests conocidos de `tests/upgrade`.

- [ ] **Step 2: Build de producción en una copia temporal**

Copiar `apps/storefront` (sin `node_modules`, `.next` ni `tsconfig.tsbuildinfo`) a `ironSavage/tmp-fase2/storefront` con una unión `node_modules` que apunte a `..\..\apps\storefront\node_modules`. Lanzar `next build` y después `next start -p 3200` con `VENDURE_SHOP_API_URL=https://api-dev.57-129-168-160.sslip.io/shop-api VENDURE_CHANNEL_TOKEN=__default_channel__ API_DOMAIN=api-dev.57-129-168-160.sslip.io NEXT_PUBLIC_SITE_URL=http://localhost:3200`.
Expected: el build termina sin errores.

- [ ] **Step 3: Capturas**

Ejecutar `scratchpad/pw/visual-check.mjs` con `OUT=fase2 PAGES=/,/en,/categorias/objetivo-ganar-musculo`: escritorio y móvil, claro y oscuro, movimiento reducido y cabecera a 1024/1280/1440. Añadir una captura con el desplegable "Objetivos" abierto (pasar el ratón por el trigger) a 1440.
Expected: estado 200; 0 bloques ocultos con Reveal; banner con el bote ISO SAVAGE; categorías superpuestas; objetivos con inicial grande; Iron Rewards con 1 / 100 / 20 €; cabecera sin solapes.

- [ ] **Step 4: Limpieza**

Matar solo el árbol de procesos del puerto 3200 (sin tocar `concurrently` ni el `npm run dev` del usuario) y luego: `cd tmp-fase2/storefront && cmd //c "rmdir node_modules" && [ ! -e node_modules ] && cd /c && rm -rf "<ruta>/tmp-fase2"`. Comprobar que `apps/storefront/node_modules` sigue intacto.
