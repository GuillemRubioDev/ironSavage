// Fase 2 del rediseño (portada): cada test fija una pieza de la portada nueva.
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));

test('los objetivos se leen de las colecciones con slug objetivo-, ordenadas y en caché', async () => {
    const gql = await read('features/collections/graphql.ts');
    assert.match(gql, /query GetGoalCollections/);
    assert.match(gql, /slug: \{ contains: "objetivo-" \}/);
    const data = await read('features/collections/data.ts');
    assert.match(data, /export async function getGoalCollections\(locale: string\)/);
    assert.match(data, /cacheTag\('collections'\)/);
    assert.match(data, /\.sort\(\(a, b\) => a\.position - b\.position\)/);
});

test('las cifras de Iron Rewards salen de loyaltyProgramConfig, no de valores fijos', async () => {
    assert.match(await read('features/loyalty/graphql.ts'), /loyaltyProgramConfig \{/);
    const cfg = await read('features/loyalty/program-config.ts');
    assert.match(cfg, /export async function getLoyaltyProgramConfig\(\)/);
    assert.match(cfg, /'use cache'/);
});
