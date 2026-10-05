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
