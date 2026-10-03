export type AppEnv = 'dev' | 'test' | 'production';

/**
 * Un APP_ENV sin definir o desconocido se trata como 'production': ante la duda,
 * lo más seguro. Es una función y no una constante calculada de antemano:
 * vendure-config.ts carga `dotenv/config` él mismo, así que process.env.APP_ENV no
 * existe hasta que se ejecuta ese import, y evaluarlo al cargar este módulo podría
 * leer un valor vacío según el orden de los imports.
 */
export function getAppEnv(): AppEnv {
    const value = process.env.APP_ENV;
    return value === 'dev' || value === 'test' ? value : 'production';
}

/**
 * El handler de pago de pruebas (se liquida solo, no cobra nada) debe
 * registrarse en los `paymentMethodHandlers` de vendure-config.ts exactamente en
 * los mismos entornos en los que seed.ts crea el método de pago que lo usa; si no,
 * ese método apuntaría a un handler no registrado. Los dos sitios importan esta
 * misma función para que no se desincronicen.
 */
export function includeDummyPaymentHandler(): boolean {
    return getAppEnv() !== 'production';
}
