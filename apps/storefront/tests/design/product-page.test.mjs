// Fase 3B del rediseño (ficha de producto).
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

const a = id => ({id});

test('galería: primero las fotos de la variante, después las del producto, sin repetir', async () => {
    const {galleryFor} = await load('features/products/product-facts.ts');
    const product = [a('p1'), a('p2')];
    assert.deepEqual(galleryFor(product, null).map(x => x.id), ['p1', 'p2']);
    assert.deepEqual(galleryFor(product, {featuredAsset: a('v1'), assets: [a('v1'), a('v2'), a('p2')]}).map(x => x.id), ['v1', 'v2', 'p2', 'p1']);
    assert.deepEqual(galleryFor(product, {featuredAsset: null, assets: []}).map(x => x.id), ['p1', 'p2']);
});

test('proteína por dosis solo si la tabla tiene columna por dosis', async () => {
    const {proteinPerServing} = await load('features/products/product-facts.ts');
    assert.equal(proteinPerServing('Proteínas | 80 g | 24 g\nGrasas | 2 g | 0,6 g'), '24 g');
    assert.equal(proteinPerServing('Energía | 400 kcal | 120 kcal\nProteínas | 80 g | 24 g'), '24 g');
    assert.equal(proteinPerServing('Proteínas | 80 g'), null);
    assert.equal(proteinPerServing('Rico en proteínas'), null);
    assert.equal(proteinPerServing(null), null);
});

test('nº de sabores y cantidad neta salen de datos reales', async () => {
    const {flavorCount, netQuantityLabel} = await load('features/products/product-facts.ts');
    const groups = [{code: 'iso-savage-peso', name: 'Peso', options: [{name: '1 kg'}]}, {code: 'iso-savage-sabor', name: 'Sabor', options: [{name: 'A'}, {name: 'B'}, {name: 'C'}]}];
    assert.equal(flavorCount(groups), 3);
    assert.equal(flavorCount([{code: 'x-sabor', name: 'Sabor', options: [{name: 'A'}]}]), null);
    assert.equal(netQuantityLabel([{customFields: {netQuantity: null}}], groups), '1 kg');
    assert.equal(netQuantityLabel([{customFields: {netQuantity: '900 g'}}, {customFields: {netQuantity: '900 g'}}], groups), '900 g');
    assert.equal(netQuantityLabel([{customFields: null}], []), null);
});

test('los puntos siguen la fórmula del servidor y crecen con la cantidad', async () => {
    const {pointsFor} = await load('features/products/product-facts.ts');
    assert.equal(pointsFor(8139, 1, 1), 81);
    assert.equal(pointsFor(8139, 2, 1), 162);
    assert.equal(pointsFor(999, 1, 0), 0);
});

test('la consulta de la ficha trae las fotos de cada variante', async () => {
    assert.match(await read('features/products/graphql.ts'), /featuredAsset \{[^}]*\}\s*assets \{\s*id\s*preview\s*source\s*\}/);
});

test('la selección vive solo en el estado: sin URL, con las opciones únicas marcadas', async () => {
    const client = await read('features/products/components/product-detail-client.tsx');
    assert.match(client, /useState<Selection>\(\(\) => initialSelection\(product\.optionGroups\)\)/);
    assert.match(client, /selectOption\(product\.variants, current, groupId, optionId\)/);
    assert.match(client, /galleryFor\(product\.assets, selectedVariant\)/);
    assert.doesNotMatch(client, /useSearchParams|router\.push|searchParams/);
    assert.doesNotMatch(await read('features/products/routes/page.tsx'), /searchParams=\{/);
});

test('bloque de compra con cantidad, puntos y mini franja de confianza', async () => {
    const info = await read('features/products/components/product-info.tsx');
    assert.match(info, /addToCart\(selectedVariant\.id, quantity\)/);
    assert.match(info, /pointsFor\(selectedVariant\.discountedPriceWithTax, quantity, pointsPerEuro\)/);
    assert.match(info, /t\('pointsEarned', \{points\}\)/);
    assert.match(info, /t\('trustBadges\.secureCheckout'\)/);
    assert.match(info, /isOptionAvailable\(product\.variants, selection, group\.id, option\.id\)/);
    const page = await read('features/products/routes/page.tsx');
    assert.match(page, /getLoyaltyProgramConfig\(\)/);
    assert.match(page, /pointsPerEuro=\{loyalty\.pointsPerEuro\}/);
    for (const loc of ['es', 'en']) {
        assert.ok((await json(`features/products/messages/${loc}.json`)).Product.pointsEarned, `${loc}: falta pointsEarned`);
    }
});

test('galería única: carrusel deslizable en móvil, zoom que sigue al ratón en escritorio y nombre si no hay fotos', async () => {
    assert.equal(await exists('features/products/components/product-image-carousel.tsx'), false);
    const gallery = await read('features/products/components/product-gallery.tsx');
    assert.match(gallery, /snap-x snap-mandatory/);
    assert.match(gallery, /transformOrigin: `\$\{zoom\.x\}% \$\{zoom\.y\}%`/);
    assert.match(gallery, /\(hover: hover\)/);
    assert.match(gallery, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(gallery, /noImagesAvailable/);
    // Un solo juego de imágenes (no uno para móvil y otro para escritorio).
    assert.equal((gallery.match(/src=\{image\.source\}/g) ?? []).length, 1);
    assert.match(await read('features/products/components/product-detail-client.tsx'), /<ProductGallery/);
});

test('desplegables con la información (montada aunque estén cerrados) y la descripción', async () => {
    assert.equal(await exists('features/products/components/food-information.tsx'), false);
    const details = await read('features/products/components/product-details.tsx');
    assert.match(details, /<Accordion multiple defaultValue=\{\['description'\]\}/);
    assert.match(details, /keepMounted/);
    for (const key of ['nutrition', 'directions', 'ingredientsAllergens', 'warnings', 'storage']) assert.match(details, new RegExp(`'${key}'`));
    assert.match(details, /legalWarnings\.dose/);
});

test('franja de cifras clave con datos reales; nada si no hay ninguna', async () => {
    const figures = await read('features/products/components/key-figures.tsx');
    assert.match(figures, /proteinPerServing\(nutrition\)/);
    assert.match(figures, /flavorCount\(optionGroups\)/);
    assert.match(figures, /netQuantityLabel\(variants, optionGroups\)/);
    assert.match(figures, /if \(!figures\.length\) return null/);
    assert.match(figures, /bg-brand/);
});

test('la ficha compone desplegables, cifras, reseñas con ancla y estrellas junto al nombre', async () => {
    const page = await read('features/products/routes/page.tsx');
    assert.match(page, /detailsSlot=\{<ProductDetails/);
    assert.match(page, /<KeyFigures/);
    assert.doesNotMatch(page, /FoodInformation|trustBadges\.guarantee/);
    const site = await read('site/products/product-detail-page.tsx');
    assert.match(site, /ratingSlot=\{/);
    assert.match(site, /<ProductRatingSummary productId=\{productId\}/);
    assert.match(await read('features/reviews/product-rating-summary.tsx'), /if \(!reviewCount\) return null/);
    assert.match(await read('features/reviews/product-reviews-section.tsx'), /id="resenas"/);
    for (const loc of ['es', 'en']) {
        const p = (await json(`features/products/messages/${loc}.json`)).Product;
        for (const k of ['description', 'ingredientsAllergens', 'otherInfo']) assert.ok(p.food[k], `${loc}: falta food.${k}`);
        for (const k of ['title', 'protein', 'flavors', 'netQuantity']) assert.ok(p.facts?.[k], `${loc}: falta facts.${k}`);
    }
});
