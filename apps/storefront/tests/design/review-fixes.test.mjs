// Arreglos de la revisión final de la fase 1 del rediseño: cada test fija un fallo encontrado.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8');

test('las variables de fuente van en <html>, donde se resuelven los tokens de :root', async () => {
    const layout = await read('site/locale-layout.tsx');
    assert.match(layout, /<html[^>]*className=\{`\$\{inter\.variable\} \$\{barlowCondensed\.variable\}`\}/);
    assert.doesNotMatch(layout, /<body[^>]*\$\{inter\.variable\}/, 'las variables de fuente no deben quedarse en <body>');
});

test('la cinta repite los mensajes para cubrir pantallas anchas sin hueco', async () => {
    const marquee = await read('components/brand/marquee.tsx');
    assert.match(marquee, /const REPEAT = [3-9]/);
});

test('la cinta se puede pausar con un botón accesible y al recibir el foco', async () => {
    const marquee = await read('components/brand/marquee.tsx');
    assert.match(marquee, /aria-pressed=\{paused\}/);
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /\.marquee:focus-within \.marquee-track/);
    assert.match(css, /\.marquee\[data-paused="true"\] \.marquee-track/);
});

test('en la cabecera, el botón con el menú abierto y el foco de teclado se ven sobre el fondo oscuro', async () => {
    const navbar = await read('site/navigation/navbar.tsx');
    assert.match(navbar, /\[&_\[data-slot=button\]\[aria-expanded=true\]\]:text-brand-fg/);
    assert.match(navbar, /\[&_:focus-visible\]:outline-white/);
    const cart = await read('site/navigation/navbar/cart-icon.tsx');
    assert.match(cart, /focus-visible:outline-white/);
});

test('con reducir movimiento se anulan todas las piezas de la transición de página', async () => {
    const css = await read('app/[locale]/globals.css');
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /::view-transition-group\(\*\)/);
    assert.match(tail, /::view-transition-old\(\*\)/);
    assert.match(tail, /::view-transition-new\(\*\)/);
});

test('el enlace de SectionHeader usa el rojo de texto (AA en claro y en oscuro)', async () => {
    const header = await read('components/brand/section-header.tsx');
    assert.match(header, /'text-primary'/);
    assert.doesNotMatch(header, /text-primary-solid/);
});

test('entre lg y xl la cabecera usa el icono de búsqueda y deja sitio a las categorías', async () => {
    const navbar = await read('site/navigation/navbar.tsx');
    assert.match(navbar, /className="hidden xl:flex"/);
    assert.match(navbar, /hidden lg:flex xl:hidden/);
});
