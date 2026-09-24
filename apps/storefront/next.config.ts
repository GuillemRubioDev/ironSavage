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
    // Drops the "X-Powered-By: Next.js" response header — a small
    // fingerprinting/info-disclosure reduction, no functional effect.
    poweredByHeader: false,
    images: {
        // Only needed so the Image Optimization API can fetch from a local
        // Vendure instance during development (localhost/127.0.0.1 asset
        // URLs). Left on in production, this widens the Image API's fetch
        // target to any local/private IP the container can reach — real
        // exposure given the Image Optimization API itself was the subject
        // of a critical unauthenticated-RCE advisory (GHSA-2xp9-vwfh-vxw4,
        // fixed by upgrading Next.js — see package.json). Gating it to dev
        // removes that surface in production without needing it there:
        // ASSET_URL_PREFIX is always a real https:// domain outside dev.
        dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
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
