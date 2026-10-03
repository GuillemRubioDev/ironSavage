import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { setLoyaltyConfig } from './loyalty-config';
import { LoyaltyAccount } from './loyalty-account.entity';
import { LoyaltyAdminResolver } from './loyalty-admin.resolver';
import { LoyaltyEventSubscriber } from './loyalty-event-subscriber';
import { LoyaltyShopResolver } from './loyalty-shop.resolver';
import { LoyaltyTransaction } from './loyalty-transaction.entity';
import { LoyaltyService } from './loyalty.service';
import type { LoyaltyPluginOptions } from './types';

/**
 * Programa de puntos de fidelización: los clientes ganan puntos con los pagos
 * cobrados y pueden canjearlos como descuento en un pedido. Totalmente
 * independiente: no modifica nada del núcleo de Vendure. El descuento se aplica con
 * el mecanismo nativo `OrderService.addSurchargeToOrder` (un recargo de precio
 * negativo), así que nunca se duplica el motor de promociones y precios de Vendure.
 *
 * Reglas que impone este plugin (detalles en LoyaltyService):
 * - Todo cambio de saldo se registra como LoyaltyTransaction; el libro de
 *   movimientos es la fuente de verdad y `LoyaltyAccount.balance` es su caché.
 * - Los puntos solo se ganan cuando el pedido llega a PaymentSettled (un índice
 *   único en la base de datos lo hace idempotente aunque haya eventos duplicados).
 * - El canje es siempre una acción deliberada del cliente, nunca automática.
 * - El saldo nunca puede ser negativo (lo impone un UPDATE condicional atómico).
 * - Un reembolso revierte una parte proporcional, con tope, de los puntos ganados
 *   con ese pedido.
 *
 * ## Configuración
 *
 * Se registra con configuración opcional, p. ej.:
 * ```ts
 * LoyaltyPlugin.init({ pointsPerEuro: 1, pointValueInCents: 1, minRedeemablePoints: 100, maxDiscountPerOrderCents: 2000 })
 * ```
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [LoyaltyService, LoyaltyEventSubscriber],
    // Se exporta para que los plugins que dan puntos con sus propias reglas
    // (AthletesPlugin) escriban en este mismo libro en vez de duplicarlo.
    exports: [LoyaltyService],
    entities: [LoyaltyAccount, LoyaltyTransaction],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [LoyaltyShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [LoyaltyAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class LoyaltyPlugin {
    static options: LoyaltyPluginOptions = {};

    static init(options: LoyaltyPluginOptions): typeof LoyaltyPlugin {
        LoyaltyPlugin.options = options;
        setLoyaltyConfig(options);
        return LoyaltyPlugin;
    }
}
