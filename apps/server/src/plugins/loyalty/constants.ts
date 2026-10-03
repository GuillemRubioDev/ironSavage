export const loggerCtx = 'LoyaltyPlugin';

// ATHLETE_REWARD / ATHLETE_REWARD_REVERSAL los escribe AthletesPlugin (puntos que
// gana un atleta cuando otro compra con su código, y su reversión al cancelar o
// reembolsar). Están en este mismo libro de movimientos para que el atleta los
// canjee exactamente igual que cualquier cliente.
export const LOYALTY_TRANSACTION_TYPES = ['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT', 'EXPIRE', 'ATHLETE_REWARD', 'ATHLETE_REWARD_REVERSAL'] as const;
export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number];

/** Valores por defecto razonables; se pueden cambiar con `LoyaltyPlugin.init({...})`. */
export const DEFAULT_LOYALTY_OPTIONS = {
    pointsPerEuro: 1,
    pointValueInCents: 1,
    minRedeemablePoints: 100,
    maxDiscountPerOrderCents: 2000,
} as const;
