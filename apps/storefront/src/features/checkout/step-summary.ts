/**
 * Resumen de una línea de cada paso ya completado del checkout ("Calle Mayor 1, 28001
 * Madrid", "Envío estándar"…), que se ve en el panel plegado junto a "Cambiar". Sin
 * dependencias: se prueba con node --test. Sin datos devuelve null (nunca un texto vacío).
 */
export type CheckoutStepId = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review';

export function stepSummary(step: CheckoutStepId, data: {
    email?: string | null;
    address?: {streetLine1?: string | null; city?: string | null; postalCode?: string | null} | null;
    shippingMethodName?: string | null;
    paymentMethodName?: string | null;
}): string | null {
    switch (step) {
        case 'contact':
            return data.email || null;
        case 'shipping': {
            const street = data.address?.streetLine1;
            if (!street) return null;
            const place = [data.address?.postalCode, data.address?.city].filter(Boolean).join(' ');
            return place ? `${street}, ${place}` : street;
        }
        case 'delivery':
            return data.shippingMethodName || null;
        case 'payment':
            return data.paymentMethodName || null;
        default:
            return null;
    }
}
