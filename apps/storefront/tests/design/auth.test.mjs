// Fase 5B del rediseño: páginas de acceso.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));

test('imagen del panel desde storefrontSettings, en caché y con respaldo si falla', async () => {
    const data = await read('features/authentication/auth-panel-image.ts');
    assert.match(data, /storefrontSettings/);
    assert.match(data, /'use cache'/);
    assert.match(data, /cacheTag\('storefront-settings'\)/);
    assert.match(data, /catch/);
    assert.match(await read('platform/revalidation/handler.ts'), /\{match: 'storefront-settings', kind: 'exact'\}/);
});

test('AuthShell: imagen con velo oscuro o fondo de marca, y pestañas que conservan redirectTo', async () => {
    const shell = await read('features/authentication/components/auth-shell.tsx');
    assert.match(shell, /getAuthPanelImage\(\)/);
    assert.match(shell, /bg-gradient-to-t from-black\/85/);
    assert.match(shell, /bg-brand/);
    assert.match(shell, /<AuthTabs tab=\{tab\} \/>/);
    const tabs = await read('features/authentication/components/auth-tabs.tsx');
    assert.match(tabs, /aria-current=\{tab === 'signIn' \? 'page' : undefined\}/);
    assert.match(tabs, /redirectTo \? `\?redirectTo=\$\{encodeURIComponent\(redirectTo\)\}` : ''/);
});

test('las seis páginas de acceso usan AuthShell; login y registro con pestañas', async () => {
    for (const p of ['sign-in', 'register', 'forgot-password', 'reset-password', 'verify', 'verify-pending']) {
        assert.match(await read(`features/authentication/routes/${p}/page.tsx`), /<AuthShell/, p);
    }
    assert.match(await read('features/authentication/routes/sign-in/page.tsx'), /tab="signIn"/);
    assert.match(await read('features/authentication/routes/register/page.tsx'), /tab="register"/);
    for (const loc of ['es', 'en']) assert.ok((await json(`features/authentication/messages/${loc}.json`)).Auth.authTabs);
});
