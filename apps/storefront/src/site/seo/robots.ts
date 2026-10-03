import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/config/metadata';

/**
 * /robots.txt: deja que los buscadores indexen la tienda y les indica el sitemap,
 * pero los mantiene fuera de las páginas personales y de compra (cuenta, carrito,
 * checkout, confirmaciones de pedido), que no tienen nada que indexar.
 */
export default function robots(): MetadataRoute.Robots {
    const baseUrl = SITE_URL.replace(/\/$/, '');
    const privatePaths = ['/mi-cuenta', '/carrito', '/checkout', '/order-confirmation', '/verify', '/verify-pending', '/reset-password'];
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [...privatePaths, ...privatePaths.map((p) => `/en${p}`)],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
