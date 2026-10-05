import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { StorefrontSettingsShopResolver } from './storefront-settings-shop.resolver';

const fakeService = (customFields: Record<string, unknown>) => ({ getSettings: async () => ({ customFields }) }) as never;

test('storefrontSettings devuelve la imagen del panel de acceso configurada', async () => {
    const asset = { id: '7', preview: 'https://x/preview.webp' };
    const resolver = new StorefrontSettingsShopResolver(fakeService({ authPanelImage: asset }));
    assert.deepEqual(await resolver.storefrontSettings({} as never), { authPanelImage: asset });
});

test('storefrontSettings devuelve null si no hay imagen', async () => {
    const resolver = new StorefrontSettingsShopResolver(fakeService({}));
    assert.deepEqual(await resolver.storefrontSettings({} as never), { authPanelImage: null });
});

test('la migración solo añade la columna y su clave foránea, con los nombres de TypeORM', () => {
    const file = fs.readFileSync(path.join(__dirname, '../../migrations/1791210000000-AddAuthPanelImage.ts'), 'utf8');
    assert.match(file, /ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer/);
    assert.match(file, /ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY \("customFieldsAuthpanelimageid"\) REFERENCES "asset"\("id"\) ON DELETE NO ACTION ON UPDATE NO ACTION/);
    assert.match(file, /DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"/);
    assert.match(file, /DROP COLUMN "customFieldsAuthpanelimageid"/);
    assert.doesNotMatch(file, /DROP TABLE|TRUNCATE|DELETE FROM/);
});
