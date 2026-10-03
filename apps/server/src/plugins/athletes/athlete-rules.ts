import {
    ATHLETE_CODE_PATTERN,
    ATHLETE_DISCOUNT_TYPES,
    ATHLETE_REWARD_TYPES,
    AthleteDiscountType,
    AthleteRewardStatus,
    AthleteRewardType,
} from './constants';

/**
 * Reglas de negocio puras de los códigos y recompensas de atleta (sin base de
 * datos ni Nest), para poder testearlas directamente. Las comparten el servicio,
 * la PromotionCondition y los manejadores de eventos.
 */

/**
 * Vendure compara los códigos de cupón sin distinguir mayúsculas
 * (PromotionService.validateCouponCode compara con LOWER()), así que los códigos de
 * atleta siguen la misma estrategia: se guardan en una forma canónica en
 * mayúsculas, con lo que "pedro10" y "PEDRO10" son el mismo código y un índice
 * único normal rechaza los duplicados.
 */
export function normalizeAthleteCode(code: string): string {
    return code.trim().toUpperCase();
}

export interface AthleteCodeTerms {
    discountType: AthleteDiscountType;
    discountValue: number;
    rewardType: AthleteRewardType;
    rewardValue: number;
}

/** Devuelve el motivo legible si el código o sus condiciones no son válidos, o undefined si lo son. */
export function validateAthleteCodeInput(input: { code: string } & AthleteCodeTerms): string | undefined {
    if (!ATHLETE_CODE_PATTERN.test(normalizeAthleteCode(input.code))) {
        return 'The code must be 3-32 characters long and contain only letters, digits, "-" or "_"';
    }
    if (!ATHLETE_DISCOUNT_TYPES.includes(input.discountType)) {
        return `Unknown discount type "${input.discountType}"`;
    }
    if (!ATHLETE_REWARD_TYPES.includes(input.rewardType)) {
        return `Unknown reward type "${input.rewardType}"`;
    }
    if (!Number.isFinite(input.discountValue) || input.discountValue < 0) {
        return 'The customer discount must be a number greater than or equal to 0';
    }
    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
        return 'A percentage discount cannot exceed 100%';
    }
    if (input.discountType === 'FIXED_AMOUNT' && !Number.isInteger(input.discountValue)) {
        return 'A fixed discount must be a whole number of cents';
    }
    if (!Number.isFinite(input.rewardValue) || input.rewardValue < 0) {
        return 'The athlete reward must be a number greater than or equal to 0';
    }
    if (input.rewardType === 'PERCENTAGE' && input.rewardValue > 100) {
        return 'A percentage reward cannot exceed 100%';
    }
    if (input.rewardType === 'FIXED_POINTS' && !Number.isInteger(input.rewardValue)) {
        return 'A fixed reward must be a whole number of points';
    }
    if (hasMoreThanTwoDecimals(input.discountValue) || hasMoreThanTwoDecimals(input.rewardValue)) {
        return 'Percentages allow at most two decimals';
    }
    return undefined;
}

function hasMoreThanTwoDecimals(value: number): boolean {
    return Math.abs(Math.round(value * 100) - value * 100) > 1e-9;
}

/**
 * Puntos que gana un atleta por un pedido. Las recompensas PERCENTAGE usan el
 * valor del punto del programa de fidelización, así que «5 %» significa que la
 * recompensa vale el 5 % de la base al canjearla: con el valor por defecto
 * (1 punto = 1 céntimo), un 5 % sobre 100 € son 500 puntos (5 €). Se redondea
 * hacia abajo, como en la acumulación normal.
 */
export function calculateRewardPoints(
    rewardType: AthleteRewardType,
    rewardValue: number,
    baseAmountCents: number,
    pointValueInCents: number,
): number {
    if (rewardType === 'FIXED_POINTS') {
        return Math.max(0, Math.floor(rewardValue));
    }
    if (baseAmountCents <= 0 || pointValueInCents <= 0) {
        return 0;
    }
    // Aritmética entera en centésimas de porcentaje para evitar errores de coma
    // flotante (p. ej. 10000 * 0.07 = 700.0000000000001).
    const basisPoints = Math.round(rewardValue * 100);
    const rewardCents = Math.floor((baseAmountCents * basisPoints) / 10000);
    return Math.floor(rewardCents / pointValueInCents);
}

/**
 * Puntos a revertir por un reembolso (parcial): proporcionales a la parte
 * reembolsada del pedido y con el tope de lo que aún no se ha revertido. Es la
 * misma regla proporcional que aplica LoyaltyService.revertForRefund a los
 * puntos normales.
 */
export function calculateRefundReversal(
    rewardPoints: number,
    alreadyReverted: number,
    refundTotal: number,
    orderTotalWithTax: number,
): number {
    const remaining = rewardPoints - alreadyReverted;
    if (remaining <= 0) {
        return 0;
    }
    const proportion = orderTotalWithTax > 0 ? Math.min(1, Math.max(0, refundTotal / orderTotalWithTax)) : 1;
    return Math.min(remaining, Math.round(rewardPoints * proportion));
}

export function rewardStatusFor(points: number, reverted: number): AthleteRewardStatus {
    if (reverted <= 0) {
        return 'ACTIVE';
    }
    return reverted >= points ? 'REVERTED' : 'PARTIALLY_REVERTED';
}

/**
 * De los códigos de cupón aplicados a un pedido (en el orden en que se
 * aplicaron), devuelve el primero que sea de atleta. Solo ese cuenta: un pedido
 * abona como mucho a un atleta y el cliente no puede acumular varios descuentos
 * de atleta.
 */
export function firstAthleteCode(orderCouponCodes: string[], athleteCodes: Iterable<string>): string | undefined {
    const known = new Set([...athleteCodes].map(normalizeAthleteCode));
    return orderCouponCodes.map(normalizeAthleteCode).find(code => known.has(code));
}
