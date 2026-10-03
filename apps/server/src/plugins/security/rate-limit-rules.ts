export interface WindowLimit {
    limit: number;
    windowMs: number;
}

export interface RateLimitRule {
    name: string;
    /** Coincide con el campo de mutación GraphQL invocado, p. ej. `login(`; se comprueba sobre el texto de la consulta. */
    fieldPattern: RegExp;
    /** Se aplica sea cual sea el identificador: frena a una IP que ataca muchas cuentas distintas. */
    perIp: WindowLimit;
    /** Se aplica sea cual sea la IP: frena un ataque distribuido contra una cuenta concreta. */
    perIdentifier?: WindowLimit;
    /** El más estricto de los tres: frena a una IP que prueba una y otra vez con una cuenta concreta. */
    perIpAndIdentifier?: WindowLimit;
    /** Qué variables GraphQL, por orden de prioridad, identifican a «quién» se refiere el intento. */
    identifierVariables: string[];
    /** Si el resultado (éxito/fallo) debe registrarse como evento de seguridad. */
    logOutcome: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_LIMIT_RULES: RateLimitRule[] = [
    {
        name: 'login',
        fieldPattern: /\b(login|authenticate)\s*\(/,
        perIp: { limit: 30, windowMs: 15 * MINUTE },
        perIdentifier: { limit: 10, windowMs: 15 * MINUTE },
        perIpAndIdentifier: { limit: 5, windowMs: 15 * MINUTE },
        identifierVariables: ['username', 'emailAddress'],
        logOutcome: true,
    },
    {
        name: 'register',
        fieldPattern: /\bregisterCustomerAccount\s*\(/,
        perIp: { limit: 10, windowMs: HOUR },
        perIdentifier: { limit: 3, windowMs: HOUR },
        identifierVariables: ['emailAddress'],
        logOutcome: true,
    },
    {
        name: 'password-reset',
        fieldPattern: /\brequestPasswordReset\s*\(/,
        perIp: { limit: 10, windowMs: HOUR },
        perIdentifier: { limit: 3, windowMs: HOUR },
        identifierVariables: ['emailAddress'],
        logOutcome: false,
    },
    {
        name: 'verify',
        fieldPattern: /\b(verifyCustomerAccount|refreshCustomerVerification)\s*\(/,
        perIp: { limit: 15, windowMs: HOUR },
        perIdentifier: { limit: 5, windowMs: HOUR },
        identifierVariables: ['token', 'emailAddress'],
        logOutcome: false,
    },
    {
        name: 'coupon',
        fieldPattern: /\bapplyCouponCode\s*\(/,
        perIp: { limit: 20, windowMs: 10 * MINUTE },
        identifierVariables: ['couponCode'],
        logOutcome: false,
    },
];

/** Devuelve el primer valor de variable encontrado entre `names`, convertido a un texto corto y seguro, o undefined. */
export function extractIdentifier(variables: unknown, names: string[]): string | undefined {
    if (!variables || typeof variables !== 'object') return undefined;
    for (const name of names) {
        const value = (variables as Record<string, unknown>)[name];
        if (typeof value === 'string' && value.length > 0) {
            // Se limita la longitud por precaución: se usa en una clave de límite y en un campo del log, nunca se ejecuta ni se interpreta.
            return value.slice(0, 200);
        }
    }
    return undefined;
}
