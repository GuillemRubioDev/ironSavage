import sharp from 'sharp';
import {OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, PREVIEW_PATH} from './og-image-path';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;

/**
 * Imagen para compartir (WhatsApp, redes): la preview entera, sin recortar, encajada
 * en 1200×630 sobre fondo blanco y en JPG, que es lo que aceptan todas las redes (la
 * preview es WebP y puede tener transparencia, que en JPG saldría negra; WhatsApp
 * además ignora imágenes de más de ~300 KB). Así queda en ~60-120 KB.
 *
 * Se genera al vuelo y se cachea en el navegador y en los rastreadores: la URL de una
 * preview no cambia de contenido. Solo la piden los rastreadores de las redes al
 * compartir un enlace, así que no hace falta otra caché.
 */
export async function GET(req: Request) {
    const src = new URL(req.url).searchParams.get('src') ?? '';
    if (!VENDURE_API_URL || !PREVIEW_PATH.test(src)) {
        return new Response('Bad request', {status: 400});
    }

    const upstream = await fetch(`${new URL(VENDURE_API_URL).origin}/assets/${src}`);
    if (!upstream.ok) {
        return new Response('Not found', {status: 404});
    }

    const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer()))
        .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, {fit: 'contain', background: '#ffffff'})
        .flatten({background: '#ffffff'})
        .jpeg({quality: 82, mozjpeg: true})
        .toBuffer();

    return new Response(new Uint8Array(jpeg), {
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}
