// Último repaso antes de subir: sensación de app en el móvil, barra fija, cabecera A,
// pestañas de acceso estables y transiciones más suaves en escritorio.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');

test('móvil como una app, sin zoom con dos dedos (decisión de diseño, declarada en accesibilidad)', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /touch-action: pan-x pan-y/);
    assert.match(css, /-webkit-tap-highlight-color: transparent/);
    assert.match(css, /user-select: none/);
    assert.match(css, /@media \(max-width: 767px\) \{\s*input:not\(\[type="checkbox"\]\)[^}]*font-size: 16px/);
    const layout = await read('site/locale-layout.tsx');
    assert.match(layout, /maximumScale: 1/);
    assert.match(layout, /userScalable: false/);
    assert.match(layout, /<NoPinchZoom\/>/);
    // iOS Safari ignora el viewport: se anulan los gestos de WebKit, sin touchmove no pasivo.
    const guard = await read('site/app-shell/no-pinch-zoom.tsx');
    assert.match(guard, /gesturestart/);
    assert.doesNotMatch(guard, /addEventListener\('touchmove'/);
    // WCAG 1.4.4: la limitación y sus alternativas quedan declaradas.
    assert.match(await read('site/legal/accesibilidad.tsx'), /gesto de dos dedos/);
});

test('las barras fijas de abajo no heredan margen del contenedor', async () => {
    assert.match(await read('features/products/components/product-info.tsx'), /data-mobile-bar[\s\S]{0,80}fixed inset-x-0 bottom-0 z-30 !mb-0/);
    assert.match(await read('features/cart/routes/order-summary.tsx'), /fixed inset-x-0 bottom-0 z-30 !mb-0/);
});

test('cabecera A en el móvil: logo centrado, cuenta como icono', async () => {
    const navbar = await read('site/navigation/navbar.tsx');
    assert.match(navbar, /absolute left-1\/2 shrink-0 -translate-x-1\/2 lg:static/);
    assert.match(navbar, /ml-auto flex items-center/);
    const login = await read('site/navigation/navbar/login-button.tsx');
    assert.match(login, /<User className="size-5 lg:hidden"/);
    assert.match(login, /sr-only lg:not-sr-only/);
    assert.match(await read('site/navigation/navbar/navbar-user.tsx'), /sr-only lg:not-sr-only/);
});

test('transiciones: cabecera quieta, panel de acceso quieto y formulario anclado arriba', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /scrollbar-gutter: stable/);
    for (const name of ['site-header', 'cookie-banner', 'auth-panel', 'auth-form']) assert.match(css, new RegExp(`view-transition-name: ${name}`));
    assert.match(await read('site/navigation/navbar.tsx'), /vt-site-header/);
    const shell = await read('features/authentication/components/auth-shell.tsx');
    assert.match(shell, /vt-auth-panel[^"]*lg:sticky[^"]*lg:h-\[calc\(100vh-var\(--header-offset\)\)\]/);
    assert.match(shell, /vt-auth-form/);
    assert.doesNotMatch(shell, /vt-auth-form[^"]*items-center/);
});
