import {NextRequest, NextResponse} from 'next/server';
import {getAuthToken} from '@/platform/vendure/auth-token';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

/**
 * Este storefront nunca habla con Vendure con una cookie de sesión visible para el
 * navegador: cada petición lleva un token bearer reenviado desde el servidor (ver
 * platform/vendure/api.ts). La descarga de un PDF no puede pasar por ese cliente
 * GraphQL, pero necesita la misma autenticación, así que esto hace de intermediario:
 * lee el token de la cookie de autenticación de esta aplicación, lo reenvía a
 * `/invoices/:id/pdf` del backend y devuelve la respuesta. La comprobación real de
 * propiedad la sigue haciendo el backend (ver InvoicingController); este
 * intermediario no añade lógica de autorización, solo pasa el token.
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
