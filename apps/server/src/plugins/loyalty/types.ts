import type { Order, RequestContext } from '@vendure/core';

export interface LoyaltyPluginOptions {
    /** Puntos ganados por cada euro entero gastado (sobre Order.totalWithTax). */
    pointsPerEuro?: number;
    /** Valor de un punto en céntimos al canjearlo como descuento. */
    pointValueInCents?: number;
    /** Mínimo de puntos que un cliente debe canjear de una vez. */
    minRedeemablePoints?: number;
    /** Descuento máximo (en céntimos) que los puntos pueden aplicar a un pedido. */
    maxDiscountPerOrderCents?: number;
}

/**
 * Permite a otro plugin anular la regla normal de «ganar puntos con tu propia
 * compra» en pedidos concretos sin que LoyaltyPlugin sepa por qué; p. ej.
 * AthletesPlugin lo usa para que los atletas no ganen los puntos de cliente normal.
 * Se registra al arrancar con `LoyaltyService.registerEarnPolicy()`.
 */
export interface LoyaltyEarnPolicy {
    /** Identificador corto; solo se usa en los mensajes de log. */
    name: string;
    /** Devuelve false para no dar el EARN normal en este pedido. */
    canEarnForOrder(ctx: RequestContext, order: Order): Promise<boolean>;
}

export interface LoyaltyConfig {
    pointsPerEuro: number;
    pointValueInCents: number;
    minRedeemablePoints: number;
    maxDiscountPerOrderCents: number;
}
