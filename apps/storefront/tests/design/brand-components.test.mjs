import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const dir = path.join(import.meta.dirname, '..', '..', 'src', 'components', 'brand');
const read = f => readFile(path.join(dir, f), 'utf8').catch(() => '');

test('existen los componentes de marca y exportan su nombre', async () => {
    for (const [file, name] of [['marquee.tsx', 'Marquee'], ['brand-band.tsx', 'BrandBand'], ['section-header.tsx', 'SectionHeader'], ['trust-strip.tsx', 'TrustStrip']]) {
        assert.match(await read(file), new RegExp(`export function ${name}\\b`), `${file} no exporta ${name}`);
    }
});

test('la cinta es accesible: lista con nombre y copia duplicada oculta a lectores de pantalla', async () => {
    const src = await read('marquee.tsx');
    assert.match(src, /aria-label=\{label\}/);
    assert.match(src, /aria-hidden=\{hidden \? 'true' : undefined\}/);
});

test('los componentes de marca no dependen de site/ ni de features/', async () => {
    for (const f of ['marquee.tsx', 'brand-band.tsx', 'section-header.tsx', 'trust-strip.tsx']) {
        assert.doesNotMatch(await read(f), /from '@\/(site|features)\//, `${f} importa de site/ o features/`);
    }
});
