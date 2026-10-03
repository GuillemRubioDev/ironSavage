import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/config/metadata';

/**
 * /robots.txt — lets search engines index the shop and points them at the
 * sitemap, but keeps them out of per-customer and transactional pages
 * (account, cart, checkout, order confirmations) that have nothing to index.
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
