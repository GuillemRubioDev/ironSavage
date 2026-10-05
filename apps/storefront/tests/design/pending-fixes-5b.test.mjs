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
    assert.match(form, /<CardTitle><h1 className="text-3xl">\{t\('invalidResetLink'\)\}<\/h1><\/CardTitle>/);
    assert.match(form, /<CardTitle><h1 className="text-3xl">\{t\('resetYourPassword'\)\}<\/h1><\/CardTitle>/);
});
