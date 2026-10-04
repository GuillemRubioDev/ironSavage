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

test('las tarjetas de colección usan imagen o, si no hay, una inicial grande', async () => {
    const tile = await read('components/brand/collection-tile.tsx');
    assert.match(tile, /export function CollectionTile\b/);
    assert.match(tile, /imageUrl \?/);
    assert.match(tile, /name\.charAt\(0\)/);
    assert.match(tile, /img-zoom/);
    assert.doesNotMatch(tile, /from '@\/(site|features)\//);
});

test('las categorías se superponen al borde del banner y la portada muestra la franja de confianza', async () => {
    const cats = await read('site/home/categories-showcase.tsx');
    assert.match(cats, /<CollectionTile/);
    assert.match(cats, /-mt-20 md:-mt-24/);
    const page = await read('site/home/page.tsx');
    assert.match(page, /<TrustStrip/);
    const es = await json('site/home/messages/es.json');
    assert.deepEqual(Object.keys(es.Home.trust ?? {}), ['shipping', 'payment', 'returns', 'points']);
});

test('los destacados usan SectionHeader con palabra destacada y enlace a todos los productos', async () => {
    const carousel = await read('features/products/components/product-carousel.tsx');
    assert.match(carousel, /<SectionHeader title=\{title\} highlight=\{highlight\} action=\{action\}/);
    const featured = await read('features/products/featured-products.tsx');
    assert.match(featured, /highlight=\{t\('featuredHighlight'\)\}/);
    assert.match(featured, /action=\{\{href: '\/productos', label: t\('viewAllProducts'\)\}\}/);
});

test('el bloque de objetivos aparece solo si existen y enlaza a cada colección', async () => {
    const goals = await read('site/home/goals-section.tsx');
    assert.match(goals, /getGoalCollections\(locale\)/);
    assert.match(goals, /if \(!goals\.length\) return null/);
    assert.match(goals, /variant="goal"/);
    assert.match(goals, /href=\{`\/categorias\/\$\{goal\.slug\}`\}/);
    assert.match(await read('site/home/page.tsx'), /<GoalsSection\s*\/>/);
    const es = await json('site/home/messages/es.json');
    assert.ok(es.Home.goals?.title && es.Home.goals?.highlight && es.Home.goals?.eyebrow);
});

test('Iron Rewards muestra las cifras de la configuración del programa', async () => {
    const teaser = await read('features/loyalty/loyalty-teaser.tsx');
    assert.match(teaser, /getLoyaltyProgramConfig\(\)/);
    assert.match(teaser, /config\.pointsPerEuro/);
    assert.match(teaser, /config\.minRedeemablePoints/);
    assert.match(teaser, /config\.maxDiscountPerOrderCents/);
    assert.match(teaser, /bg-brand/);
    const es = await json('features/loyalty/messages/es.json');
    for (const k of ['earn', 'redeem', 'cap']) assert.ok(es.Loyalty.teaser.stats?.[k], `falta teaser.stats.${k}`);
});

test('noticias con SectionHeader y tarjetas que se elevan', async () => {
    const news = await read('features/news/latest-news-section.tsx');
    assert.match(news, /<SectionHeader title=\{t\('homeTitle'\)\} highlight=\{t\('homeHighlight'\)\}/);
    assert.match(await read('features/news/components/article-card.tsx'), /hover-lift/);
});

test('la portada sigue el orden del spec y sin la sección antigua "por qué"', async () => {
    const page = await read('site/home/page.tsx');
    const order = ['<HeroBanner', '<CategoriesShowcase', '<TrustStrip', '<FeaturedProducts', '<GoalsSection', '<LoyaltyTeaser', '<LatestNewsSection'];
    const idx = order.map(tag => page.indexOf(tag));
    assert.ok(idx.every(i => i >= 0), 'falta algún bloque');
    assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'orden incorrecto');
    assert.doesNotMatch(page, /whyShopWithUs|section-spotlight|featureKeys/);
});
