import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { LoyaltyPlugin } from '../loyalty/loyalty.plugin';
import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteEventSubscriber } from './athlete-event-subscriber';
import { athleteCodeCondition } from './athlete-promotion-condition';
import { AthleteReward } from './athlete-reward.entity';
import { AthleteRewardReversal } from './athlete-reward-reversal.entity';
import { AthleteRewardService } from './athlete-reward.service';
import { AthleteService } from './athlete.service';
import { AthleteEntityResolver, AthleteRewardEntityResolver, AthletesAdminResolver } from './athletes-admin.resolver';
import { AthletesShopResolver } from './athletes-shop.resolver';

export { athletePermission } from './athlete.permission';

/**
 * Atletas: clientes que ganan puntos de fidelización cuando *otros* clientes
 * compran con su código promocional, en vez de por sus propias compras.
 *
 * Construido sobre los mecanismos que ya existen, no al margen:
 * - el descuento del cliente es una Promotion normal de Vendure por código (cupón
 *   + acción de descuento estándar + la condición `athlete_code`), así que el
 *   carrito y el checkout la aplican con el flujo estándar `applyCouponCode`;
 * - los puntos del atleta se abonan en el libro de LoyaltyPlugin (tipos nuevos
 *   ATHLETE_REWARD / ATHLETE_REWARD_REVERSAL), así que se gastan con el mismo
 *   flujo de canje que los de cualquier cliente;
 * - los atletas no acumulan puntos normales gracias al hook de política de
 *   acumulación de LoyaltyService.
 *
 * Necesita LoyaltyPlugin y `athletePermission` registrado en
 * `authOptions.customPermissions` (ver vendure-config.ts).
 */
@VendurePlugin({
    imports: [PluginCommonModule, LoyaltyPlugin],
    providers: [AthleteService, AthleteRewardService, AthleteEventSubscriber],
    entities: [Athlete, AthleteCode, AthleteReward, AthleteRewardReversal],
    configuration: config => {
        config.promotionOptions.promotionConditions.push(athleteCodeCondition);
        return config;
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [AthletesShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [AthletesAdminResolver, AthleteEntityResolver, AthleteRewardEntityResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class AthletesPlugin {}
