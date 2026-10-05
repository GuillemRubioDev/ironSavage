# Rediseño · Fase 4B: checkout y confirmación · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el diseño del spec 5.5 al checkout y a la confirmación:
- **checkout:**
  - barra de pasos también en móvil, con los pasos Dirección → Envío → Pago → Confirmación;
  - paneles ya completados con un resumen de lo elegido y "Cambiar";
  - botón "Pagar X € de forma segura";
  - resumen oscuro como el del carrito;
- **confirmación:** bloque oscuro con check animado, confeti rojo breve, puntos que suma el pedido y tres tarjetas (qué pasa ahora, factura, tu cuenta).

**Architecture:** El flujo del checkout no cambia: mismos pasos, validaciones, acciones y Redsys. Solo cambian la presentación y los textos. El resumen de cada panel completado sale de un módulo puro (`step-summary.ts`) que se prueba de verdad con `node --test`. La confirmación sigue siendo un componente de servidor: se rehace su parte visual y se añade la configuración de puntos (con `.catch(() => null)`). La animación del check y el confeti son solo CSS, con keyframes nuevos en `globals.css`, y se anulan con "reducir movimiento".

**Tech Stack:** Next.js 16.3, React 19.3, Tailwind 4, Base UI (Accordion), next-intl y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (5.5: checkout y confirmación).

## Global Constraints

- No se cambia la lógica de negocio: mismos pasos, validaciones, acciones (`placeOrder`, `getRedsysPaymentForm`), aceptación de condiciones (LSSI-CE art. 27 / TRLGDCU art. 98) y confirmación de Redsys de `order-confirmation.tsx`, que se conserva sin tocar.
- Los puntos de la confirmación son una estimación con la fórmula del servidor (`floor(totalWithTax/100 × puntosPorEuro)`). Se dicen como "sumas X puntos" solo con el pago confirmado, y si falla la configuración no se muestran.
- Sin librerías nuevas: el confeti es CSS. Movimiento solo con `transform`/`opacity`, anulado con `prefers-reduced-motion`.
- Textos en `es` y `en` con las mismas claves; cada feature usa sus namespaces (`Checkout` y `OrderConfirmation`).
- Comentarios en español. Nunca se dejan servidores de prueba arrancados.

## Review Focus

- **Pago pendiente (vuelta de Redsys antes de la notificación):** sin confeti ni "pedido confirmado"; se mantiene el refresco automático actual (test de la Task 3).
- **Pedido cancelado:** ni confeti ni puntos (test de la Task 3).
- **Reducir movimiento:** sin confeti y con el check ya dibujado (test de la Task 3, sobre el CSS).
- **Panel completado sin datos** (p. ej. sin método de pago elegido): sin resumen vacío ni "undefined" (tests de `stepSummary`, Task 1).
- **Botón de pagar desactivado:** las mismas condiciones que hoy (condiciones aceptadas, dirección, envío y pago); solo cambia el texto (test de la Task 1).

---

### Task 1: Pasos con resumen y "Cambiar", barra en móvil y botón de pagar

**Files:**
- Create: `apps/storefront/src/features/checkout/step-summary.ts`
- Modify: `apps/storefront/src/features/checkout/routes/checkout-flow.tsx`, `steps/review-step.tsx`, `messages/{es,en}.json`
- Test: `apps/storefront/tests/design/checkout.test.mjs` (nuevo)

**Interfaces:**
- Produces: `stepSummary(step, data) → string | null`, con
  - `step`: `'contact' | 'shipping' | 'delivery' | 'payment' | 'review'`;
  - `data`: `{email?, address?: {streetLine1?, city?, postalCode?} | null, shippingMethodName?, paymentMethodName?}`.

- [ ] **Step 1: Escribir los tests que fallan**

<!-- archivo: apps/storefront/tests/design/checkout.test.mjs -->
```js
// Fase 4B del rediseño: checkout y confirmación.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('resumen de cada paso completado, sin textos vacíos', async () => {
    const {stepSummary} = await load('features/checkout/step-summary.ts');
    assert.equal(stepSummary('shipping', {address: {streetLine1: 'Calle Mayor 1', city: 'Madrid', postalCode: '28001'}}), 'Calle Mayor 1, 28001 Madrid');
    assert.equal(stepSummary('shipping', {address: {streetLine1: 'Calle Mayor 1'}}), 'Calle Mayor 1');
    assert.equal(stepSummary('shipping', {address: null}), null);
    assert.equal(stepSummary('delivery', {shippingMethodName: 'Envío estándar'}), 'Envío estándar');
    assert.equal(stepSummary('payment', {}), null);
    assert.equal(stepSummary('contact', {email: 'a@b.es'}), 'a@b.es');
    assert.equal(stepSummary('review', {email: 'a@b.es'}), null);
});

test('los paneles completados muestran su resumen y "Cambiar"; la barra de pasos también en móvil', async () => {
    const flow = await read('features/checkout/routes/checkout-flow.tsx');
    assert.match(flow, /stepSummary\(/);
    assert.match(flow, /t\('change'\)/);
    assert.match(flow, /t\('stepOf', \{current: /);
    assert.doesNotMatch(flow, /className="mb-8 hidden sm:block"/);
});

test('el botón de pagar dice el importe y conserva las mismas condiciones', async () => {
    const review = await read('features/checkout/routes/steps/review-step.tsx');
    assert.match(review, /t\('payAmount', \{amount: /);
    assert.match(review, /disabled=\{loading \|\| !termsAccepted \|\| !order\.shippingAddress \|\| !order\.shippingLines\?\.length \|\| !selectedPaymentMethodCode\}/);
    for (const loc of ['es', 'en']) {
        const c = (await json(`features/checkout/messages/${loc}.json`)).Checkout;
        for (const k of ['change', 'payAmount', 'stepOf']) assert.ok(c[k], `${loc}: falta Checkout.${k}`);
        assert.equal(c.steps.review, loc === 'es' ? 'Confirmación' : 'Confirm');
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/checkout.test.mjs`
Expected: FAIL en los 3 tests.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/checkout/step-summary.ts -->
```ts
/**
 * Resumen de una línea de cada paso ya completado del checkout ("Calle Mayor 1, 28001
 * Madrid", "Envío estándar"…), que se ve en el panel plegado junto a "Cambiar". Sin
 * dependencias: se prueba con node --test. Sin datos devuelve null (nunca un texto vacío).
 */
export type CheckoutStepId = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review';

export function stepSummary(step: CheckoutStepId, data: {
    email?: string | null;
    address?: {streetLine1?: string | null; city?: string | null; postalCode?: string | null} | null;
    shippingMethodName?: string | null;
    paymentMethodName?: string | null;
}): string | null {
    switch (step) {
        case 'contact':
            return data.email || null;
        case 'shipping': {
            const street = data.address?.streetLine1;
            if (!street) return null;
            const place = [data.address?.postalCode, data.address?.city].filter(Boolean).join(' ');
            return place ? `${street}, ${place}` : street;
        }
        case 'delivery':
            return data.shippingMethodName || null;
        case 'payment':
            return data.paymentMethodName || null;
        default:
            return null;
    }
}
```

En `checkout-flow.tsx`:
- importar `stepSummary` de `@/features/checkout/step-summary`;
- calcular:
  ```ts
  const summaryData = {
      email: order.customer?.emailAddress,
      address: order.shippingAddress,
      shippingMethodName: order.shippingLines?.[0]?.shippingMethod.name,
      paymentMethodName: paymentMethods.find((m) => m.code === selectedPaymentMethodCode)?.name,
  };
  ```
  (`paymentMethods` y `selectedPaymentMethodCode` salen de `useCheckout()`);
- en cada `AccordionTrigger` de un paso completado y no actual, tras el título, añadir:
  ```tsx
  {completedSteps.has(step) && currentStep !== step && (
      <span className="ml-auto flex min-w-0 items-center gap-3 pr-2 text-sm font-normal">
          {summary && <span className="truncate text-muted-foreground">{summary}</span>}
          <span className="shrink-0 font-semibold text-primary">{t('change')}</span>
      </span>
  )}
  ```
  con `const summary = stepSummary(step, summaryData);`. Para no repetirlo cinco veces se extrae un componente local `StepTitle({step, label})` que pinta el círculo numerado (con el mismo marcado de hoy), el título y este resumen, y se usa en los cinco `AccordionTrigger`. El trigger gana `className="w-full …"`, para que el resumen pueda ir a la derecha.
- La barra de pasos deja de ser `hidden sm:block`:
  - en móvil (`sm:hidden`): `<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('stepOf', {current: stepOrder.indexOf(currentStep) + 1, total: stepOrder.length})} · {stepLabels[currentStep]}</p>` y una barra de progreso `<div className="h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary-solid transition-[width] duration-[var(--dur-slow)]" style={{width: `${((stepOrder.indexOf(currentStep) + 1) / stepOrder.length) * 100}%`}} /></div>`;
  - en escritorio (`hidden sm:flex`), los círculos de hoy.

En `review-step.tsx`:
- `import {useFormatter} from 'next-intl'` y `const format = useFormatter();`;
- el botón muestra `<Lock aria-hidden="true" />` (si no hay carga) y `t('payAmount', {amount: format.number(order.totalWithTax / 100, {style: 'currency', currency: order.currencyCode})})` en lugar de `t('placeOrder')`. El `disabled` no cambia; el botón gana `size="xl"`.

Mensajes `Checkout`:
- `steps.review`: "Confirmación" / "Confirm"
- `change`: "Cambiar" / "Change"
- `payAmount`: "Pagar {amount} de forma segura" / "Pay {amount} securely"
- `stepOf`: "Paso {current} de {total}" / "Step {current} of {total}"

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/checkout.test.mjs && npx tsc --noEmit -p . && npx eslint src/features/checkout`
Expected: PASS y limpio.

- [ ] **Step 5: Commit** — `feat(checkout): pasos con resumen y "Cambiar", barra en móvil y botón de pagar con el importe`

---

### Task 2: Resumen oscuro del checkout

**Files:**
- Modify: `apps/storefront/src/features/checkout/routes/order-summary.tsx`, `apps/storefront/src/features/checkout/routes/page.tsx`
- Test: `apps/storefront/tests/design/checkout.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('resumen del checkout en zona de marca, legible en oscuro, y título grande', async () => {
    const summary = await read('features/checkout/routes/order-summary.tsx');
    assert.match(summary, /bg-brand/);
    assert.doesNotMatch(summary, /text-muted-foreground/);
    assert.match(summary, /text-brand-muted/);
    assert.match(await read('features/checkout/routes/page.tsx'), /<h1 className="mb-8 text-5xl md:text-6xl">/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/checkout.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En `order-summary.tsx` (checkout):
- Las dos `Card` (la plegable de móvil y la fija de escritorio) pasan a `className="border-0 bg-brand text-brand-fg"`; la de escritorio, además, `lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]` en lugar de `sticky top-24`.
- Dentro del componente, `text-muted-foreground` pasa a `text-brand-muted` (todas las apariciones), `text-primary` a `text-primary-text` y `Separator` gana `className="bg-brand-line"`.
- Los huecos de imagen (`bg-muted`) pasan a `bg-brand-surface`.
- El total pasa a `font-mono text-2xl`.

En `page.tsx` (checkout), el `h1` pasa a `<h1 className="mb-8 text-5xl md:text-6xl">{t('pageTitle')}</h1>`.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/checkout.test.mjs && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(checkout): resumen oscuro como el del carrito`

---

### Task 3: Confirmación con check animado, confeti, puntos y tres tarjetas

**Files:**
- Modify: `apps/storefront/src/features/orders/routes/order-confirmation.tsx` (solo la parte visual; la confirmación de Redsys y la consulta no cambian)
- Modify: `apps/storefront/src/app/[locale]/globals.css` (keyframes `check-draw` y `confetti-fall`, más la anulación con movimiento reducido)
- Modify: `apps/storefront/src/features/orders/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/checkout.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('confirmación: bloque oscuro, confeti solo con el pago confirmado, puntos y tres tarjetas', async () => {
    const page = await read('features/orders/routes/order-confirmation.tsx');
    assert.match(page, /bg-brand/);
    assert.match(page, /const celebrate = !paymentPending && order\.state !== 'Cancelled'/);
    assert.match(page, /\{celebrate && <Confetti \/>\}/);
    assert.match(page, /getLoyaltyProgramConfig\(\)\.catch\(\(\) => null\)/);
    assert.match(page, /Math\.floor\(\(order\.totalWithTax \/ 100\) \* loyalty\.pointsPerEuro\)/);
    for (const k of ['nextTitle', 'invoiceTitle', 'accountTitle']) assert.match(page, new RegExp(`t\\('${k}'\\)`));
    // Se conserva la confirmación de Redsys y el refresco mientras el pago está pendiente.
    assert.match(page, /ConfirmRedsysPaymentMutation/);
    assert.match(page, /httpEquiv="refresh"/);
    for (const loc of ['es', 'en']) {
        const o = (await json(`features/orders/messages/${loc}.json`)).OrderConfirmation;
        for (const k of ['nextTitle', 'nextText', 'invoiceTitle', 'invoiceText', 'accountTitle', 'accountText', 'pointsEarned', 'viewOrder']) assert.ok(o[k], `${loc}: falta ${k}`);
    }
});

test('check animado y confeti en CSS, anulados con reducir movimiento', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes check-draw/);
    assert.match(css, /@keyframes confetti-fall/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.confetti \{ display: none !important; \}/);
    assert.match(tail, /\.animate-check-draw/);
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/checkout.test.mjs`
Expected: FAIL en los 2 tests nuevos.

- [ ] **Step 3: Implementar**

En `globals.css`, tras `.animate-hero-zoom`:

```css
/* Confirmación de pedido (features/orders): check que se dibuja y confeti rojo breve. */
@keyframes check-draw { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }
.animate-check-draw { stroke-dasharray: 48; animation: check-draw var(--dur-slow) var(--ease-out) 200ms both; }
@keyframes confetti-fall {
  0% { opacity: 1; transform: translate3d(0, -20px, 0) rotate(0deg); }
  100% { opacity: 0; transform: translate3d(var(--dx, 0), 260px, 0) rotate(var(--rot, 360deg)); }
}
.confetti > span { position: absolute; top: 0; width: 8px; height: 14px; border-radius: 2px; animation: confetti-fall 1.4s var(--ease-out) both; animation-delay: var(--delay, 0ms); }
```

En el último bloque `prefers-reduced-motion`, añadir `.confetti { display: none !important; }` y `.animate-check-draw` a la lista de `animation: none !important;` (el trazo queda entero porque sin animación `stroke-dashoffset` es 0).

En `order-confirmation.tsx`:
- importar `getLoyaltyProgramConfig` de `@/features/loyalty/program-config` y los iconos `Package`, `FileText` y `UserRound`;
- tras obtener `order`:
  ```ts
  const celebrate = !paymentPending && order.state !== 'Cancelled';
  const loyalty = celebrate ? await getLoyaltyProgramConfig().catch(() => null) : null;
  const points = loyalty ? Math.floor((order.totalWithTax / 100) * loyalty.pointsPerEuro) : 0;
  ```
- un componente local `Confetti` (servidor, decorativo):
  ```tsx
  /** Confeti rojo y blanco una sola vez (solo CSS; con "reducir movimiento" no aparece). */
  function Confetti() {
      const pieces = Array.from({length: 18}, (_, i) => i);
      return (
          <div aria-hidden="true" className="confetti pointer-events-none absolute inset-x-0 top-0 h-0">
              {pieces.map((i) => (
                  <span
                      key={i}
                      className={i % 3 === 0 ? 'bg-white' : 'bg-primary-solid'}
                      style={{left: `${5 + ((i * 53) % 90)}%`, '--dx': `${((i * 37) % 80) - 40}px`, '--rot': `${180 + ((i * 61) % 360)}deg`, '--delay': `${(i * 45) % 400}ms`} as React.CSSProperties}
                  />
              ))}
          </div>
      );
  }
  ```
  (`import type {CSSProperties} from 'react'` y usar `as CSSProperties`);
- la cabecera centrada de hoy se sustituye por un bloque de marca:
  ```tsx
  <section className="relative mb-8 overflow-hidden rounded-xl bg-brand px-6 py-12 text-center text-brand-fg">
      {celebrate && <Confetti />}
      <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-primary-solid">
          {paymentPending ? (
              <Loader2 className="size-10 animate-spin" strokeWidth={3} aria-hidden="true" />
          ) : (
              <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path className="animate-check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
          )}
      </div>
      <h1 className="text-5xl md:text-6xl">{paymentPending ? t('confirmingPayment') : t('orderConfirmed')}</h1>
      <p className="mt-3 text-brand-muted">
          {paymentPending ? t('confirmingPaymentMessage') : t('thankYou')}{' '}
          <span className="font-mono font-semibold text-brand-fg">{order.code}</span>
      </p>
      {celebrate && points > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-line px-4 py-1.5 text-sm">
              <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
              {t('pointsEarned', {points})}
          </p>
      )}
  </section>
  ```
- con `celebrate`, tras el bloque, tres tarjetas en `grid gap-4 sm:grid-cols-3 mb-8`. Cada una es `rounded-lg border border-border p-5` con un icono `text-primary-solid`, el título `font-display text-xl font-extrabold uppercase italic` y el texto `text-sm text-muted-foreground`:
  1. **Qué pasa ahora:** `Package`, `t('nextTitle')`, `t('nextText')`;
  2. **Factura:** `FileText`, `t('invoiceTitle')`, `t('invoiceText')` y un enlace `t('viewOrder')` a `/mi-cuenta/pedidos/${order.code}`;
  3. **Tu cuenta:** `UserRound`, `t('accountTitle')`, `t('accountText')` y un enlace a `/mi-cuenta/puntos`;
- el resto (`Card` de líneas, dirección y botones) se queda. El botón "Seguir comprando" pasa a enlazar a `/productos`. Se quita el párrafo `emailConfirmation` de la cabecera, porque lo cubre la tarjeta "Qué pasa ahora"; la clave se deja.

Mensajes `OrderConfirmation`:
- `pointsEarned`: "Con este pedido sumas {points} puntos Iron Rewards" / "This order earns you {points} Iron Rewards points"
- `nextTitle`: "Qué pasa ahora" / "What happens next"
- `nextText`: "Preparamos tu pedido y te enviaremos un correo con los detalles y el seguimiento del envío." / "We'll pack your order and email you the details and shipping tracking."
- `invoiceTitle`: "Factura" / "Invoice"
- `invoiceText`: "La factura estará disponible en el detalle del pedido, en tu cuenta." / "Your invoice will be available in the order details in your account."
- `viewOrder`: "Ver pedido" / "View order"
- `accountTitle`: "Tu cuenta" / "Your account"
- `accountText`: "Consulta tus pedidos y tus puntos cuando quieras." / "Check your orders and points any time."

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de upgrade; limpio.

- [ ] **Step 5: Commit** — `feat(confirmación): bloque oscuro con check animado, confeti, puntos y tres tarjetas`

---

### Task 4: Verificación

- [ ] **Step 1:** `npm test`, `tsc` y `eslint`.
- [ ] **Step 2:** `next build` en la copia `tmp-fase4b` (unión de `node_modules`) y `next start -p 3200`.
- [ ] **Step 3:** El checkout exige sesión y la confirmación necesita un pedido del propio cliente; en esta sesión no hay credenciales de cliente de prueba. Se comprueba en el navegador que `/checkout` sin sesión manda al acceso (igual que hoy) y que `/order-confirmation/NOEXISTE` da 404. El recorrido completo (pasos, "Cambiar", pagar con Redsys de pruebas y confirmación con confeti) queda como comprobación manual del usuario en develop, y se dice así.
- [ ] **Step 4:** Limpieza: solo el árbol del puerto 3200; quitar la unión con `rmdir` desde dentro de la copia; borrar la copia; comprobar `node_modules`.
