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

test('la portada usa un banner fijo y ya no el carrusel con SVG', async () => {
    assert.equal(await exists('site/home/promo-carousel.tsx'), false);
    const page = await read('site/home/page.tsx');
    assert.match(page, /<HeroBanner/);
    assert.match(page, /banner=\{banners\[0\] \?\? null\}/);
    const hero = await read('site/home/hero-banner.tsx');
    assert.match(hero, /<h1/);
    assert.match(hero, /className="stagger/);
    assert.match(hero, /animate-hero-zoom/);
});

test('sin banner activo se pinta el banner de marca; con foto de fondo, degradado para leer el texto', async () => {
    const hero = await read('site/home/hero-banner.tsx');
    assert.match(hero, /if \(!banner\)/);
    assert.match(hero, /bg-brand/);
    assert.match(hero, /bg-gradient-to-r from-black\/80/);
});

test('el zoom del banner existe y se anula con reducir movimiento; se retira el CSS del carrusel', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes hero-zoom/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.animate-hero-zoom/);
    for (const old of ['--font-brand-display', '.section-spotlight', '.hero-glow', 'logo-wipe', 'logo-glow']) {
        assert.equal(css.includes(old), false, `queda ${old} en globals.css`);
    }
    assert.doesNotMatch(await read('components/brand/logo.tsx'), /AnimatedWordmark|LogoWordCrop/);
});
