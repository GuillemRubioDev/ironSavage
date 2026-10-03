import { DEFAULT_LOYALTY_OPTIONS } from './constants';
import type { LoyaltyConfig, LoyaltyPluginOptions } from './types';

/**
 * Los puntos son una regla de negocio configurable de la tienda (como un ajuste de
 * precios o promociones), no un secreto: se pasan con las opciones de
 * `LoyaltyPlugin.init({...})` al arrancar, a diferencia de la configuración de
 * Redsys por variables de entorno, que guarda secretos y URLs de cada despliegue.
 */
let cached: LoyaltyConfig | undefined;

export function setLoyaltyConfig(options: LoyaltyPluginOptions): void {
    cached = {
        pointsPerEuro: options.pointsPerEuro ?? DEFAULT_LOYALTY_OPTIONS.pointsPerEuro,
        pointValueInCents: options.pointValueInCents ?? DEFAULT_LOYALTY_OPTIONS.pointValueInCents,
        minRedeemablePoints: options.minRedeemablePoints ?? DEFAULT_LOYALTY_OPTIONS.minRedeemablePoints,
        maxDiscountPerOrderCents: options.maxDiscountPerOrderCents ?? DEFAULT_LOYALTY_OPTIONS.maxDiscountPerOrderCents,
    };
}

export function getLoyaltyConfig(): LoyaltyConfig {
    if (!cached) {
        // Usa los valores por defecto para que los tests unitarios (y cualquier código
        // que corra antes del hook `configuration` del plugin) tengan valores razonables.
        cached = { ...DEFAULT_LOYALTY_OPTIONS };
    }
    return cached;
}
