import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = await readFile(path.join(import.meta.dirname, '..', '..', 'src', 'components', 'ui', 'button.tsx'), 'utf8');

test('las variantes existentes siguen existiendo (no se rompe ningún uso)', () => {
    for (const v of ['default:', 'outline:', 'secondary:', 'ghost:', 'destructive:', 'link:']) assert.ok(src.includes(v), `falta la variante ${v}`);
    for (const s of ['xs:', 'sm:', 'lg:', 'icon:', '"icon-xs":', '"icon-sm":', '"icon-lg":']) assert.ok(src.includes(s), `falta el tamaño ${s}`);
});

test('nuevas variante brand y tamaño xl, y respuesta al pulsar', () => {
    assert.ok(src.includes('brand:'), 'falta la variante brand');
    assert.ok(src.includes('xl:'), 'falta el tamaño xl');
    assert.match(src, /active:scale-\[\.97\]/);
});
