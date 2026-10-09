import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';

/* eslint-disable @typescript-eslint/no-var-requires */
const { WebpAssetPreviewStrategy, PREVIEW_MAX_SIZE } = require('./webp-asset-preview-strategy');
const { PosixAssetNamingStrategy } = require('./posix-asset-naming-strategy');
const { CappedImageTransformStrategy, MAX_TRANSFORM_SIZE } = require('./capped-image-transform-strategy');

const ctx = {} as never;

function image(width: number, height: number, alpha = false) {
    return sharp({
        create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 231, g: 0, b: 11, alpha: 0.5 } : '#e7000b' },
    });
}

test('a large PNG becomes a WebP preview no bigger than the maximum, keeping transparency', async () => {
    const png = await image(3000, 1500, true).png().toBuffer();
    const preview = await new WebpAssetPreviewStrategy().generatePreviewImage(ctx, 'image/png', png);
    const meta = await sharp(preview).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, PREVIEW_MAX_SIZE);
    assert.equal(meta.height, PREVIEW_MAX_SIZE / 2);
    assert.equal(meta.hasAlpha, true);
});

test('a small JPEG is converted to WebP without being enlarged', async () => {
    const jpeg = await image(800, 600).jpeg().toBuffer();
    const meta = await sharp(await new WebpAssetPreviewStrategy().generatePreviewImage(ctx, 'image/jpeg', jpeg)).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 800, 600]);
});

test('EXIF orientation is applied and metadata is dropped', async () => {
    // Orientación 6: la foto se guardó tumbada y hay que girarla 90°.
    const jpeg = await image(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const meta = await sharp(await new WebpAssetPreviewStrategy().generatePreviewImage(ctx, 'image/jpeg', jpeg)).metadata();
    assert.deepEqual([meta.width, meta.height, meta.orientation, meta.exif], [200, 400, undefined, undefined]);
});

test('GIF keeps the stock behaviour (stays GIF)', async () => {
    const gif = await image(100, 100).gif().toBuffer();
    const meta = await sharp(await new WebpAssetPreviewStrategy().generatePreviewImage(ctx, 'image/gif', gif)).metadata();
    assert.equal(meta.format, 'gif');
});

test('a corrupt image still gets a WebP preview (generic icon)', async () => {
    const preview = await new WebpAssetPreviewStrategy().generatePreviewImage(ctx, 'image/png', Buffer.from('not an image'));
    assert.equal((await sharp(preview).metadata()).format, 'webp');
});

test('raster previews are named .webp; the source keeps its name', () => {
    const naming = new PosixAssetNamingStrategy();
    assert.match(naming.generatePreviewFileName(ctx, 'noticia_creatina.png'), /^preview\/[0-9a-f]{2}\/noticia_creatina__preview\.webp$/);
    assert.match(naming.generatePreviewFileName(ctx, 'foto.jpg'), /__preview\.webp$/);
    assert.match(naming.generatePreviewFileName(ctx, 'bote.webp'), /__preview\.webp$/);
    assert.match(naming.generatePreviewFileName(ctx, 'animacion.gif'), /__preview\.gif$/);
    assert.match(naming.generateSourceFileName(ctx, 'noticia_creatina.png'), /noticia_creatina\.png$/);
});

test('a name conflict still produces a numbered .webp preview', () => {
    const naming = new PosixAssetNamingStrategy();
    const first = naming.generatePreviewFileName(ctx, 'foto.png');
    assert.match(naming.generatePreviewFileName(ctx, 'foto.png', first), /foto__preview__02\.webp$/);
});

test('requested transform sizes are capped, presets and other parameters pass through', () => {
    const strategy = new CappedImageTransformStrategy();
    const base = { mode: 'crop', quality: undefined, format: 'webp', fpx: 0.5, fpy: 0.5, preset: undefined };
    assert.deepEqual(
        strategy.getImageTransformParameters({ input: { ...base, width: 10000, height: 300 } }),
        { ...base, width: MAX_TRANSFORM_SIZE, height: 300 },
    );
    assert.deepEqual(
        strategy.getImageTransformParameters({ input: { ...base, width: undefined, height: undefined, preset: 'thumb' } }),
        { ...base, width: undefined, height: undefined, preset: 'thumb' },
    );
});
