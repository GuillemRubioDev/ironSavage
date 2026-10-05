import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { StorefrontSettingsShopResolver } from './storefront-settings-shop.resolver';

/**
 * Conexión falsa que se comporta como TypeORM: la relación solo viene cargada si se pide
 * en `relations` (GlobalSettingsService.getSettings usa un QueryBuilder y NO carga
 * relaciones eager, así que el resolver tiene que pedirla).
 */
function fakeConnection(asset: unknown) {
    let lastOptions: { relations?: string[] } | undefined;
    const connection = {
        getRepository: () => ({
            find: async (options: { relations?: string[] }) => {
                lastOptions = options;
                const loaded = options.relations?.includes('customFields.authPanelImage');
                return [{ customFields: loaded ? { authPanelImage: asset, freeShippingThreshold: null } : {} }];
            },
        }),
    };
    return { connection: connection as never, options: () => lastOptions };
}

const noShipping = { getActiveShippingMethods: async () => [] } as never;
const ctx = { channel: { pricesIncludeTax: false } } as never;

test('storefrontSettings carga la relación y devuelve la imagen del panel de acceso', async () => {
    const asset = { id: '7', preview: 'https://x/preview.webp' };
    const fake = fakeConnection(asset);
    const resolver = new StorefrontSettingsShopResolver(fake.connection, noShipping);
    assert.deepEqual(await resolver.storefrontSettings(ctx), { authPanelImage: asset, freeShippingThreshold: null });
    assert.ok(fake.options()?.relations?.includes('customFields.authPanelImage'));
});

test('storefrontSettings devuelve null si no hay imagen', async () => {
    const resolver = new StorefrontSettingsShopResolver(fakeConnection(null).connection, noShipping);
    assert.deepEqual(await resolver.storefrontSettings(ctx), { authPanelImage: null, freeShippingThreshold: null });
});

test('storefrontSettings devuelve el mínimo del envío gratis de los métodos activos', async () => {
    const shipping = {
        getActiveShippingMethods: async () => [
            {
                checker: { code: 'spain-territories-checker', args: [{ name: 'orderMinimum', value: '5000' }] },
                calculator: { code: 'default-shipping-calculator', args: [{ name: 'rate', value: '0' }] },
            },
        ],
    } as never;
    const resolver = new StorefrontSettingsShopResolver(fakeConnection(null).connection, shipping);
    const result = await resolver.storefrontSettings(ctx);
    assert.deepEqual(result.freeShippingThreshold, { amount: 5000, includesTax: false });
});

test('la migración añade la columna, su clave foránea y la columna auxiliar de Vendure, con los nombres de TypeORM', () => {
    const file = fs.readFileSync(path.join(__dirname, '../../migrations/1791210000000-AddAuthPanelImage.ts'), 'utf8');
    assert.match(file, /ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer/);
    assert.match(file, /ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY \("customFieldsAuthpanelimageid"\) REFERENCES "asset"\("id"\) ON DELETE NO ACTION ON UPDATE NO ACTION/);
    // Con solo campos de tipo relación, Vendure registra una columna booleana auxiliar
    // (register-custom-entity-fields.js); sin ella el servidor no arranca.
    assert.match(file, /ALTER TABLE "global_settings" ADD "customFields__fix_relational_custom_fields__" boolean/);
    assert.match(file, /COMMENT ON COLUMN "global_settings"\."customFields__fix_relational_custom_fields__" IS 'A work-around needed when only relational custom fields are defined on an entity'/);
    assert.match(file, /DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"/);
    assert.match(file, /DROP COLUMN "customFieldsAuthpanelimageid"/);
    assert.match(file, /DROP COLUMN "customFields__fix_relational_custom_fields__"/);
    assert.doesNotMatch(file, /DROP TABLE|TRUNCATE|DELETE FROM/);
});
