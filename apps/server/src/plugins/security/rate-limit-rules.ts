export interface WindowLimit {
    limit: number;
    windowMs: number;
}

export interface RateLimitRule {
    name: string;
    /** Matches the GraphQL mutation field being invoked, e.g. `login(` — checked against the raw query string. */
    fieldPattern: RegExp;
    /** Applies regardless of identifier — stops one IP hammering many different accounts. */
    perIp: WindowLimit;
    /** Applies regardless of IP — stops a distributed attack against one specific account. */
    perIdentifier?: WindowLimit;
    /** The tightest of the three: stops one IP repeatedly guessing one specific account. */
    perIpAndIdentifier?: WindowLimit;
    /** Which GraphQL variable names, in priority order, identify "who" this attempt is about. */
    identifierVariables: string[];
    /** Whether the response outcome (success/failure) should be logged as a security event. */
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

/** Returns the first variable value found among `names`, coerced to a short safe string, or undefined. */
export function extractIdentifier(variables: unknown, names: string[]): string | undefined {
    if (!variables || typeof variables !== 'object') return undefined;
    for (const name of names) {
        const value = (variables as Record<string, unknown>)[name];
        if (typeof value === 'string' && value.length > 0) {
            // Cap length defensively — this is used as part of a rate-limit key and a log field, never executed/parsed.
            return value.slice(0, 200);
        }
    }
    return undefined;
}
