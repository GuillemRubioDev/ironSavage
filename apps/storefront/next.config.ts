import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

const nextConfig: NextConfig = {
    // Produces .next/standalone — a self-contained server bundle with only
    // the node_modules actually used (traced), instead of needing the full
    // workspace node_modules at runtime. This is what makes a lean
    // production Docker image possible.
    output: 'standalone',
    cacheComponents: true,
    images: {
        // This is necessary to display images from your local Vendure instance
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            {
                hostname: 'readonlydemo.vendure.io',
            },
            {
                hostname: 'demo.vendure.io'
            },
            {
                hostname: 'localhost'
            },
            // Production: product images are served from ASSET_URL_PREFIX,
            // which points at the public API domain behind the reverse proxy.
            ...(process.env.API_DOMAIN ? [{
                protocol: 'https' as const,
                hostname: process.env.API_DOMAIN,
            }] : []),
        ],
    },
};

export default withNextIntl(nextConfig);
