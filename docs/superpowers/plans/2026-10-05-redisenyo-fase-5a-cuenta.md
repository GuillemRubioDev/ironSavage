# Rediseño · Fase 5A: pendientes de la fase 4 y cuenta · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- cerrar los detalles menores de las revisiones finales de las fases 4A y 4B;
- rehacer la cuenta:
  - barra lateral oscura con inicial, secciones, Atleta solo para atletas y cerrar sesión;
  - nueva página de resumen `/mi-cuenta`: saludo, Iron Rewards con barra, último pedido, accesos rápidos y pedidos recientes;
  - "Repetir último pedido";
  - el resto de páginas de la cuenta con títulos al estilo nuevo.

**Architecture:** La fase 5 se parte en 5A (este plan) y 5B (acceso con imagen configurable, que toca el servidor). "Repetir último pedido" es una acción de servidor de la feature de cuenta. Busca el último pedido pagado del cliente y añade sus líneas, una a una, con la acción `addToCart` existente; omite e informa de las que no se pueden añadir. Las reglas puras (estados pagados y progreso de puntos) van en `account-summary.ts`, probado con `node --test`. El resumen es una página de servidor que lee cliente, puntos y pedidos con las consultas que ya hay.

**Tech Stack:** Next.js 16.3, React 19.3, Tailwind 4, next-intl, Base UI y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (5.6 cuenta y 7.4/7.6). Pendientes: informes de revisión final de las fases 4A y 4B.

## Global Constraints

- No se cambia la lógica de negocio. "Repetir último pedido" **solo copia productos y cantidades al carrito** con `addToCart`. A partir de ahí es una compra nueva normal, con los precios y promociones vigentes; el pedido anterior no se toca.
- Solo cuentan pedidos ya pagados (se excluyen el carrito en curso, los pagos pendientes y los cancelados). Sin pedidos pagados, el acceso rápido no aparece.
- Las páginas de la cuenta mantienen su funcionalidad: solo cambian la barra lateral y los títulos.
- Sin librerías nuevas. Textos en `es` y `en`; `Account` es un namespace compartido y `Common` es de plataforma, así que lo pueden usar los componentes base.
- Comentarios en español. Nunca se dejan servidores de prueba arrancados.

## Review Focus

- **Último pedido con productos agotados o desactivados:** se añaden los demás y se avisa de los omitidos. Si no se añade ninguno, un error claro y no se va al carrito vacío (test de la Task 3).
- **Cliente sin pedidos pagados:** ni acceso rápido ni tarjeta de último pedido vacía; en su lugar, "Empezar a comprar" (test de la Task 4).
- **Saldo por debajo del mínimo canjeable:** la barra muestra cuánto falta. Con saldo suficiente, cuánto puede canjear, con el tope por pedido (tests de `loyaltyProgress`, Task 3).
- **Atleta:** la sección Atleta solo aparece para atletas, como hoy (test de la Task 2).
- **Enlace activo en la barra lateral:** "Resumen" solo está activo en `/mi-cuenta` exacto, no en todas las subpáginas (test de la Task 2).

---

### Task 1: Pendientes de la fase 4

**Files (Modify):**
- `app/[locale]/globals.css`
- `features/cart/routes/order-summary.tsx` y `cart.tsx`
- `features/products/components/product-info.tsx` y `product-gallery.tsx`
- `features/orders/routes/order-confirmation.tsx` y `messages/{es,en}.json`
- `components/ui/sheet.tsx` y `dialog.tsx`, `platform/i18n/messages/{es,en}.json`
- `features/loyalty/points-redemption.tsx` y `messages/{es,en}.json`
- `features/cart/cart-drawer.tsx`
- `features/checkout/routes/checkout-flow.tsx`, `order-summary.tsx` y `steps/review-step.tsx`, `features/checkout/messages/{es,en}.json`

Todas cuelgan de `apps/storefront/src`.

**Test:** `apps/storefront/tests/design/pending-fixes-4.test.mjs` (nuevo).

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/pending-fixes-4.test.mjs -->
```js
// Detalles menores de las revisiones finales de las fases 4A y 4B, cerrados en la fase 5A.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));

test('las barras fijas de móvil no tapan el final del pie', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /body:has\(\[data-mobile-bar\]\)/);
    assert.match(await read('features/cart/routes/order-summary.tsx'), /data-mobile-bar/);
    assert.match(await read('features/products/components/product-info.tsx'), /data-mobile-bar/);
});

test('confirmación: check que se dibuja entero y enlace "Ver mis puntos"', async () => {
    const page = await read('features/orders/routes/order-confirmation.tsx');
    assert.match(page, /pathLength="1"/);
    assert.match(page, /t\('viewPoints'\)/);
    assert.match(await read('app/[locale]/globals.css'), /stroke-dasharray: 1;/);
});

test('botón de cerrar traducido en paneles y diálogos', async () => {
    for (const f of ['components/ui/sheet.tsx', 'components/ui/dialog.tsx']) {
        const s = await read(f);
        assert.doesNotMatch(s, />Close</, f);
        assert.match(s, /useTranslations\('Common'\)/, f);
    }
    for (const loc of ['es', 'en']) assert.ok((await json(`platform/i18n/messages/${loc}.json`)).Common.close);
});

test('canje: mensaje distinto si el mínimo falla por el pedido; acciones a prueba de fallos de red', async () => {
    assert.match(await read('features/loyalty/points-redemption.tsx'), /t\('orderTooSmall'/);
    assert.match(await read('features/loyalty/points-redemption.tsx'), /catch/);
    assert.match(await read('features/cart/cart-drawer.tsx'), /catch \{\s*setData\(null\)/);
    for (const loc of ['es', 'en']) assert.ok((await json(`features/loyalty/messages/${loc}.json`)).Loyalty.redeem.orderTooSmall);
});

test('carrito sin consulta de puntos para invitados', async () => {
    assert.match(await read('features/cart/routes/cart.tsx'), /getAuthToken\(\)/);
});

test('checkout: barra de progreso oculta a lectores, resumen sin anillo, importe con el mismo formato que Price y paneles con nombre limpio', async () => {
    const flow = await read('features/checkout/routes/checkout-flow.tsx');
    assert.match(flow, /<div aria-hidden="true" className="h-1 rounded-full bg-muted">/);
    assert.match(flow, /<span aria-hidden="true" className="ml-auto/);
    assert.match(await read('features/checkout/routes/order-summary.tsx'), /ring-0/);
    assert.match(await read('features/checkout/routes/steps/review-step.tsx'), /toIntlLocale\(/);
});

test('galería: ir a la foto actual no deja el carrusel bloqueado; claves sin uso fuera', async () => {
    assert.match(await read('features/products/components/product-gallery.tsx'), /if \(index === current\) return;/);
    for (const loc of ['es', 'en']) {
        assert.equal((await json(`features/checkout/messages/${loc}.json`)).Checkout.placeOrder, undefined);
        assert.equal((await json(`features/orders/messages/${loc}.json`)).OrderConfirmation.emailConfirmation, undefined);
    }
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/pending-fixes-4.test.mjs`
Expected: FAIL en los 7 tests.

- [ ] **Step 3: Implementar**

1. **Barras fijas de móvil.**
   - En `globals.css`, junto a las utilidades de movimiento:
     ```css
     /* Las barras fijas de móvil (carrito, ficha) no tapan el final del pie. */
     @media (max-width: 1023px) { body:has([data-mobile-bar]) { padding-bottom: 5rem; } }
     ```
   - La barra fija de `order-summary.tsx` (carrito) y la de `product-info.tsx` ganan `data-mobile-bar`.
2. **Check entero.**
   - En `order-confirmation.tsx`, el `<path>` del check gana `pathLength="1"`.
   - En `globals.css`, `check-draw` pasa a `from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; }` y `.animate-check-draw` a `stroke-dasharray: 1;`.
3. **Enlace "Ver mis puntos".** En la tarjeta "Tu cuenta" de la confirmación, el enlace usa `t('viewPoints')`. Mensaje `OrderConfirmation.viewPoints`: "Ver mis puntos" / "View my points".
4. **"Close" traducido.**
   - En `sheet.tsx` y `dialog.tsx` (los dos son `"use client"`), `const tCommon = useTranslations('Common');` en el componente que pinta el botón, y `{tCommon('close')}` en lugar de `Close`, tanto en el `sr-only` como en el pie del diálogo.
   - Mensaje `Common.close`: "Cerrar" / "Close".
5. **Mínimo del canje por pedido pequeño.**
   - `PointsRedemption` recibe `orderTooSmall: boolean`. En `cart.tsx` vale `true` cuando el saldo llega al mínimo pero el máximo calculado no.
   - En ese caso se muestra `t('orderTooSmall', {min: minPoints})`.
   - Mensaje `Loyalty.redeem.orderTooSmall`: "El pedido aún es pequeño para canjear {min} puntos." / "Your order is still too small to redeem {min} points."
6. **Acciones a prueba de fallos de red.**
   - En `points-redemption.tsx`, cada `await` de una acción va en `try { … } catch { toast.error(t('errors.generic')); }`.
   - En `cart-drawer.tsx`: `startLoading(async () => { try { setData(await getCartDrawerData(productSlug)); } catch { setData(null); } });`.
7. **Invitados sin consulta de puntos.** En `cart.tsx`, `const token = await getAuthToken();` (de `@/platform/vendure/auth-token`) y la consulta de puntos solo se lanza si hay token (`token ? query(…).catch(() => null) : null`).
8. **Checkout:**
   - en `checkout-flow.tsx`, la barra de progreso de móvil gana `aria-hidden="true"`;
   - el bloque del resumen y "Cambiar" de `stepTitle` pasa a `<span aria-hidden="true" className="ml-auto …">`, con un `<span className="sr-only">{t('change')}</span>` justo antes, para que el nombre accesible sea "Dirección de envío, Cambiar" sin la dirección entera;
   - en `order-summary.tsx` (checkout), las dos `Card` ganan `ring-0`;
   - en `review-step.tsx`, el importe se formatea como `Price`: `new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: order.currencyCode}).format(order.totalWithTax / 100)`, con `const locale = useLocale();` de `next-intl` y `toIntlLocale` de `@/platform/i18n/locale-utils`. Se quita `useFormatter` si queda sin uso.
9. **Galería.** En `product-gallery.tsx`, `goTo` empieza con `if (index === current) return;`.
10. **Indentación.** En `product-info.tsx`, `{option.name}` vuelve a su sangría.
11. **Claves sin uso.** Quitar `Checkout.placeOrder` y `OrderConfirmation.emailConfirmation` (es y en), tras comprobar con `grep -rn` que nadie las usa.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS y limpio. Si un test anterior comprobaba algo que aquí cambia a propósito, se actualiza con un ruling.

- [ ] **Step 5: Commit** — `fix(rediseño): pendientes menores del carrito, el checkout y la confirmación`

---

### Task 2: Barra lateral oscura y títulos de la cuenta

**Files:**
- Modify: `apps/storefront/src/features/account/components/account-nav.tsx`, `account-nav-links.tsx`
- Modify: `apps/storefront/src/features/account/routes/layout.tsx`
- Modify: los `h1` de `features/account/routes/{orders/page.tsx,orders/[code]/order-detail.tsx,addresses/page.tsx,profile/page.tsx}`, `features/loyalty/routes/{page.tsx,athlete/page.tsx}` y `features/invoices/routes/page.tsx`
- Modify: `apps/storefront/src/site/navigation/navbar/navbar-user.tsx`, `mobile-account-links.tsx`
- Modify: `apps/storefront/src/features/account/messages/{es,en}.json`, `site/navigation/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/account.test.mjs` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/account.test.mjs -->
```js
// Fase 5A del rediseño: cuenta.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('barra lateral oscura con inicial, Resumen exacto, Atleta solo para atletas y cerrar sesión', async () => {
    const nav = await read('features/account/components/account-nav.tsx');
    assert.match(nav, /href: '\/mi-cuenta', labelKey: 'summary', icon: 'LayoutDashboard', exact: true/);
    assert.match(nav, /athleteProfile \?/);
    assert.match(nav, /getActiveCustomer\(\)/);
    const links = await read('features/account/components/account-nav-links.tsx');
    assert.match(links, /item\.exact \? pathname === item\.href : pathname\.startsWith\(item\.href\)/);
    assert.match(links, /bg-brand/);
    assert.match(links, /logoutAction/);
    assert.match(links, /initial/);
});

test('títulos de la cuenta al estilo nuevo y "Mi cuenta" en la cabecera', async () => {
    for (const f of ['features/account/routes/orders/page.tsx', 'features/account/routes/addresses/page.tsx', 'features/account/routes/profile/page.tsx', 'features/loyalty/routes/page.tsx', 'features/invoices/routes/page.tsx']) {
        assert.match(await read(f), /<h1 className="[^"]*text-5xl/, f);
    }
    assert.match(await read('site/navigation/navbar/navbar-user.tsx'), /href="\/mi-cuenta"/);
    assert.match(await read('site/navigation/navbar/mobile-account-links.tsx'), /href="\/mi-cuenta"/);
    for (const loc of ['es', 'en']) {
        const a = (await json(`features/account/messages/${loc}.json`)).Account;
        assert.ok(a.summary && a.logout, `${loc}: faltan Account.summary/logout`);
    }
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/account.test.mjs`
Expected: FAIL en los 2 tests.

- [ ] **Step 3: Implementar**

`account-nav.tsx`:
```tsx
import {AccountNavLinks} from '@/features/account/components/account-nav-links';
import {getActiveCustomer} from '@/features/account/customer';
import {getMyAthleteProfile} from '@/features/loyalty/athlete';

const navItems = [
    {href: '/mi-cuenta', labelKey: 'summary', icon: 'LayoutDashboard', exact: true},
    {href: '/mi-cuenta/pedidos', labelKey: 'orders', icon: 'Package'},
    {href: '/mi-cuenta/facturas', labelKey: 'invoices', icon: 'FileText'},
    {href: '/mi-cuenta/puntos', labelKey: 'points', icon: 'Star'},
    {href: '/mi-cuenta/addresses', labelKey: 'addresses', icon: 'MapPin'},
    {href: '/mi-cuenta/profile', labelKey: 'profile', icon: 'User'},
];

const athleteItem = {href: '/mi-cuenta/atleta', labelKey: 'athlete', icon: 'Trophy'};

/**
 * Lee la sesión (inicial del cliente; sección de atleta solo para atletas), así que
 * debe renderizarse dentro de un <Suspense> para que el layout se pueda prerenderizar.
 */
export async function AccountNav({layout}: {layout: 'horizontal' | 'vertical'}) {
    const [athleteProfile, customer] = await Promise.all([getMyAthleteProfile(), getActiveCustomer()]);
    const items = athleteProfile ? [...navItems.slice(0, 4), athleteItem, ...navItems.slice(4)] : navItems;
    const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');
    return <AccountNavLinks items={items} layout={layout} name={name} initial={(customer?.firstName || customer?.emailAddress || '?').charAt(0).toUpperCase()} />;
}
```
(Comprobar con `cat features/account/customer.ts` que `getActiveCustomer()` devuelve `firstName`, `lastName` y `emailAddress`; viene del fragmento `ActiveCustomer`.)

`account-nav-links.tsx`:
- `NavItem` gana `exact?: boolean`; props `name: string` e `initial: string`.
- Iconos: añadir `LayoutDashboard` y `LogOut`.
- `const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);` en los dos diseños.
- **Horizontal (móvil):** igual que hoy, más "Resumen".
- **Vertical:** `<div className="overflow-hidden rounded-lg bg-brand text-brand-fg">` con:
  - cabecera `flex items-center gap-3 border-b border-brand-line p-4`: círculo `grid size-11 place-items-center rounded-full bg-primary-solid font-display text-xl font-black italic` con `{initial}` y el nombre (`text-sm font-semibold`, `truncate`), si lo hay;
  - lista de enlaces: activo `bg-white/10 text-brand-fg` con borde izquierdo `border-l-2 border-primary-solid`; inactivo `text-brand-muted hover:bg-white/5 hover:text-brand-fg`;
  - al final, `<form action={logoutAction} className="border-t border-brand-line p-2">` con un botón `type="submit"`, icono `LogOut` y `t('logout')`, con el mismo estilo que un enlace inactivo. `logoutAction` se importa de `@/features/authentication/logout` (módulo de primer nivel).

`layout.tsx` (cuenta): la barra lateral pasa a `w-64 shrink-0 md:sticky md:top-[calc(var(--header-offset)+1.5rem)] md:self-start`.

Títulos: en los `h1` de la lista de ficheros, `className="text-3xl font-bold"` pasa a `className="text-5xl md:text-6xl"`, conservando el `mb-*` que tuvieran (`mb-6` o `mb-2`).

Cabecera:
- `navbar-user.tsx`: primera opción del menú `<DropdownMenuItem render={<Link href="/mi-cuenta" />}>{t('myAccount')}</DropdownMenuItem>`;
- `mobile-account-links.tsx`: primer enlace `<SheetLink href="/mi-cuenta" icon={LayoutDashboard} label={t('myAccount')} />`;
- mensaje `Navigation.myAccount`: "Mi cuenta" / "My account". Si la clave ya existe, se reutiliza.

Mensajes `Account`:
- `summary`: "Resumen" / "Overview"
- `logout`: "Cerrar sesión" / "Sign out"

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/account.test.mjs && npx tsc --noEmit -p . && npx eslint src/features/account src/site/navigation`
Expected: PASS y limpio.

- [ ] **Step 5: Commit** — `feat(cuenta): barra lateral oscura con inicial, resumen y cerrar sesión; títulos al estilo nuevo`

---

### Task 3: Repetir último pedido

**Files:**
- Create: `apps/storefront/src/features/account/account-summary.ts` (puro), `apps/storefront/src/features/account/repeat-last-order.ts` (`'use server'`), `apps/storefront/src/features/account/components/repeat-last-order-button.tsx` (cliente)
- Modify: `apps/storefront/src/features/account/graphql.ts` (`GetLastPaidOrderQuery`), `messages/{es,en}.json`
- Test: `apps/storefront/tests/design/account.test.mjs`

**Interfaces:**
- Produces:
  - `PAID_ORDER_STATES: string[]`;
  - `loyaltyProgress({balance, minRedeemablePoints, pointValueInCents, maxDiscountPerOrderCents}) → {canRedeem: boolean; percent: number; remaining: number; redeemableCents: number}`;
  - `repeatLastOrder() → {success: true; added: number; skipped: string[]} | {success: false; error: string}`;
  - `RepeatLastOrderButton()`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('estados pagados y progreso de puntos', async () => {
    const {PAID_ORDER_STATES, loyaltyProgress} = await load('features/account/account-summary.ts');
    assert.ok(PAID_ORDER_STATES.includes('PaymentSettled') && PAID_ORDER_STATES.includes('Delivered'));
    for (const s of ['AddingItems', 'ArrangingPayment', 'Cancelled']) assert.equal(PAID_ORDER_STATES.includes(s), false, s);
    const cfg = {minRedeemablePoints: 100, pointValueInCents: 1, maxDiscountPerOrderCents: 2000};
    assert.deepEqual(loyaltyProgress({...cfg, balance: 40}), {canRedeem: false, percent: 40, remaining: 60, redeemableCents: 0});
    assert.deepEqual(loyaltyProgress({...cfg, balance: 500}), {canRedeem: true, percent: 100, remaining: 0, redeemableCents: 500});
    assert.deepEqual(loyaltyProgress({...cfg, balance: 9000}), {canRedeem: true, percent: 100, remaining: 0, redeemableCents: 2000});
});

test('repetir último pedido: solo pagados, línea a línea con addToCart, omite agotados e informa', async () => {
    assert.match(await read('features/account/graphql.ts'), /query GetLastPaidOrder\(\$states: \[String!\]!\)/);
    const action = await read('features/account/repeat-last-order.ts');
    assert.match(action, /^'use server';/);
    assert.match(action, /PAID_ORDER_STATES/);
    assert.match(action, /stockLevel === 'OUT_OF_STOCK'/);
    assert.match(action, /await addToCart\(line\.productVariant\.id, line\.quantity\)/);
    const button = await read('features/account/components/repeat-last-order-button.tsx');
    assert.match(button, /router\.push\('\/carrito'\)/);
    assert.match(button, /result\.added === 0/);
    for (const loc of ['es', 'en']) {
        const r = (await json(`features/account/messages/${loc}.json`)).Account.repeat;
        for (const k of ['button', 'added', 'skipped', 'nothingAdded', 'noOrder', 'error']) assert.ok(r?.[k], `${loc}: falta repeat.${k}`);
    }
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/storefront && node --test tests/design/account.test.mjs`
Expected: FAIL en los 2 tests nuevos.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/account/account-summary.ts -->
```ts
/**
 * Reglas del resumen de la cuenta, sin dependencias (se prueban con node --test).
 */

/** Estados de un pedido ya pagado (excluye carrito en curso, pago pendiente y cancelados). */
export const PAID_ORDER_STATES = [
    'PaymentAuthorized',
    'PaymentSettled',
    'PartiallyShipped',
    'Shipped',
    'PartiallyDelivered',
    'Delivered',
];

/**
 * Barra de Iron Rewards: progreso hacia el primer canje (mínimo canjeable) o, si ya se
 * llega, cuánto se puede descontar en el próximo pedido (con el tope por pedido).
 */
export function loyaltyProgress({balance, minRedeemablePoints, pointValueInCents, maxDiscountPerOrderCents}: {
    balance: number;
    minRedeemablePoints: number;
    pointValueInCents: number;
    maxDiscountPerOrderCents: number;
}): {canRedeem: boolean; percent: number; remaining: number; redeemableCents: number} {
    if (minRedeemablePoints <= 0 || balance >= minRedeemablePoints) {
        return {canRedeem: true, percent: 100, remaining: 0, redeemableCents: Math.min(balance * pointValueInCents, maxDiscountPerOrderCents)};
    }
    return {
        canRedeem: false,
        percent: Math.round((Math.max(0, balance) / minRedeemablePoints) * 100),
        remaining: minRedeemablePoints - Math.max(0, balance),
        redeemableCents: 0,
    };
}
```

En `features/account/graphql.ts`, al final:

```ts
// Último pedido pagado del cliente, para "Repetir último pedido" (estados en PAID_ORDER_STATES).
export const GetLastPaidOrderQuery = graphql(`
    query GetLastPaidOrder($states: [String!]!) {
        activeCustomer {
            id
            orders(options: {take: 1, sort: {orderPlacedAt: DESC}, filter: {state: {in: $states}}}) {
                items {
                    id
                    code
                    lines {
                        id
                        quantity
                        productVariant {
                            id
                            name
                            stockLevel
                        }
                    }
                }
            }
        }
    }
`);
```

<!-- archivo: apps/storefront/src/features/account/repeat-last-order.ts -->
```ts
'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {GetLastPaidOrderQuery} from '@/features/account/graphql';
import {PAID_ORDER_STATES} from '@/features/account/account-summary';
import {addToCart} from '@/features/products/add-to-cart';

/**
 * "Repetir último pedido": copia al carrito los productos y cantidades del último
 * pedido pagado, línea a línea, con la acción de añadir existente. Omite las variantes
 * agotadas o que ya no se pueden añadir y devuelve sus nombres. No toca el pedido
 * anterior: lo que sigue es una compra nueva con los precios de ahora.
 */
export async function repeatLastOrder(): Promise<{success: true; added: number; skipped: string[]} | {success: false; error: string}> {
    const t = await getTranslations({locale: await getLocale(), namespace: 'Account'});
    try {
        const {data} = await query(GetLastPaidOrderQuery, {states: PAID_ORDER_STATES}, {useAuthToken: true});
        const order = data.activeCustomer?.orders.items[0];
        if (!order) return {success: false, error: t('repeat.noOrder')};

        let added = 0;
        const skipped: string[] = [];
        for (const line of order.lines) {
            if (line.productVariant.stockLevel === 'OUT_OF_STOCK') {
                skipped.push(line.productVariant.name);
                continue;
            }
            const result = await addToCart(line.productVariant.id, line.quantity);
            if (result.success) added += 1;
            else skipped.push(line.productVariant.name);
        }
        return {success: true, added, skipped};
    } catch {
        return {success: false, error: t('repeat.error')};
    }
}
```

<!-- archivo: apps/storefront/src/features/account/components/repeat-last-order-button.tsx -->
```tsx
'use client';

import {useTransition} from 'react';
import {RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/platform/i18n/navigation';
import {repeatLastOrder} from '@/features/account/repeat-last-order';

/** Acceso rápido "Repetir último pedido": añade sus productos al carrito y lleva al carrito. */
export function RepeatLastOrderButton() {
    const t = useTranslations('Account.repeat');
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const run = () => startTransition(async () => {
        try {
            const result = await repeatLastOrder();
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            if (result.added === 0) {
                toast.error(t('nothingAdded'));
                return;
            }
            toast.success(t('added', {count: result.added}));
            if (result.skipped.length) toast.warning(t('skipped', {names: result.skipped.join(', ')}));
            router.push('/carrito');
        } catch {
            toast.error(t('error'));
        }
    });

    return (
        <button
            type="button"
            onClick={run}
            disabled={pending}
            aria-busy={pending}
            className="hover-lift flex flex-col items-start gap-2 rounded-lg border border-primary-solid bg-primary-solid/5 p-4 text-left text-sm font-semibold transition-colors hover:bg-primary-solid/10 disabled:opacity-60"
        >
            <RotateCcw className="size-5 text-primary-solid" aria-hidden="true" />
            {t('button')}
        </button>
    );
}
```

Mensajes `Account.repeat`:
- es:
  - `button` "Repetir último pedido"
  - `added` "{count, plural, one {Añadido # producto al carrito} other {Añadidos # productos al carrito}}"
  - `skipped` "Sin stock o no disponibles: {names}"
  - `nothingAdded` "No se ha podido añadir ningún producto del último pedido."
  - `noOrder` "No tienes pedidos pagados que repetir."
  - `error` "No se ha podido repetir el pedido. Inténtalo de nuevo."
- en:
  - `button` "Reorder last order"
  - `added` "{count, plural, one {Added # product to your cart} other {Added # products to your cart}}"
  - `skipped` "Out of stock or unavailable: {names}"
  - `nothingAdded` "None of the products from your last order could be added."
  - `noOrder` "You have no paid orders to reorder."
  - `error` "The order couldn't be repeated. Please try again."

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/account.test.mjs && npx tsc --noEmit -p . && npx eslint src/features/account`
Expected: PASS y limpio. Si gql.tada no acepta `orderPlacedAt` u `in` en este esquema, se usa el que haya (`createdAt`) con un ruling.

- [ ] **Step 5: Commit** — `feat(cuenta): repetir último pedido (copia productos y cantidades al carrito)`

---

### Task 4: Página de resumen `/mi-cuenta`

**Files:**
- Create: `apps/storefront/src/app/[locale]/mi-cuenta/page.tsx` (reexporta), `apps/storefront/src/features/account/routes/summary/page.tsx`
- Modify: `apps/storefront/src/features/account/messages/{es,en}.json` (`Account.overview.*`)
- Test: `apps/storefront/tests/design/account.test.mjs`

- [ ] **Step 1: Escribir el test que falla**

```js
test('resumen /mi-cuenta: saludo, puntos con barra, último pedido, accesos y pedidos recientes', async () => {
    assert.match(await read('app/[locale]/mi-cuenta/page.tsx'), /export \{default, generateMetadata\} from '@\/features\/account\/routes\/summary\/page'/);
    const page = await read('features/account/routes/summary/page.tsx');
    assert.match(page, /loyaltyProgress\(/);
    assert.match(page, /role="progressbar"/);
    assert.match(page, /<OrderStatusBadge/);
    assert.match(page, /\{lastPaid && <RepeatLastOrderButton \/>\}/);
    assert.match(page, /t\('overview\.startShopping'\)/);
    assert.match(page, /\.catch\(\(\) => null\)/);
    for (const loc of ['es', 'en']) {
        const o = (await json(`features/account/messages/${loc}.json`)).Account.overview;
        for (const k of ['title', 'greeting', 'intro', 'toFirstRedeem', 'canRedeem', 'viewPoints', 'lastOrder', 'startShopping', 'quickAccess', 'recentOrders', 'viewAllOrders', 'viewOrder', 'pointsBalance']) assert.ok(o?.[k], `${loc}: falta overview.${k}`);
    }
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/account.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/app/[locale]/mi-cuenta/page.tsx -->
```tsx
export {default, generateMetadata} from '@/features/account/routes/summary/page';
```

<!-- archivo: apps/storefront/src/features/account/routes/summary/page.tsx -->
```tsx
import type {Metadata} from 'next';
import {FileText, MapPin, Package, Star, User} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {formatDate} from '@/platform/i18n/format';
import {query} from '@/platform/vendure/api';
import {getActiveCustomer} from '@/features/account/customer';
import {GetCustomerOrdersQuery, GetLastPaidOrderQuery} from '@/features/account/graphql';
import {loyaltyProgress, PAID_ORDER_STATES} from '@/features/account/account-summary';
import {RepeatLastOrderButton} from '@/features/account/components/repeat-last-order-button';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getLoyaltyProgramConfig} from '@/features/loyalty/program-config';
import {OrderStatusBadge} from '@/features/orders/order-status-badge';
import {Price} from '@/features/pricing/price';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {title: t('overview.title')};
}

/**
 * Resumen de la cuenta: saludo, Iron Rewards con barra, último pedido, accesos rápidos
 * (con "Repetir último pedido" si hay un pedido pagado) y pedidos recientes. Va dentro
 * del layout de la cuenta, que ya exige sesión (RequireCustomer).
 */
export default async function AccountSummaryPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});

    const [customer, ordersResult, lastPaidResult, loyaltyResult, config] = await Promise.all([
        getActiveCustomer(),
        query(GetCustomerOrdersQuery, {options: {take: 5, sort: {orderPlacedAt: 'DESC'}, filter: {state: {notEq: 'AddingItems'}}}}, {useAuthToken: true}).catch(() => null),
        query(GetLastPaidOrderQuery, {states: PAID_ORDER_STATES}, {useAuthToken: true}).catch(() => null),
        query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true}).catch(() => null),
        getLoyaltyProgramConfig().catch(() => null),
    ]);

    const orders = ordersResult?.data.activeCustomer?.orders.items ?? [];
    const lastOrder = orders[0] ?? null;
    const lastPaid = lastPaidResult?.data.activeCustomer?.orders.items[0] ?? null;
    const balance = loyaltyResult?.data.loyaltyAccount?.balance ?? 0;
    const progress = config ? loyaltyProgress({balance, ...config}) : null;
    const currencyCode = lastOrder?.currencyCode ?? 'EUR';

    const quickLinks = [
        {href: '/mi-cuenta/pedidos', icon: Package, label: t('orders')},
        {href: '/mi-cuenta/facturas', icon: FileText, label: t('invoices')},
        {href: '/mi-cuenta/puntos', icon: Star, label: t('points')},
        {href: '/mi-cuenta/addresses', icon: MapPin, label: t('addresses')},
        {href: '/mi-cuenta/profile', icon: User, label: t('profile')},
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-5xl md:text-6xl">{t('overview.greeting', {name: customer?.firstName || ''})}</h1>
                <p className="mt-2 text-muted-foreground">{t('overview.intro')}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {progress && (
                    <section className="rounded-lg bg-brand p-6 text-brand-fg">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-brand-muted">
                            <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" /> Iron Rewards
                        </p>
                        <p className="mt-2 font-display text-5xl font-black italic leading-none">{t('overview.pointsBalance', {points: balance})}</p>
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress.percent}
                            aria-label={t('overview.progressLabel')}
                            className="mt-4 h-2 rounded-full bg-white/10"
                        >
                            <div className="h-2 rounded-full bg-primary-solid" style={{width: `${progress.percent}%`}} />
                        </div>
                        <p className="mt-2 text-sm text-brand-muted">
                            {progress.canRedeem
                                ? t('overview.canRedeem', {amount: new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {style: 'currency', currency: currencyCode}).format(progress.redeemableCents / 100)})
                                : t('overview.toFirstRedeem', {remaining: progress.remaining})}
                        </p>
                        <Link href="/mi-cuenta/puntos" className="mt-4 inline-block text-sm font-semibold text-primary-text underline-offset-4 hover:underline">{t('overview.viewPoints')}</Link>
                    </section>
                )}

                <section className="rounded-lg border border-border p-6">
                    <h2 className="text-2xl">{t('overview.lastOrder')}</h2>
                    {lastOrder ? (
                        <div className="mt-3 space-y-2 text-sm">
                            <p className="flex flex-wrap items-center gap-3">
                                <span className="font-mono font-semibold">{lastOrder.code}</span>
                                <OrderStatusBadge state={lastOrder.state} />
                            </p>
                            <p className="text-muted-foreground">{formatDate(lastOrder.createdAt, 'long', locale)} · <Price value={lastOrder.totalWithTax} currencyCode={lastOrder.currencyCode} /></p>
                            <Link href={`/mi-cuenta/pedidos/${lastOrder.code}`} className="inline-block font-semibold text-primary underline-offset-4 hover:underline">{t('overview.viewOrder')}</Link>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3 text-sm">
                            <p className="text-muted-foreground">{t('noOrders')}</p>
                            <Button render={<Link href="/productos" />} nativeButton={false}>{t('overview.startShopping')}</Button>
                        </div>
                    )}
                </section>
            </div>

            <section>
                <h2 className="mb-3 text-2xl">{t('overview.quickAccess')}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {lastPaid && <RepeatLastOrderButton />}
                    {quickLinks.map(({href, icon: Icon, label}) => (
                        <Link key={href} href={href} className="hover-lift flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-sm font-semibold transition-colors hover:border-foreground">
                            <Icon className="size-5 text-primary-solid" aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </div>
            </section>

            {orders.length > 0 && (
                <section>
                    <div className="mb-3 flex items-end justify-between">
                        <h2 className="text-2xl">{t('overview.recentOrders')}</h2>
                        <Link href="/mi-cuenta/pedidos" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t('overview.viewAllOrders')}</Link>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th scope="col" className="px-4 py-3">{t('orderNumber')}</th>
                                    <th scope="col" className="px-4 py-3">{t('date')}</th>
                                    <th scope="col" className="px-4 py-3">{t('status')}</th>
                                    <th scope="col" className="px-4 py-3 text-right">{t('totalHeader')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-t border-border">
                                        <td className="px-4 py-3"><Link href={`/mi-cuenta/pedidos/${order.code}`} className="font-mono font-semibold hover:text-primary">{order.code}</Link></td>
                                        <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt, 'short', locale)}</td>
                                        <td className="px-4 py-3"><OrderStatusBadge state={order.state} /></td>
                                        <td className="px-4 py-3 text-right font-mono"><Price value={order.totalWithTax} currencyCode={order.currencyCode} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
```

Nota: el formato de moneda de la barra usa la misma correspondencia que `toIntlLocale`. Si en `@/platform/i18n/locale-utils` existe `toIntlLocale`, se usa en vez del ternario.

Mensajes `Account.overview`:
- es:
  - `title` "Mi cuenta"
  - `greeting` "Hola, {name}"
  - `intro` "Desde aquí ves tus pedidos, tus puntos y tus datos."
  - `pointsBalance` "{points} puntos"
  - `progressLabel` "Progreso hacia tu próximo canje"
  - `toFirstRedeem` "Te faltan {remaining} puntos para tu primer canje"
  - `canRedeem` "Puedes canjear hasta {amount} en tu próximo pedido"
  - `viewPoints` "Ver mis puntos"
  - `lastOrder` "Último pedido"
  - `viewOrder` "Ver pedido"
  - `startShopping` "Empezar a comprar"
  - `quickAccess` "Accesos rápidos"
  - `recentOrders` "Pedidos recientes"
  - `viewAllOrders` "Ver todos"
- en:
  - `title` "My account"
  - `greeting` "Hi, {name}"
  - `intro` "Your orders, points and details, all in one place."
  - `pointsBalance` "{points} points"
  - `progressLabel` "Progress to your next redemption"
  - `toFirstRedeem` "{remaining} points to go until your first redemption"
  - `canRedeem` "You can redeem up to {amount} on your next order"
  - `viewPoints` "View my points"
  - `lastOrder` "Last order"
  - `viewOrder` "View order"
  - `startShopping` "Start shopping"
  - `quickAccess` "Quick access"
  - `recentOrders` "Recent orders"
  - `viewAllOrders` "View all"

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de upgrade; limpio.

- [ ] **Step 5: Commit** — `feat(cuenta): página de resumen con puntos, último pedido, accesos rápidos y pedidos recientes`

---

### Task 5: Verificación

- [ ] **Step 1:** `npm test`, `tsc` y `eslint`.
- [ ] **Step 2:** `next build` en la copia `tmp-fase5a` y `next start -p 3200`.
- [ ] **Step 3:** Sin cliente de prueba en esta sesión, se comprueba que `/mi-cuenta` sin sesión manda al acceso con `redirectTo=/mi-cuenta`. Con playwright, `/carrito` y una ficha en móvil: el pie ya no queda tapado por la barra fija (el último texto del pie se ve con scroll hasta el fondo). La cuenta con sesión (barra lateral, resumen, repetir pedido) queda como comprobación manual en develop, y se dice así.
- [ ] **Step 4:** Limpieza: solo el árbol del puerto 3200; quitar la unión con `rmdir` desde dentro de la copia; borrar la copia; comprobar `node_modules`.
