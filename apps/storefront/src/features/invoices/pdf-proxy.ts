import {NextRequest, NextResponse} from 'next/server';
import {getAuthToken} from '@/platform/vendure/auth-token';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

/**
 * This storefront never talks to Vendure with a browser-visible session
 * cookie — every request carries a bearer token forwarded server-side (see
 * platform/vendure/api.ts). A PDF download can't go through that GraphQL
 * client, but it still needs the same bearer auth, so this proxies the
 * request: read the token from this app's own auth cookie, forward it to
 * the backend's `/invoices/:id/pdf`, and stream the response back. The
 * backend still does the real ownership check (see InvoicingController) —
 * this proxy adds no authorization logic of its own, only the token relay.
 */
export async function GET(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
    if (!VENDURE_API_URL) {
        return new NextResponse('Server misconfigured', {status: 500});
    }

    const {id} = await params;
    const token = await getAuthToken();
    if (!token) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const backendOrigin = new URL(VENDURE_API_URL).origin;
    const response = await fetch(`${backendOrigin}/invoices/${encodeURIComponent(id)}/pdf`, {
        headers: {
            Authorization: `Bearer ${token}`,
            [VENDURE_CHANNEL_TOKEN_HEADER]: VENDURE_CHANNEL_TOKEN,
        },
    });

    if (!response.ok) {
        return new NextResponse(response.statusText, {status: response.status});
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
            'Content-Disposition': response.headers.get('Content-Disposition') || 'inline',
        },
    });
}
