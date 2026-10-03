import { Logger } from '@vendure/core';

const loggerCtx = 'ProductionSafety';

/**
 * Origen CORS de las APIs Admin y Shop. En desarrollo es permisivo (`true`:
 * acepta cualquier Origin), lo cual vale porque nada está expuesto a internet.
 * En producción, el valor por defecto de Vendure también es `true` con
 * `credentials: true` (acepta cualquier Origin y permite cookies), lo que dejaría
 * a cualquier web hacer peticiones con la sesión iniciada de un administrador o
 * cliente. Hay que fijar CORS_ORIGIN (separado por comas); si falta, se usa solo
 * STOREFRONT_URL, que ya es obligatoria, pero se recomienda un CORS_ORIGIN
 * explícito para poder incluir también el origen del dashboard si algún día se
 * sirve desde otro servidor.
 */
export function getCorsOrigin(isDev: boolean): true | string[] {
    if (isDev) {
        return true;
    }
    const explicit = process.env.CORS_ORIGIN;
    if (explicit) {
        return explicit.split(',').map(origin => origin.trim()).filter(Boolean);
    }
    if (process.env.STOREFRONT_URL) {
        return [process.env.STOREFRONT_URL.replace(/\/$/, '')];
    }
    throw new Error(
        'Refusing to start in production without a CORS origin configured. Set CORS_ORIGIN ' +
            '(comma-separated list of allowed origins) or STOREFRONT_URL.',
    );
}

/**
 * El valor que traía la plantilla (`assetUrlPrefix: 'https://www.my-shop.com/assets/'`)
 * es un dominio de ejemplo que nunca se cambió: en producción, todas las URLs de
 * recursos de la API apuntarían a un dominio que no es de nadie. Se exige un
 * valor explícito en vez de adivinarlo.
 */
export function getAssetUrlPrefix(isDev: boolean): string | undefined {
    if (isDev) {
        return undefined;
    }
    const prefix = process.env.ASSET_URL_PREFIX;
    if (!prefix) {
        throw new Error(
            'Refusing to start in production without ASSET_URL_PREFIX set (e.g. https://api.yourshop.com/assets/) ' +
                '— leaving this unset would serve broken image URLs pointing at the Vendure scaffold\'s placeholder domain.',
        );
    }
    return prefix;
}

/**
 * Comprobaciones no bloqueantes para el típico «se me olvidó cambiar un ajuste»
 * que rompe producción sin un error evidente: la app en modo producción con
 * Redsys aún apuntando a su entorno de pruebas, o los emails cayendo sin avisar
 * al proveedor de desarrollo (que guarda en un archivo local los tokens reales de
 * verificación y contraseña de los clientes en vez de enviarlos). Solo se
 * ejecutan fuera de desarrollo y solo avisan: no impiden arrancar, porque una
 * tienda puede abrir sin email configurado, pero quien la opera debe verlo bien claro.
 */
export function runProductionSafetyChecks(isDev: boolean): void {
    if (isDev) {
        return;
    }
    if (process.env.REDSYS_ENVIRONMENT !== 'production') {
        Logger.warn(
            'APP_ENV is not "dev" but REDSYS_ENVIRONMENT is not "production" — payments will go through the Redsys ' +
                'TEST gateway. If this is a real production deployment, set REDSYS_ENVIRONMENT=production.',
            loggerCtx,
        );
    }
    const emailProviderConfigured =
        process.env.EMAIL_PROVIDER === 'smtp' && !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
    if (process.env.EMAIL_ENABLED !== 'false' && !emailProviderConfigured) {
        Logger.warn(
            'APP_ENV is not "dev" but no real email provider is configured (EMAIL_PROVIDER/SMTP_* are unset or ' +
                'incomplete) — transactional emails (verification, password reset, order confirmations) will fall ' +
                'back to writing to local files instead of being delivered. Set EMAIL_PROVIDER=smtp and the SMTP_* ' +
                'vars, or set EMAIL_ENABLED=false to silence this if that is intentional.',
            loggerCtx,
        );
    }
}
