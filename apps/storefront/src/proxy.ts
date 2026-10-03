import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
import {routing} from './platform/i18n/routing';
import {GA_MEASUREMENT_ID} from './platform/analytics/gtag';

const middleware = createMiddleware(routing);

/**
 * CSP built from what this project actually loads, not a generic template —
 * but WITHOUT a script-src nonce, deliberately. A per-request nonce was
 * tried and verified live (real browser, production build) to break
 * hydration on every single route: Next's own injected inline/streaming
 * scripts (the Suspense-resume `$RC` helper) never ended up carrying a nonce
 * that matched the one in this response's CSP header, regardless of routing
 * the nonce through NextResponse.next({request:{headers}}) as Next's own
 * docs describe — every load produced "Refused to execute inline script"
 * violations, `$RC is not defined`, and React hydration failures (#419) on
 * this app's combination of next-intl middleware + cacheComponents/PPR +
 * streaming. Given the explicit priority of not breaking the storefront,
 * 'unsafe-inline' is kept for script-src rather than ship something that
 * silently breaks every page's interactivity. This still meaningfully
 * restricts: no script/style/image/connection/form-submission/frame/object
 * from an unlisted origin — it just doesn't add inline-script-injection
 * XSS mitigation on top of the sanitization already done at
 * platform/security/sanitize-html.ts. Revisit if a future Next.js version
 * makes nonce+PPR+streaming actually work together on this stack.
 *
 * - fonts: next/font/google self-hosts font files at build time (see
 *   site/locale-layout.tsx) — no runtime request to fonts.googleapis.com.
 * - images: next/image only ever resolves through the hosts already
 *   declared in next.config.ts's images.remotePatterns.
 * - Redsys: checkout builds and submits a real <form> that navigates the
 *   browser to Redsys (review-step.tsx's submitRedsysRedirect) — that's a
 *   `form-action` concern, not `connect-src` (no fetch/XHR to Redsys ever
 *   happens from the browser). Both the test and production Redsys hosts are
 *   allowed unconditionally, since REDSYS_ENVIRONMENT can be "test" even
 *   while NODE_ENV is "production" (see production-safety.ts on the server).
 *
 * Only applied outside development — dev relies on eval/HMR behaviour that a
 * strict CSP would break, matching the existing dangerouslyAllowLocalIP/
 * poweredByHeader convention in next.config.ts of gating hardening to prod.
 */
function buildCsp(): string {
    // Google Analytics 4 (only when configured — see platform/analytics/gtag.ts):
    // the hosts Google documents for GA4 under a CSP.
    const ga = GA_MEASUREMENT_ID
        ? {
            script: ' https://*.googletagmanager.com',
            img: ' https://*.google-analytics.com https://*.googletagmanager.com',
            connect: ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com',
        }
        : {script: '', img: '', connect: ''};
    const imageHosts = [
        'https://readonlydemo.vendure.io',
        'https://demo.vendure.io',
        ...(process.env.API_DOMAIN ? [`https://${process.env.API_DOMAIN}`] : []),
    ];
    return [
        `default-src 'self'`,
        `script-src 'self' 'unsafe-inline'${ga.script}`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: ${imageHosts.join(' ')}${ga.img}`,
        `font-src 'self'`,
        `connect-src 'self'${ga.connect}`,
        `form-action 'self' https://sis-t.redsys.es:25443 https://sis.redsys.es`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `object-src 'none'`,
    ].join('; ');
}

export function proxy(request: NextRequest) {
    const response = middleware(request);
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Content-Security-Policy', buildCsp());
    }
    return response;
}

export const config = {matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']};
