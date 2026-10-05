# Rediseño · Fase 6: pendientes, páginas secundarias y repaso final · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- cerrar los detalles menores que quedan (revisión de la 5B);
- rediseñar:
  - **noticias:** destacada grande en un bloque oscuro y tarjetas; artículo con lectura cómoda;
  - **legales:** mismos textos, con índice, títulos claros, ancho de línea cómodo e imprimir/PDF;
  - **404:** "404" enorme con animación breve y "Te has salido de la ruta";
  - **error:** mismo comportamiento, estilo nuevo;
- hacer el repaso final para que no quede ningún título ni esqueleto con el estilo antiguo.

**Architecture:** Cambios de presentación sobre componentes existentes. El índice de las páginas legales es un componente cliente (`LegalToc`) que lee los `h2` del contenido y les da un `id`, sin tocar los textos legales; antes de hidratar no se ve nada y el contenido no cambia. El "404" usa las utilidades de movimiento de la fase 1 y se anula con reducir movimiento. Un test de auditoría fija que no quedan títulos `h1` con el estilo antiguo (`text-2xl/3xl font-bold`) ni textos en inglés fijos en los esqueletos de carga.

**Tech Stack:** Next.js 16.3, React 19.3, Tailwind 4, next-intl y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (5.8 páginas secundarias, 8.6 repaso final). Pendientes: revisión final de la 5B.

## Global Constraints

- **Textos legales intactos:** solo cambian la maquetación, el índice y los estilos. El aviso de borrador y "solo en español" siguen.
- **La página de error conserva su comportamiento:** vuelta automática al inicio, reintentar y quedarse.
- Sin librerías nuevas. Textos en `es` y `en`. Movimiento anulado con `prefers-reduced-motion`.
- Comentarios en español. Nunca se dejan servidores de prueba arrancados. Las copias temporales (`tmp-*`) se borran al terminar.

## Review Focus

- **Imprimir una página legal:** sin índice, sin cabecera de marca oscura y con el texto en negro (test de la Task 3).
- **Página legal sin JavaScript o antes de hidratar:** el texto completo se ve; el índice simplemente no aparece (test de la Task 3).
- **Noticias sin artículos o con uno solo:** ni bloque destacado vacío ni rejilla vacía; en las páginas 2 y siguientes, sin destacado (test de la Task 2).
- **404 con reducir movimiento:** el número se ve quieto (test de la Task 4).
- **Esqueletos de carga:** sin textos en inglés fijos (test de la Task 5).

---

### Task 1: Pendientes de la 5B

**Files:**
- `apps/storefront/src/features/authentication/auth-panel-image.ts`
- `apps/server/src/vendure-config.ts`
- `apps/storefront/src/features/authentication/routes/reset-password/reset-password-form.tsx`

**Test:** `apps/storefront/tests/design/pending-fixes-5b.test.mjs` (nuevo).

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/pending-fixes-5b.test.mjs -->
```js
// Detalles menores de la revisión final de la fase 5B, cerrados en la fase 6.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..', '..', '..', '..');
const read = f => readFile(path.join(root, f), 'utf8').catch(() => '');

test('un fallo puntual de Vendure no deja la imagen del panel en caché como null', async () => {
    const data = await read('apps/storefront/src/features/authentication/auth-panel-image.ts');
    // La función cacheada lanza el error (no se cachea) y la pública lo captura.
    assert.match(data, /async function loadAuthPanelImage\(\)/);
    assert.match(data, /export async function getAuthPanelImage\(\)[\s\S]*?try \{\s*return await loadAuthPanelImage\(\);/);
    const cached = data.slice(data.indexOf('async function loadAuthPanelImage'), data.indexOf('export async function getAuthPanelImage'));
    assert.doesNotMatch(cached, /catch/);
});

test('authPanelImage sin public:true (GlobalSettings no está en la Shop API)', async () => {
    const cfg = await read('apps/server/src/vendure-config.ts');
    const field = cfg.slice(cfg.indexOf("name: 'authPanelImage'"), cfg.indexOf("name: 'authPanelImage'") + 400);
    assert.doesNotMatch(field, /public: true/);
});

test('restablecer contraseña tiene su título principal', async () => {
    const form = await read('apps/storefront/src/features/authentication/routes/reset-password/reset-password-form.tsx');
    assert.match(form, /<CardTitle><h1>\{t\('invalidResetLink'\)\}<\/h1><\/CardTitle>/);
    assert.match(form, /<CardTitle><h1>\{t\('resetYourPassword'\)\}<\/h1><\/CardTitle>/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/pending-fixes-5b.test.mjs`
Expected: FAIL en los 3 tests.

- [ ] **Step 3: Implementar**

1. **Imagen del panel sin cachear fallos.** En `auth-panel-image.ts`:
   - la parte con `'use cache'` pasa a una función interna `loadAuthPanelImage()`, que lanza el error si la consulta falla (los errores no se cachean);
   - `getAuthPanelImage()` (exportada y sin `'use cache'`) hace `try { return await loadAuthPanelImage(); } catch { return null; }`.
2. **Sin `public: true`.** En `vendure-config.ts`, quitar `public: true` del campo `authPanelImage`. No cambia el esquema de la base de datos ni hace falta migración. Comentario: la exposición la hace solo la consulta `storefrontSettings`.
3. **Título de restablecer contraseña.** En `reset-password-form.tsx`, envolver el texto de los dos `CardTitle` en `<h1>`, como ya hace `forgot-password-form.tsx`.
4. **Borrar un asset en uso.** Se queda como está: la descripción del campo y la documentación ya avisan. Se deja un ruling.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit -p . && cd ../server && npx tsc --noEmit -p . && npm test 2>&1 | tail -3`
Expected: PASS y limpio.

- [ ] **Step 5: Commit** — `fix(rediseño): pendientes menores del acceso`

---

### Task 2: Noticias: destacada en un bloque oscuro y artículo de lectura cómoda

**Files:**
- Modify: `apps/storefront/src/features/news/routes/page.tsx`, `apps/storefront/src/features/news/routes/[slug]/page.tsx`, `apps/storefront/src/features/news/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/secondary.test.mjs` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/secondary.test.mjs -->
```js
// Fase 6 del rediseño: páginas secundarias y repaso final.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));

test('noticias: destacada en un bloque oscuro solo en la primera página y con artículos', async () => {
    const page = await read('features/news/routes/page.tsx');
    assert.match(page, /const featured = currentPage === 1 \? articles\[0\] : undefined/);
    assert.match(page, /\{featured && \(/);
    assert.match(page, /bg-brand/);
    assert.match(page, /<ListingHeader/);
    assert.match(page, /rest\.length > 0 &&/);
    for (const loc of ['es', 'en']) assert.ok((await json(`features/news/messages/${loc}.json`)).News.readArticle);
});

test('artículo con lectura cómoda: cabecera oscura y columna de unos 68 caracteres', async () => {
    const article = await read('features/news/routes/[slug]/page.tsx');
    assert.match(article, /bg-brand/);
    assert.match(article, /max-w-\[68ch\]/);
    assert.match(article, /text-lg leading-8/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

**Lista (`routes/page.tsx`):**
- El `return` pasa a:
  - `<ListingHeader crumbs={[{label: t('home'), href: '/'}, {label: t('pageTitle')}]} title={t('pageTitle')} watermark="N" />`, de `@/features/products/listing-header`;
  - un contenedor `container mx-auto px-4 py-10`.
- `const featured = currentPage === 1 ? articles[0] : undefined;` y `const rest = featured ? articles.slice(1) : articles;`.
- Si `featured` existe, un bloque `<Link href={`/noticias/${featured.slug}`} className="group mb-10 grid overflow-hidden rounded-xl bg-brand text-brand-fg md:grid-cols-2 hover-lift">` con:
  - la imagen (`?preset=large`, `img-zoom`, `aspect-video md:aspect-auto md:min-h-80`, `object-cover`) si tiene portada;
  - un panel `flex flex-col justify-center gap-3 p-6 md:p-10` con la fecha (`text-xs uppercase tracking-[.16em] text-brand-muted`), el título (`h2`, `text-4xl md:text-5xl`), el extracto (`text-brand-muted line-clamp-3`) y `t('readArticle')` con una flecha en `text-primary-text`.
- `{rest.length > 0 && (<div className="grid … gap-6 mb-10">…ArticleCard…</div>)}`.
- Sin artículos: el mensaje `noArticles` dentro del contenedor, como hoy. La paginación no cambia.
- `News.home`: "Inicio" / "Home", si no existe. `News.readArticle`: "Leer artículo" / "Read article".

**Artículo (`routes/[slug]/page.tsx`):**
- Cabecera `<header className="bg-brand text-brand-fg">` con `container mx-auto max-w-[68ch] px-4 py-10 md:py-14`: enlace "Volver a noticias" (`text-brand-muted hover:text-brand-fg`), fecha (`text-xs uppercase tracking-[.16em] text-brand-muted`) y `h1` (`text-4xl md:text-6xl`).
- Cuerpo `<div className="container mx-auto max-w-[68ch] px-4 py-10">`:
  - portada (`aspect-video rounded-xl -mt-16 md:-mt-20 relative shadow-xl`, montada sobre el borde de la cabecera), si la hay;
  - extracto `text-xl leading-relaxed text-muted-foreground`;
  - párrafos `text-lg leading-8`, con un espacio `space-y-6`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(noticias): destacada en un bloque oscuro y artículo de lectura cómoda`

---

### Task 3: Legales con índice, títulos claros y ancho cómodo

**Files:**
- Create: `apps/storefront/src/site/legal/legal-toc.tsx` (cliente)
- Modify: `apps/storefront/src/site/legal/legal-page.tsx`, `site/legal/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/secondary.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('legales: índice generado de los títulos, sin índice al imprimir y texto siempre visible', async () => {
    const toc = await read('site/legal/legal-toc.tsx');
    assert.match(toc, /^'use client';/);
    assert.match(toc, /querySelectorAll\('h2'\)/);
    assert.match(toc, /if \(!items\.length\) return null/);
    const shell = await read('site/legal/legal-page.tsx');
    assert.match(shell, /<LegalToc/);
    assert.match(shell, /print:hidden/);
    assert.match(shell, /max-w-\[70ch\]/);
    assert.match(shell, /id="legal-content"/);
    assert.match(shell, /<h1 className="[^"]*text-5xl/);
    for (const loc of ['es', 'en']) assert.ok((await json(`site/legal/messages/${loc}.json`)).Legal.contents);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs`
Expected: FAIL en el test nuevo.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/site/legal/legal-toc.tsx -->
```tsx
'use client';

import {useEffect, useState} from 'react';

/** Convierte un título en un id de ancla estable ("1. Datos identificativos" → "datos-identificativos"). */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Índice de una página legal: lee los h2 del contenido (#legal-content), les pone un id
 * y lista los enlaces. Así no se tocan los textos legales. Antes de hidratar (o sin
 * JavaScript) no se pinta nada y el texto se lee igual.
 */
export function LegalToc({label}: {label: string}) {
    const [items, setItems] = useState<Array<{id: string; text: string}>>([]);

    useEffect(() => {
        const headings = [...(document.getElementById('legal-content')?.querySelectorAll('h2') ?? [])];
        const used = new Set<string>();
        setItems(headings.map((heading) => {
            let id = heading.id || slugify(heading.textContent ?? '') || 'seccion';
            while (used.has(id)) id = `${id}-1`;
            used.add(id);
            heading.id = id;
            return {id, text: heading.textContent ?? ''};
        }));
    }, []);

    if (!items.length) return null;

    return (
        <nav aria-label={label} className="text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{label}</p>
            <ol className="space-y-2 border-l border-border">
                {items.map((item) => (
                    <li key={item.id}>
                        <a href={`#${item.id}`} className="-ml-px block border-l-2 border-transparent pl-3 text-muted-foreground transition-colors hover:border-primary-solid hover:text-foreground">
                            {item.text}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
```

`legal-page.tsx` (`LegalPageShell`):
- Cabecera `<header className="bg-brand text-brand-fg print:bg-transparent print:text-black">` con `container mx-auto px-4 py-10 md:py-14`: `h1` `text-5xl md:text-6xl` y, debajo, la fecha de actualización (`text-sm text-brand-muted print:text-black`) y `PrintButton` (en `print:hidden` si no lo tiene ya).
- Cuerpo `container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]`:
  - `<aside className="hidden lg:block print:hidden"><div className="sticky top-[calc(var(--header-offset)+1.5rem)]"><LegalToc label={t('contents')} /></div></aside>`;
  - la columna del texto `max-w-[70ch]`, con las alertas de hoy (idioma y borrador) y el `div` del contenido (las mismas clases `prose…`), que gana `id="legal-content"`;
  - en los `h2` del contenido, `[&_h2]:text-2xl` en vez de `[&_h2]:text-lg`, más `[&_h2]:border-t [&_h2]:border-border [&_h2]:pt-6`.
- Al imprimir: sin índice ni fondo oscuro (`print:` ya presentes). El ancho pasa a ser completo con `print:max-w-none` en la columna.
- `Legal.contents`: "Índice" / "Contents".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs && npx tsc --noEmit -p . && npx eslint src/site/legal`
Expected: PASS y limpio.

- [ ] **Step 5: Commit** — `feat(legales): índice, títulos claros y ancho de línea cómodo`

---

### Task 4: 404 y página de error con el estilo nuevo

**Files:**
- Modify: `apps/storefront/src/site/not-found.tsx`, `apps/storefront/src/site/errors/error-page.tsx`, `apps/storefront/src/site/messages/{es,en}.json`, `apps/storefront/src/app/[locale]/globals.css`
- Test: `apps/storefront/tests/design/secondary.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('404 en bloque oscuro con el número enorme animado (quieto con reducir movimiento)', async () => {
    const nf = await read('site/not-found.tsx');
    assert.match(nf, /bg-brand/);
    assert.match(nf, /animate-glitch-in/);
    assert.match(nf, /text-\[clamp\(/);
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes glitch-in/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.animate-glitch-in/);
    const es = (await json('site/messages/es.json')).NotFound;
    assert.equal(es.title, 'Te has salido de la ruta');
});

test('página de error con el estilo nuevo y el mismo comportamiento', async () => {
    const page = await read('site/errors/error-page.tsx');
    assert.match(page, /bg-brand/);
    assert.match(page, /useAutoRecovery/);
    assert.match(page, /router\.refresh\(\)/);
    assert.match(page, /<h1 className="[^"]*text-5xl/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs`
Expected: FAIL en los 2 tests nuevos.

- [ ] **Step 3: Implementar**

En `globals.css`, tras `.animate-hero-zoom`:

```css
/* 404 (site/not-found.tsx): el número entra con un leve temblor y se asienta. */
@keyframes glitch-in {
  0% { opacity: 0; transform: translate3d(-12px, 0, 0) skewX(-12deg); }
  40% { opacity: 1; transform: translate3d(8px, 0, 0) skewX(6deg); }
  70% { transform: translate3d(-4px, 0, 0) skewX(-3deg); }
  100% { opacity: 1; transform: none; }
}
.animate-glitch-in { animation: glitch-in var(--dur-hero) var(--ease-out) both; }
```

Añadir `.animate-glitch-in` a la línea de `animation: none !important;` del último bloque `prefers-reduced-motion`.

`not-found.tsx`:
- El contenedor pasa a `<section className="relative flex min-h-[calc(100vh-var(--header-offset))] items-center overflow-hidden bg-brand px-4 py-16 text-brand-fg">` con un fondo radial rojo (`bg-[radial-gradient(...)]`, `aria-hidden`).
- Dentro, `container mx-auto text-center`:
  - `<p aria-hidden="true" className="animate-glitch-in font-display text-[clamp(8rem,28vw,18rem)] font-black italic leading-none text-primary-text">404</p>`;
  - `<h1 className="text-5xl md:text-6xl">{t('title')}</h1>`;
  - el mensaje en `text-brand-muted`;
  - los dos botones (inicio con la variante por defecto y productos con la variante `brand`);
  - las categorías populares como enlaces `rounded-full border border-brand-line px-4 py-1.5 text-sm hover:bg-white/10`.
- Se quita el icono `SearchX`.
- `NotFound.title`: "Te has salido de la ruta" / "You've gone off the route". `NotFound.message`: "Esta página no existe o se ha movido. Vuelve al inicio o sigue por la tienda." / "This page doesn't exist or has moved. Head home or keep browsing."

`error-page.tsx`:
- El contenedor pasa a `section` con `bg-brand text-brand-fg` y el mismo fondo radial.
- El icono va en un círculo `bg-primary-solid`.
- El `h1` pasa a `text-5xl md:text-6xl`.
- Los textos secundarios pasan a `text-brand-muted`.
- Los botones "Ir al inicio" y "Quedarme" pasan a la variante `brand`.
- **La lógica no se toca** (`useAutoRecovery`, `retry`, `router.refresh()`, `reset()`, `digest`).

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs && npx tsc --noEmit -p . && npx eslint src/site`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(rediseño): 404 y página de error con el estilo nuevo`

---

### Task 5: Repaso final: títulos y esqueletos con el estilo nuevo

**Files (Modify):**
- `features/authentication/routes/verify/{set-password-form,verify-content,verify-result}.tsx`
- `features/authentication/routes/verify-pending/page.tsx`
- `features/search/facet-filters.tsx`
- `features/account/routes/{addresses,orders,profile}/loading.tsx`, `features/invoices/routes/loading.tsx`, `features/loyalty/routes/loading.tsx`

**Test:** `apps/storefront/tests/design/secondary.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
async function tsxFiles(dir) {
    const out = [];
    for (const e of await readdir(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...await tsxFiles(p));
        else if (e.name.endsWith('.tsx')) out.push(p);
    }
    return out;
}

test('repaso final: ningún h1 con el estilo antiguo ni esqueletos con texto en inglés fijo', async () => {
    const offenders = [];
    for (const file of await tsxFiles(src)) {
        const s = await readFile(file, 'utf8');
        if (/<h1 className="[^"]*text-[23]xl[^"]*font-bold/.test(s)) offenders.push(path.relative(src, file));
        if (file.endsWith('loading.tsx') && /<h1[^>]*>[A-Z][a-z]+( [A-Z][a-z]+)?<\/h1>/.test(s)) offenders.push(`${path.relative(src, file)} (texto fijo)`);
    }
    assert.deepEqual(offenders, []);
    assert.doesNotMatch(await read('features/search/facet-filters.tsx'), /text-display text-lg font-bold/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/secondary.test.mjs`
Expected: FAIL; la lista de infractores coincide con la auditoría (verify, verify-pending y los cinco `loading.tsx`).

- [ ] **Step 3: Implementar**

- En los `h1` de `set-password-form`, `verify-content`, `verify-result` y `verify-pending`, `className="text-2xl font-bold"` pasa a `className="text-4xl"`. La fuente display ya viene de la base de los títulos.
- En `facet-filters.tsx`, `className="text-display text-lg font-bold"` del `h2` "Filtros" pasa a `className="text-2xl"`.
- En los cinco `loading.tsx`, el `<h1 …>My Orders</h1>` (y los equivalentes) pasa a `<Skeleton className="mb-6 h-14 w-64" />`, sin texto. El esqueleto no debe anunciar un título en inglés. Se importa `Skeleton` si no está.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de upgrade; limpio.

- [ ] **Step 5: Commit** — `fix(rediseño): repaso final de títulos y esqueletos`

---

### Task 6: Verificación final

- [ ] **Step 1:** tienda (`npm test`, `tsc`, `eslint`) y servidor (`npm test`, `tsc`, `npm run build:server`).
- [ ] **Step 2:** `next build` en la copia `tmp-fase6` y `next start -p 3200` contra la API de desarrollo.
- [ ] **Step 3:** Capturas (escritorio y móvil, claro y oscuro) de `/noticias`, un artículo, `/aviso-legal`, `/terminos-y-condiciones` y `/no-existe`. Además:
  - repaso rápido en escritorio claro de `/`, `/productos`, `/productos/iso-savage`, `/carrito`, `/login` y `/registro`, sin sesión, buscando incoherencias de estilo;
  - en una página legal, el índice tiene un enlace por cada `h2` y llevan a su apartado;
  - la emulación de impresión de una página legal oculta el índice;
  - `/no-existe` con movimiento reducido.
- [ ] **Step 4:** Limpieza: solo el árbol del puerto 3200; quitar la unión con `rmdir` desde dentro de la copia; borrar la copia; comprobar `node_modules`.
