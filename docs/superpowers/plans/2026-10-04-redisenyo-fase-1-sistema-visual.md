# Rediseño · Fase 1: sistema visual, cabecera y pie · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implantar el nuevo sistema visual (tokens de color por zonas, Barlow Condensed + Inter, movimiento) y rehacer la cabecera, la cinta de avisos y el pie, sin cambiar la lógica de negocio.

**Architecture:** Todo el diseño vive en tokens CSS de Tailwind 4 en `globals.css` (zona *marca* siempre oscura + zona *contenido* clara/oscura según el tema), fuentes con `next/font`, primitivas de movimiento en CSS más un componente cliente `Reveal` con IntersectionObserver, y componentes de marca reutilizables en `src/components/brand/`. La cabecera y el pie se reescriben sobre esos tokens; las demás pantallas heredan los tokens ya en esta fase y se rediseñan en fases posteriores.

**Tech Stack:** Next.js 16.3 (App Router, `cacheComponents`), React 19.3 (`ViewTransition`), Tailwind CSS 4, shadcn sobre Base UI, next-intl, `node --test` para tests.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (secciones 2, 3, 4, 5.1 y 9).

## Global Constraints

- No se cambia lógica de negocio (precios, impuestos, stock, pedidos, pagos, login obligatorio, puntos, facturas, legal).
- Paleta: negro marca `#0B0B0C`, grafito `#17181B`, rojo marca `#E7000B` (hover `#C50009`), rojo texto sobre oscuro `#FF4D4D`, blanco, gris claro `#F3F3F4`, verde `#16A34A`.
- Titulares: Barlow Condensed cursiva 700–900, mayúsculas, interlineado ~0.92. Texto, interfaz y precios: Inter con `tabular-nums`. Se retiran Oswald, Black Ops One y Geist Mono.
- Movimiento: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-spring: cubic-bezier(.3,1.6,.5,1)`, `--dur-fast: 160ms`, `--dur-base: 240ms`, `--dur-slow: 420ms`, `--dur-hero: 600ms`; solo `transform`/`opacity` (o `background-size` en imágenes). Todo se desactiva con `prefers-reduced-motion: reduce`.
- Sin librerías nuevas.
- Selector de tema claro/oscuro/sistema se mantiene; claro = híbrido, oscuro = todo oscuro.
- Textos nuevos en `es` y `en` con las mismas claves (lo comprueba `tests/i18n/messages.test.mjs`).
- `src/app` solo reexporta; `features` no importan de `site` (`tests/architecture/boundaries.test.mjs`).
- Comentarios y documentación en español.
- Nunca dejar servidores de prueba arrancados; no tocar el `npm run dev` del usuario (puertos 3000/3001/5173).

## Review Focus

- **Tema oscuro en zonas de contenido:** cualquier página con `bg-background` debe verse correcta en oscuro (texto legible, bordes visibles); la verificación visual de la Task 7 captura las dos versiones.
- **`prefers-reduced-motion`:** con la preferencia activa no debe quedar ninguna animación ni elemento invisible (opacidad 0) esperando a animarse; la Task 2 lo comprueba con un test sobre el CSS y la Task 7 con captura emulando la preferencia.
- **Textos largos en la cabecera:** inglés o nombres de categoría largos no deben solaparse con buscador e iconos entre 1024 y 1536 px; la Task 5 lo verifica con capturas a 1024, 1280 y 1440 px.
- **Usos existentes de `font-mono`/`font-display`:** precios y títulos de pantallas aún no rediseñadas deben seguir viéndose bien con las nuevas fuentes; `--font-mono` pasa a Inter con cifras tabulares (Task 1) y la Task 7 revisa ficha, carrito y cuenta.
- **Sin JavaScript o antes de hidratar:** los bloques con `Reveal` deben ser visibles si el JS no ha cargado (no ocultar por CSS sin la clase que añade el script); test de la Task 2.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/storefront/src/app/[locale]/globals.css` | Tokens (zonas, rojo, radios, movimiento), fuentes, utilidades de movimiento y base tipográfica |
| `apps/storefront/src/site/locale-layout.tsx` | Carga de fuentes con `next/font`; montaje de `ViewTransition` |
| `apps/storefront/src/components/motion/reveal.tsx` (nuevo) | Componente cliente que marca un bloque como visible al entrar en pantalla |
| `apps/storefront/src/components/ui/button.tsx` | Variantes de botón con la nueva identidad (API intacta + variante `brand`) |
| `apps/storefront/src/components/brand/marquee.tsx` (nuevo) | Cinta de avisos en movimiento |
| `apps/storefront/src/components/brand/brand-band.tsx` (nuevo) | Franja oscura de cabecera de listados y bloques de marca |
| `apps/storefront/src/components/brand/section-header.tsx` (nuevo) | Titular de sección con palabra en rojo y enlace |
| `apps/storefront/src/components/brand/trust-strip.tsx` (nuevo) | Franja de confianza (envío, pago, devolución, puntos) |
| `apps/storefront/src/site/navigation/top-bar.tsx` | Pasa a usar `Marquee` |
| `apps/storefront/src/site/navigation/navbar.tsx` | Cabecera oscura, logo grande, buscador visible desde `lg` |
| `apps/storefront/src/site/navigation/navbar/navbar-cart.tsx`, `cart-icon.tsx` | Carrito con importe |
| `apps/storefront/src/site/footer.tsx` | Pie nuevo |
| `apps/storefront/tests/design/tokens.test.mjs` (nuevo) | Garantiza que existen los tokens y reglas de movimiento accesible |

---

### Task 1: Tokens de diseño y fuentes

**Files:**
- Modify: `apps/storefront/src/app/[locale]/globals.css` (bloque `@theme inline`, `:root`, `.dark`, `@layer base`)
- Modify: `apps/storefront/src/site/locale-layout.tsx:1-50` (imports de `next/font/google` y clases del `<body>`)
- Test: `apps/storefront/tests/design/tokens.test.mjs` (nuevo)

**Interfaces:**
- Produces (utilidades Tailwind disponibles para todas las tareas): `bg-brand`, `bg-brand-surface`, `border-brand-line`, `text-brand-fg`, `text-brand-muted`, `text-primary-text`, `font-display` (Barlow Condensed cursiva), `font-mono` (Inter con cifras tabulares), variables `--ease-out`, `--ease-spring`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--dur-hero`, radio base `--radius: 0.5rem`.

- [ ] **Step 1: Write the failing test**

Crear `apps/storefront/tests/design/tokens.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const css = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'app', '[locale]', 'globals.css'), 'utf8');

/** Contenido del primer bloque que empieza por `selector {`, con llaves anidadas. */
function block(selector) {
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0, `falta el bloque ${selector}`);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(start, i);
    }
    throw new Error(`bloque ${selector} sin cerrar`);
}

const BRAND_TOKENS = ['--brand', '--brand-surface', '--brand-line', '--brand-fg', '--brand-muted', '--primary-text'];
const MOTION_TOKENS = ['--ease-out', '--ease-spring', '--dur-fast', '--dur-base', '--dur-slow', '--dur-hero'];

test('la zona de marca existe en los dos temas y es oscura en ambos', () => {
    for (const selector of [':root', '.dark']) {
        const body = block(selector);
        for (const token of BRAND_TOKENS) assert.match(body, new RegExp(`${token}:`), `${selector} no define ${token}`);
    }
    // Siempre oscura: el mismo negro de marca en claro y en oscuro.
    assert.match(block(':root'), /--brand:\s*#0b0b0c/i);
    assert.match(block('.dark'), /--brand:\s*#0b0b0c/i);
});

test('los tokens de movimiento existen en :root', () => {
    const body = block(':root');
    for (const token of MOTION_TOKENS) assert.match(body, new RegExp(`${token}:`), `falta ${token}`);
});

test('Tailwind expone la zona de marca y las fuentes nuevas', () => {
    const theme = block('@theme inline');
    for (const name of ['--color-brand:', '--color-brand-surface:', '--color-brand-line:', '--color-brand-fg:', '--color-brand-muted:', '--color-primary-text:']) {
        assert.ok(theme.includes(name), `@theme no expone ${name}`);
    }
    assert.match(theme, /--font-display:\s*var\(--font-barlow-condensed\)/);
    assert.match(theme, /--font-mono:\s*var\(--font-inter\)/);
    assert.doesNotMatch(css, /--font-oswald|--font-geist-mono/, 'quedan referencias a fuentes retiradas');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/storefront && node --test tests/design/tokens.test.mjs`
Expected: FAIL ("`:root` no define --brand").

- [ ] **Step 3: Implementar tokens en `globals.css`**

1. En `@theme inline`, sustituir las tres líneas de fuentes y añadir los colores de marca:

```css
  --font-sans: var(--font-inter);
  /* Titulares: Barlow Condensed cursiva (ver la regla de h1–h6 y .text-display). */
  --font-display: var(--font-barlow-condensed);
  /* Antes Geist Mono para precios: ahora Inter con cifras tabulares (ver .font-mono). */
  --font-mono: var(--font-inter);
  /* Zona de MARCA: siempre oscura (cabecera, portada, bloques de marca, pie). */
  --color-brand: var(--brand);
  --color-brand-surface: var(--brand-surface);
  --color-brand-line: var(--brand-line);
  --color-brand-fg: var(--brand-fg);
  --color-brand-muted: var(--brand-muted);
  /* Rojo para TEXTO sobre fondo oscuro (el rojo de fondo con texto blanco es --primary-solid). */
  --color-primary-text: var(--primary-text);
```

2. En `:root`, cambiar `--radius: 0.375rem;` por `--radius: 0.5rem;` (con el comentario actualizado: controles 8 px, tarjetas 12 px vía `rounded-xl`) y añadir al final del bloque:

```css
  /* Zona de marca (igual en claro y en oscuro). */
  --brand: #0b0b0c;
  --brand-surface: #17181b;
  --brand-line: rgb(255 255 255 / 8%);
  --brand-fg: #ffffff;
  --brand-muted: #a1a1a7;
  --primary-text: #ff4d4d;

  /* Movimiento: curvas y duraciones comunes. */
  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --ease-spring: cubic-bezier(.3, 1.6, .5, 1);
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --dur-slow: 420ms;
  --dur-hero: 600ms;
```

3. Al final de `.dark` añadir exactamente los mismos seis tokens de marca (`--brand` … `--primary-text`) con los mismos valores.

4. Ajustar la paleta clara existente a la aprobada: `--muted` y `--secondary` a `#f3f3f4` (gris claro de tarjetas). En `.dark`, `--background: #0f1012;` y `--card: #1a1b1e;` (valores de la maqueta).

5. En `@layer base`, sustituir la regla de encabezados por:

```css
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 800;
    text-transform: uppercase;
    line-height: .92;
  }
```

6. En `@layer utilities`, sustituir `.text-display` por la versión cursiva y añadir `.font-mono` tabular:

```css
  .text-display {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 800;
    letter-spacing: -0.005em;
    line-height: .92;
    text-transform: uppercase;
  }
  /* Precios y cifras: Inter con números del mismo ancho (las columnas cuadran). */
  .font-mono {
    font-variant-numeric: tabular-nums;
  }
```

- [ ] **Step 4: Cargar las fuentes en `locale-layout.tsx`**

Sustituir los imports y declaraciones de `Oswald`, `Geist_Mono` y `Black_Ops_One` por:

```tsx
import {Barlow_Condensed, Inter} from "next/font/google";

// Inter: texto de interfaz, cuerpo y precios (con cifras tabulares).
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

// Barlow Condensed cursiva: titulares, nombres de producto y cifras grandes de marca.
const barlowCondensed = Barlow_Condensed({
    variable: "--font-barlow-condensed",
    subsets: ["latin"],
    weight: ["700", "800", "900"],
    style: ["italic"],
});
```

y en el `<body>` dejar `className={`${inter.variable} ${barlowCondensed.variable} antialiased flex flex-col min-h-screen`}`.

`site/home/promo-carousel.tsx` usa la variable `--font-brand-display` (Black Ops One). Hasta la Fase 2 (que retira ese carrusel) añadir en `globals.css`, dentro de `:root`, `--font-brand-display: var(--font-barlow-condensed);` con el comentario «alias temporal hasta rehacer la portada (Fase 2)».

- [ ] **Step 5: Run tests**

Run: `cd apps/storefront && node --test tests/design/tokens.test.mjs && npx tsc --noEmit && npx eslint src`
Expected: PASS, `TypeScript: No errors found`, sin avisos de ESLint.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/app/[locale]/globals.css apps/storefront/src/site/locale-layout.tsx apps/storefront/tests/design/tokens.test.mjs
git commit -m "feat(diseño): tokens por zonas, Barlow Condensed e Inter, tokens de movimiento"
```

---

### Task 2: Primitivas de movimiento y transiciones de página

**Files:**
- Create: `apps/storefront/src/components/motion/reveal.tsx`
- Modify: `apps/storefront/src/app/[locale]/globals.css` (utilidades de movimiento y bloque `prefers-reduced-motion`)
- Modify: `apps/storefront/src/site/locale-layout.tsx` (envolver `{children}` del `<main>` en `ViewTransition`)
- Test: `apps/storefront/tests/design/motion.test.mjs` (nuevo)

**Interfaces:**
- Consumes: tokens `--ease-out`, `--ease-spring`, `--dur-*` (Task 1).
- Produces:
  - `export function Reveal({children, className, as?: 'div' | 'section' | 'li', delay?: number}): JSX.Element` en `@/components/motion/reveal` (cliente). Añade `data-reveal` y, al entrar en pantalla, `data-visible`. `delay` en ms se aplica como `--reveal-delay`.
  - Clases CSS: `.reveal` (entrada suave al ser visible), `.stagger > *` con `--i` (índice) para escalonar, `.hover-lift` (eleva 4 px), `.press` (escala .97 al pulsar), `.img-zoom` (zoom de imagen hija al pasar el ratón), `.animate-hero-in` (entrada enérgica de titular).

- [ ] **Step 1: Write the failing test**

Crear `apps/storefront/tests/design/motion.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const css = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'app', '[locale]', 'globals.css'), 'utf8');
const reveal = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'components', 'motion', 'reveal.tsx'), 'utf8');

test('las utilidades de movimiento existen', () => {
    for (const cls of ['.reveal', '.hover-lift', '.press', '.img-zoom', '.animate-hero-in']) {
        assert.ok(css.includes(cls), `falta ${cls}`);
    }
});

test('sin JS el contenido con Reveal es visible: solo se oculta cuando el script ha marcado data-reveal="pending"', () => {
    assert.match(css, /\[data-reveal="pending"\]/, 'el estado oculto debe depender de un atributo que pone el script');
    assert.doesNotMatch(css, /\.reveal\s*\{[^}]*opacity:\s*0/, '.reveal no puede ocultar por sí sola');
    assert.match(reveal, /'pending'/);
});

test('con reducir movimiento no queda nada oculto ni animado', () => {
    const idx = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
    assert.ok(idx >= 0);
    const tail = css.slice(idx);
    assert.match(tail, /\[data-reveal\]/);
    assert.match(tail, /opacity:\s*1\s*!important/);
    assert.match(tail, /animation:\s*none\s*!important/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/storefront && node --test tests/design/motion.test.mjs`
Expected: FAIL (no existe `reveal.tsx`).

- [ ] **Step 3: Crear `Reveal`**

`apps/storefront/src/components/motion/reveal.tsx`:

```tsx
'use client';

import {type CSSProperties, type ReactNode, useEffect, useRef} from 'react';

/**
 * Aparición suave de un bloque al entrar en pantalla. El contenido se pinta visible
 * en el servidor y sin JS: solo cuando el script se ejecuta lo marca como
 * `data-reveal="pending"` (oculto por CSS) y lo pasa a `visible` al entrar en el
 * viewport. Con "reducir movimiento" el CSS lo deja siempre visible.
 */
export function Reveal({
    children,
    className,
    as: Tag = 'div',
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    as?: 'div' | 'section' | 'li';
    delay?: number;
}) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Si ya está en pantalla al montar, no se oculta (evita un parpadeo).
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.dataset.reveal = 'visible';
            return;
        }
        el.dataset.reveal = 'pending';
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.dataset.reveal = 'visible';
                    observer.disconnect();
                }
            },
            {rootMargin: '0px 0px -10% 0px'},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref as never}
            className={['reveal', className].filter(Boolean).join(' ')}
            style={{'--reveal-delay': `${delay}ms`} as CSSProperties}
        >
            {children}
        </Tag>
    );
}
```

- [ ] **Step 4: Utilidades CSS**

Añadir en `globals.css` (antes del bloque final de impresión):

```css
/* --- Movimiento (Fase 1 del rediseño) --- */
/* Reveal: el script pone data-reveal="pending" (oculto) y luego "visible". */
.reveal {
  transition: opacity var(--dur-slow) var(--ease-out) var(--reveal-delay, 0ms),
              transform var(--dur-slow) var(--ease-out) var(--reveal-delay, 0ms);
}
[data-reveal="pending"] { opacity: 0; transform: translateY(16px); }
[data-reveal="visible"] { opacity: 1; transform: none; }

/* Escalonado: cada hijo lleva style="--i: n". */
.stagger > * { animation: fade-up var(--dur-slow) var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms); }

/* Tarjetas y bloques que se elevan al pasar el ratón (solo con puntero fino). */
@media (hover: hover) {
  .hover-lift { transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
  .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgb(0 0 0 / 12%); }
  .img-zoom img { transition: transform var(--dur-slow) var(--ease-out); }
  .img-zoom:hover img { transform: scale(1.06); }
}

/* Respuesta al pulsar. */
.press { transition: transform var(--dur-fast) var(--ease-out); }
.press:active { transform: scale(.97); }

/* Entrada enérgica de titulares (portada y bloques de marca). */
@keyframes hero-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.animate-hero-in { animation: hero-in var(--dur-hero) var(--ease-out) both; animation-delay: var(--reveal-delay, 0ms); }

/* Transiciones entre páginas (React ViewTransition): fundido corto. */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--dur-base); animation-timing-function: var(--ease-out); }
```

Y en el bloque `@media (prefers-reduced-motion: reduce)` final existente, añadir:

```css
  [data-reveal] { opacity: 1 !important; transform: none !important; }
  .stagger > *, .animate-hero-in { animation: none !important; }
  ::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }
```

- [ ] **Step 5: Transición entre páginas**

En `locale-layout.tsx`, importar `import {ViewTransition} from 'react';` y envolver el contenido del `<main>`:

```tsx
<main id="main-content" tabIndex={-1} className="flex-1 pt-[var(--header-offset)] print:pt-0 focus:outline-none">
    {/* Fundido entre páginas en navegadores que lo soportan; ver ::view-transition en globals.css. */}
    <ViewTransition>{children}</ViewTransition>
</main>
```

Si `npx tsc --noEmit` indica que `ViewTransition` no está tipado en `@types/react`, usar `import {unstable_ViewTransition as ViewTransition} from 'react'` solo si existe; si ninguno existe en tiempo de ejecución, eliminar el envoltorio y las reglas `::view-transition` (las transiciones son una mejora opcional) y anotarlo en el commit.

- [ ] **Step 6: Run tests**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit && npx eslint src`
Expected: PASS, sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src/components/motion/reveal.tsx apps/storefront/src/app/[locale]/globals.css apps/storefront/src/site/locale-layout.tsx apps/storefront/tests/design/motion.test.mjs
git commit -m "feat(diseño): primitivas de movimiento accesibles y transición entre páginas"
```

---

### Task 3: Botones con la nueva identidad

**Files:**
- Modify: `apps/storefront/src/components/ui/button.tsx` (`buttonVariants`)
- Test: `apps/storefront/tests/design/button.test.mjs` (nuevo)

**Interfaces:**
- Consumes: tokens de Task 1, clase `.press` de Task 2.
- Produces: `buttonVariants` con las mismas variantes y tamaños que hoy (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`) más la variante nueva `brand` (borde blanco translúcido para usar sobre zona de marca) y el tamaño nuevo `xl` (h-12, para llamadas a la acción principales).

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'components', 'ui', 'button.tsx'), 'utf8');

test('las variantes existentes siguen existiendo (no se rompe ningún uso)', () => {
    for (const v of ['default:', 'outline:', 'secondary:', 'ghost:', 'destructive:', 'link:']) assert.ok(src.includes(v), `falta la variante ${v}`);
    for (const s of ['xs:', 'sm:', 'lg:', 'icon:', '"icon-xs":', '"icon-sm":', '"icon-lg":']) assert.ok(src.includes(s), `falta el tamaño ${s}`);
});

test('nuevas variante brand y tamaño xl, y respuesta al pulsar', () => {
    assert.ok(src.includes('brand:'));
    assert.ok(src.includes('xl:'));
    assert.match(src, /active:scale-\[\.97\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/storefront && node --test tests/design/button.test.mjs` → FAIL (`brand:` no existe).

- [ ] **Step 3: Implementar**

En la cadena base de `cva`, sustituir `active:translate-y-px` por `active:scale-[.97] transition-[transform,background-color,color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]`, y `font-medium` por `font-semibold`. Añadir a `variant`:

```ts
        // Sobre zona de marca (fondos oscuros): borde y texto claros.
        brand: "border-white/30 bg-transparent text-brand-fg hover:bg-white/10",
```

y a `size`:

```ts
        // Llamadas a la acción principales (Comprar ahora, Añadir al carrito, Pagar).
        xl: "h-12 gap-2 px-6 text-sm font-bold uppercase tracking-wider",
```

Cambiar `default` a `"bg-primary-solid text-primary-foreground hover:bg-[#c50009] dark:hover:bg-primary-solid/85"`.

- [ ] **Step 4: Run tests**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit && npx eslint src` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/ui/button.tsx apps/storefront/tests/design/button.test.mjs
git commit -m "feat(diseño): botones con respuesta al pulsar, variante brand y tamaño xl"
```

---

### Task 4: Componentes de marca (cinta, franja, titular de sección, confianza)

**Files:**
- Create: `apps/storefront/src/components/brand/marquee.tsx`
- Create: `apps/storefront/src/components/brand/brand-band.tsx`
- Create: `apps/storefront/src/components/brand/section-header.tsx`
- Create: `apps/storefront/src/components/brand/trust-strip.tsx`
- Modify: `apps/storefront/src/app/[locale]/globals.css` (keyframes `marquee`)
- Modify: `apps/storefront/src/site/navigation/top-bar.tsx` (usar `Marquee`)
- Test: `apps/storefront/tests/design/brand-components.test.mjs` (nuevo)

**Interfaces:**
- Consumes: tokens Task 1; `Reveal`/clases Task 2.
- Produces (todos server components sin estado, reutilizables por `site` y `features`):
  - `Marquee({items: string[], label: string})` — cinta roja; los ítems se duplican para el bucle; con reducir movimiento queda estática.
  - `BrandBand({eyebrow?: ReactNode, title: ReactNode, description?: ReactNode, watermark?: string, children?: ReactNode})` — franja `bg-brand` con título `text-display`.
  - `SectionHeader({title: string, highlight?: string, action?: {href: string; label: string}, tone?: 'content' | 'brand'})` — `highlight` se pinta en rojo (`text-primary-solid` en contenido, `text-primary-text` en marca). El enlace usa `Link` de `@/platform/i18n/navigation`.
  - `TrustStrip({items: Array<{icon: LucideIcon; title: string; text: string}>})` — 2 columnas en móvil, 4 en escritorio.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const dir = path.join(import.meta.dirname, '..', '..', 'src', 'components', 'brand');
const read = f => readFile(path.join(dir, f), 'utf8');

test('existen los componentes de marca y exportan su nombre', async () => {
    for (const [file, name] of [['marquee.tsx', 'Marquee'], ['brand-band.tsx', 'BrandBand'], ['section-header.tsx', 'SectionHeader'], ['trust-strip.tsx', 'TrustStrip']]) {
        assert.match(await read(file), new RegExp(`export function ${name}\\b`), `${file} no exporta ${name}`);
    }
});

test('la cinta es accesible: lista con nombre y copia duplicada oculta a lectores de pantalla', async () => {
    const src = await read('marquee.tsx');
    assert.match(src, /aria-label=\{label\}/);
    assert.match(src, /aria-hidden="true"/);
});

test('los componentes de marca no dependen de site/ ni de features/', async () => {
    for (const f of ['marquee.tsx', 'brand-band.tsx', 'section-header.tsx', 'trust-strip.tsx']) {
        assert.doesNotMatch(await read(f), /from '@\/(site|features)\//, `${f} importa de site/ o features/`);
    }
});
```

- [ ] **Step 2: Run test to verify it fails** — `node --test tests/design/brand-components.test.mjs` → FAIL.

- [ ] **Step 3: Implementar**

`marquee.tsx`:

```tsx
/**
 * Cinta de avisos en movimiento (zona de marca). Los mensajes se repiten dos veces
 * para que el bucle sea continuo; la segunda copia se oculta a los lectores de
 * pantalla. Con "reducir movimiento" se queda quieta (ver .marquee en globals.css).
 */
export function Marquee({items, label}: {items: string[]; label: string}) {
    if (items.length === 0) return null;
    const row = (hidden: boolean) => (
        <ul aria-hidden={hidden ? 'true' : undefined} className="flex shrink-0 items-center gap-10 pr-10">
            {items.map(item => (
                <li key={item} className="flex items-center gap-10 whitespace-nowrap">
                    {item}
                    <span aria-hidden="true" className="opacity-60">✦</span>
                </li>
            ))}
        </ul>
    );
    return (
        <div aria-label={label} role="region" className="marquee overflow-hidden bg-primary-solid text-primary-foreground text-[11px] font-bold uppercase tracking-[.12em]">
            <div className="marquee-track flex w-max">
                {row(false)}
                {row(true)}
            </div>
        </div>
    );
}
```

En `globals.css`:

```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-track { animation: marquee 28s linear infinite; }
.marquee:hover .marquee-track { animation-play-state: paused; }
```

y en el bloque `prefers-reduced-motion: reduce`: `.marquee-track { animation: none !important; }`.

`brand-band.tsx`:

```tsx
import type {ReactNode} from 'react';

/** Franja oscura de marca: cabecera de listados y bloques de marca. */
export function BrandBand({eyebrow, title, description, watermark, children}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    watermark?: string;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden bg-brand text-brand-fg">
            {watermark && (
                <span aria-hidden="true" className="text-display pointer-events-none absolute -top-6 right-4 select-none text-[11rem] text-white/[.04]">
                    {watermark}
                </span>
            )}
            <div className="container relative mx-auto px-4 py-8 md:py-10">
                {eyebrow && <div className="text-xs text-brand-muted">{eyebrow}</div>}
                <h1 className="mt-2 text-5xl md:text-6xl">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-sm text-brand-muted">{description}</p>}
                {children}
            </div>
        </section>
    );
}
```

`section-header.tsx`:

```tsx
import {ArrowRight} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';

/** Titular de sección: palabra destacada en rojo y enlace opcional "Ver todos". */
export function SectionHeader({title, highlight, action, tone = 'content'}: {
    title: string;
    highlight?: string;
    action?: {href: string; label: string};
    tone?: 'content' | 'brand';
}) {
    return (
        <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-4xl md:text-5xl">
                {title}
                {highlight && <> <span className={tone === 'brand' ? 'text-primary-text' : 'text-primary-solid'}>{highlight}</span></>}
            </h2>
            {action && (
                <Link href={action.href} className={`press inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${tone === 'brand' ? 'text-primary-text' : 'text-primary-solid'}`}>
                    {action.label} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
```

`trust-strip.tsx`:

```tsx
import type {LucideIcon} from 'lucide-react';

/** Franja de confianza: envío, pago seguro, devolución, puntos. Textos según idioma desde quien la usa. */
export function TrustStrip({items}: {items: Array<{icon: LucideIcon; title: string; text: string}>}) {
    return (
        <ul className="grid grid-cols-2 border-y border-border bg-background md:grid-cols-4">
            {items.map(({icon: Icon, title, text}) => (
                <li key={title} className="flex items-center gap-3 border-border px-4 py-4 [&:not(:last-child)]:border-r">
                    <Icon className="size-5 shrink-0 text-primary-solid" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground"><b className="block text-sm text-foreground">{title}</b>{text}</span>
                </li>
            ))}
        </ul>
    );
}
```

`top-bar.tsx`: mantener la firma `TopBar()` y su `aside` fijo con altura `--top-bar-h`, pero sustituir el contenido por `<Marquee items={topBarMessages.map(m => m.text[locale])} label={t('announcements')} />`, quitar el `aria-label` del `aside` (lo lleva la cinta) y cambiar el fondo del `aside` a `bg-primary-solid`. Añadir dos mensajes nuevos al final de `top-bar-messages.ts`, solo si son ciertos para la tienda: `{id: 'returns', text: {es: 'Devolución en 14 días', en: '14-day returns'}}` (es el plazo legal de desistimiento ya indicado en la ficha).

- [ ] **Step 4: Run tests** — `node --test tests/design/*.test.mjs tests/architecture/*.test.mjs && npx tsc --noEmit && npx eslint src` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/brand apps/storefront/src/site/navigation/top-bar.tsx apps/storefront/src/site/navigation/top-bar-messages.ts apps/storefront/src/app/[locale]/globals.css apps/storefront/tests/design/brand-components.test.mjs
git commit -m "feat(diseño): cinta de avisos, franja de marca, titulares de sección y franja de confianza"
```

---

### Task 5: Cabecera

**Files:**
- Modify: `apps/storefront/src/site/navigation/navbar.tsx`
- Modify: `apps/storefront/src/site/navigation/navbar/navbar-cart.tsx`
- Modify: `apps/storefront/src/site/navigation/navbar/cart-icon.tsx`
- Modify: `apps/storefront/src/site/navigation/messages/es.json`, `en.json` (clave `cartTotal`)

**Interfaces:**
- Consumes: tokens y `Button` (Tasks 1–3), `Price` de `@/features/pricing/price` (`site` puede importar de `features`).
- Produces: `CartIcon({cartItemCount: number, totalWithTax: number, currencyCode: string})`.

- [ ] **Step 1: Carrito con importe**

`navbar-cart.tsx`: pasar también el importe (sin cambiar la consulta ni la caché):

```tsx
    const order = orderResult.data.activeOrder;
    return (
        <CartIcon
            cartItemCount={order?.totalQuantity || 0}
            totalWithTax={order?.totalWithTax || 0}
            currencyCode={order?.currencyCode || 'EUR'}
        />
    );
```

Si `currencyCode` no está en `GetActiveOrderQuery`, añadirlo a la consulta en `features/cart/graphql.ts` (campo existente de `Order`).

`cart-icon.tsx`:

```tsx
'use client';

import {ShoppingCart} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {Price} from '@/features/pricing/price';

interface CartIconProps {
    cartItemCount: number;
    totalWithTax: number;
    currencyCode: string;
}

/** Carrito de la cabecera: icono, nº de artículos e importe (el importe desde md). */
export function CartIcon({cartItemCount, totalWithTax, currencyCode}: CartIconProps) {
    const t = useTranslations('Navigation');
    return (
        <Link
            href="/carrito"
            className="press relative inline-flex h-9 items-center gap-2 rounded-lg bg-primary-solid px-3 text-sm font-bold text-primary-foreground hover:bg-[#c50009]"
        >
            <ShoppingCart className="size-4" aria-hidden="true" />
            <span className="hidden font-mono md:inline"><Price value={totalWithTax} currencyCode={currencyCode} /></span>
            {cartItemCount > 0 && (
                <span key={cartItemCount} className="animate-pop-in grid size-5 place-items-center rounded-full bg-white text-[11px] text-primary-solid">
                    {cartItemCount}
                </span>
            )}
            <span className="sr-only">{t('cartTotal', {count: cartItemCount})}</span>
        </Link>
    );
}
```

(`key={cartItemCount}` reinicia `animate-pop-in`, que ya existe en `globals.css`, cada vez que cambia el número: el "salto" del carrito.)

Mensajes: añadir `"cartTotal": "Carrito, {count, plural, =0 {vacío} one {# artículo} other {# artículos}}"` a `es.json` y `"cartTotal": "Cart, {count, plural, =0 {empty} one {# item} other {# items}}"` a `en.json` dentro de `Navigation`.

- [ ] **Step 2: Cabecera oscura**

En `navbar.tsx`:
- `header`: `className="fixed print:hidden top-[var(--top-bar-h)] left-0 right-0 z-40 border-b border-brand-line bg-brand text-brand-fg"` (sin `backdrop-blur` ni fondo translúcido: zona de marca opaca).
- Logo: `className="h-7 md:h-8"`.
- Enlaces de colecciones (`NavbarCollections`) y botones fantasma: añadir a sus clases `text-brand-fg/80 hover:text-brand-fg hover:bg-white/10` (en `navbar-link.tsx` y en los `Button variant="ghost"` de la cabecera, vía `className`).
- Buscador: mostrar `SearchInput` desde `lg` en lugar de `2xl` (`hidden lg:flex`) y quitar el botón-icono de búsqueda `lg:flex 2xl:hidden`; el contenedor de colecciones mantiene `min-w-0 overflow-x-auto` para que nada se solape. Dar al `SearchInput` fondo `bg-brand-surface border-white/10 text-brand-fg placeholder:text-brand-muted` (vía prop `className` si existe; si no, añadirla a `site/navigation/search-input.tsx` y pasarla al `Input`).

El desplegable **"Objetivos"** del menú (spec 5.1) NO se hace en esta fase: depende de las colecciones de objetivos (rama `feat/objetivos`, pendiente de integrar) y se añade en el plan de la Fase 2 junto al bloque de objetivos de la portada.

- [ ] **Step 3: Verificar**

Run: `cd apps/storefront && node --test tests && npx tsc --noEmit && npx eslint src` → PASS.
Captura de la cabecera a 1024, 1280 y 1440 px (ver Task 7, procedimiento de verificación visual): nada se solapa en español ni en inglés.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/site/navigation apps/storefront/src/features/cart/graphql.ts
git commit -m "feat(diseño): cabecera oscura con buscador visible y carrito con importe"
```

---

### Task 6: Pie

**Files:**
- Modify: `apps/storefront/src/site/footer.tsx`
- Modify: `apps/storefront/src/site/messages/es.json`, `en.json` (claves `Footer.shop`, `Footer.help`, `Footer.paymentMethods`)

**Interfaces:**
- Consumes: tokens, `Logo` existente, `getTopCollections` existente.
- Produces: nada nuevo para otras tareas.

- [ ] **Step 1: Implementar**

Reestructurar `Footer` (misma caché y mismos datos):
- `footer`: `className="mt-auto print:hidden border-t border-brand-line bg-brand text-brand-muted"`.
- Columna 1: logo `variant="full"` `h-24`, descripción, y fila de medios de pago `["Visa", "Mastercard", "Redsys"]` como pastillas `rounded border border-white/10 bg-brand-surface px-2 py-1 text-[10px] font-bold text-brand-fg` con `aria-label={t('paymentMethods')}` en la lista.
- Columnas 2–4: **Tienda** (`t('shop')`: colecciones + "Ver todo"), **Ayuda** (`t('help')`: pedidos, puntos, cuenta, envíos y devoluciones), **Legal** (enlaces legales actuales + `CookieSettingsLink`). Títulos de columna en `text-display text-lg text-brand-fg`.
- Fila inferior igual que hoy (copyright, aviso de IA, versión).
- Enlaces: `hover:text-brand-fg transition-colors`.

Mensajes nuevos en `Footer`: es `"shop": "Tienda"`, `"help": "Ayuda"`, `"paymentMethods": "Medios de pago aceptados"`; en `"shop": "Shop"`, `"help": "Help"`, `"paymentMethods": "Accepted payment methods"`.

- [ ] **Step 2: Verificar** — `node --test tests && npx tsc --noEmit && npx eslint src` → PASS (incluye que las claves `es`/`en` coinciden).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/site/footer.tsx apps/storefront/src/site/messages
git commit -m "feat(diseño): pie nuevo con columnas Tienda, Ayuda y Legal y medios de pago"
```

---

### Task 7: Verificación visual de la fase y build de producción

**Files:**
- Create (fuera del repo, en el scratchpad de la sesión): `visual-check.mjs`
- Ningún archivo del repo salvo correcciones que salgan de la revisión.

**Procedimiento de verificación visual (reutilizable en las siguientes fases):**
1. Comprobar puertos: `netstat -ano | grep LISTENING | grep -E ":(3000|3001|3200|5173) "`. Los de 3000/3001/5173 son del `npm run dev` del usuario: no tocarlos.
2. Copia temporal: `ironSavage/tmp-fase1/storefront` con todos los archivos de `apps/storefront` salvo `node_modules`, `.next` y `.turbo`, y una unión `node_modules` → `..\..\apps\storefront\node_modules` (`cmd //c "mklink /J node_modules ..\..\apps\storefront\node_modules"`).
3. Arrancar en segundo plano: `VENDURE_SHOP_API_URL=https://api-dev.57-129-168-160.sslip.io/shop-api VENDURE_CHANNEL_TOKEN=__default_channel__ API_DOMAIN=api-dev.57-129-168-160.sslip.io NEXT_PUBLIC_SITE_URL=http://localhost:3200 npx next dev -p 3200`.
4. Capturas con `playwright-core` + Chrome del sistema (reintentar mientras la respuesta no sea 200: la primera carga en Windows puede dar 500 por EPERM del antivirus): portada, `/productos`, `/productos/iso-savage`, `/carrito`, `/login`, `/no-existe`, a 1440×900 y 390×844, con tema claro y oscuro (`localStorage.theme = 'dark'` antes de cargar) y una pasada con `reducedMotion: 'reduce'`. Cabecera además a 1024 y 1280 px, en `/` y `/en`.
5. Revisar las capturas: contraste, nada solapado, ningún bloque invisible con reducir movimiento, precios legibles.
6. Limpieza **siempre**: cerrar el proceso del 3200 subiendo por sus padres hasta la raíz de `npx next dev -p 3200` y `taskkill /T /F`; después `cd tmp-fase1/storefront && cmd //c "rmdir node_modules" && cd ../.. && rm -rf tmp-fase1` (encadenado con `&&` para que nunca se borre con la unión puesta) y comprobar que `apps/storefront/node_modules` sigue completo y que 3200 está libre.

- [ ] **Step 1: Comprobaciones automáticas**

Run: `cd apps/storefront && npm test && npx tsc --noEmit && npx eslint src`
Expected: tests nuevos en verde; fallan solo los 3 tests de `tests/upgrade` que ya fallaban antes (no relacionados).

- [ ] **Step 2: Build de producción en la copia temporal**

En la copia del procedimiento (antes de arrancar el dev o con él parado): `VENDURE_SHOP_API_URL=... API_DOMAIN=... NEXT_PUBLIC_SITE_URL=http://localhost:3200 NEXT_PUBLIC_DEPLOY_ENV=development npx next build` → `✓ Compiled successfully`, exit 0.

- [ ] **Step 3: Verificación visual** (procedimiento 1–6) y corrección de lo que salga, con commit por corrección.

- [ ] **Step 4: Informe al usuario** con las capturas más representativas y la lista de pantallas que aún no están rediseñadas (heredan tokens y tipografía, se rehacen en las fases 2–6).
