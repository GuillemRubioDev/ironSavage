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
