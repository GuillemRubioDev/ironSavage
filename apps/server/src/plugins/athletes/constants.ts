export const loggerCtx = 'AthletesPlugin';

/** Código de la PromotionCondition que llevan las Promotion de todos los códigos de atleta. */
export const ATHLETE_PROMOTION_CONDITION_CODE = 'athlete_code';

/** Cómo se calcula el descuento del cliente; corresponde 1:1 a una PromotionAction estándar de Vendure. */
export const ATHLETE_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type AthleteDiscountType = (typeof ATHLETE_DISCOUNT_TYPES)[number];

/**
 * Cómo se calcula la recompensa del atleta:
 * - PERCENTAGE: un % de la base del pedido, convertido a puntos con el valor de
 *   canje del programa de fidelización (`pointValueInCents`).
 * - FIXED_POINTS: un número fijo de puntos por pedido válido.
 */
export const ATHLETE_REWARD_TYPES = ['PERCENTAGE', 'FIXED_POINTS'] as const;
export type AthleteRewardType = (typeof ATHLETE_REWARD_TYPES)[number];

export const ATHLETE_REWARD_STATUSES = ['ACTIVE', 'PARTIALLY_REVERTED', 'REVERTED'] as const;
export type AthleteRewardStatus = (typeof ATHLETE_REWARD_STATUSES)[number];

export const ATHLETE_REVERSAL_REASONS = ['ORDER_CANCELLED', 'REFUND', 'MANUAL'] as const;
export type AthleteReversalReason = (typeof ATHLETE_REVERSAL_REASONS)[number];

/** Solo mayúsculas, dígitos, '-' y '_', sin espacios, para que el código sea igual escrito o dictado. */
export const ATHLETE_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
