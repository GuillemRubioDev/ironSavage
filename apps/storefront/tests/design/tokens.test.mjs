import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const css = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'app', '[locale]', 'globals.css'), 'utf8');

/** Contenido del primer bloque que empieza por `selector {`, con llaves anidadas. */
function block(selector) {
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0, `falta el bloque ${selector}`);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(start, i);
    }
    throw new Error(`bloque ${selector} sin cerrar`);
}

const BRAND_TOKENS = ['--brand', '--brand-surface', '--brand-line', '--brand-fg', '--brand-muted', '--primary-text'];
const MOTION_TOKENS = ['--ease-out', '--ease-spring', '--dur-fast', '--dur-base', '--dur-slow', '--dur-hero'];

test('la zona de marca existe en los dos temas y es oscura en ambos', () => {
    for (const selector of [':root', '.dark']) {
        const body = block(selector);
        for (const token of BRAND_TOKENS) assert.match(body, new RegExp(`${token}:`), `${selector} no define ${token}`);
    }
    // Siempre oscura: el mismo negro de marca en claro y en oscuro.
    assert.match(block(':root'), /--brand:\s*#0b0b0c/i);
    assert.match(block('.dark'), /--brand:\s*#0b0b0c/i);
});

test('los tokens de movimiento existen en :root', () => {
    const body = block(':root');
    for (const token of MOTION_TOKENS) assert.match(body, new RegExp(`${token}:`), `falta ${token}`);
});

test('Tailwind expone la zona de marca y las fuentes nuevas', () => {
    const theme = block('@theme inline');
    for (const name of ['--color-brand:', '--color-brand-surface:', '--color-brand-line:', '--color-brand-fg:', '--color-brand-muted:', '--color-primary-text:']) {
        assert.ok(theme.includes(name), `@theme no expone ${name}`);
    }
    assert.match(theme, /--font-display:\s*var\(--font-barlow-condensed\)/);
    assert.match(theme, /--font-mono:\s*var\(--font-inter\)/);
    assert.doesNotMatch(css, /--font-oswald|--font-geist-mono/, 'quedan referencias a fuentes retiradas');
});
