import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..', '..', 'src');
const css = await readFile(path.join(root, 'app', '[locale]', 'globals.css'), 'utf8');
const reveal = await readFile(path.join(root, 'components', 'motion', 'reveal.tsx'), 'utf8').catch(() => '');

test('las utilidades de movimiento existen', () => {
    for (const cls of ['.reveal', '.hover-lift', '.press', '.img-zoom', '.animate-hero-in']) {
        assert.ok(css.includes(cls), `falta ${cls}`);
    }
});

test('sin JS el contenido con Reveal es visible: solo se oculta cuando el script ha marcado data-reveal="pending"', () => {
    assert.ok(reveal, 'falta src/components/motion/reveal.tsx');
    assert.match(css, /\[data-reveal="pending"\]/, 'el estado oculto debe depender de un atributo que pone el script');
    assert.doesNotMatch(css, /\.reveal\s*\{[^}]*opacity:\s*0/, '.reveal no puede ocultar por sí sola');
    assert.match(reveal, /'pending'/);
});

test('con reducir movimiento no queda nada oculto ni animado', () => {
    const idx = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
    assert.ok(idx >= 0);
    const tail = css.slice(idx);
    assert.match(tail, /\[data-reveal\]/);
    assert.match(tail, /opacity:\s*1\s*!important/);
    assert.match(tail, /animation:\s*none\s*!important/);
});
