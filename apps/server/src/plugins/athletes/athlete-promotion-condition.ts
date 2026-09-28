import { idsAreEqual, LanguageCode, PromotionCondition, TransactionalConnection } from '@vendure/core';
import { In } from 'typeorm';

import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { firstAthleteCode, normalizeAthleteCode } from './athlete-rules';
import { ATHLETE_PROMOTION_CONDITION_CODE } from './constants';

let connection: TransactionalConnection | undefined;

/**
 * Attached to every Promotion that backs an AthleteCode. The coupon code
 * itself already makes the promotion opt-in; this condition adds the
 * athlete-specific rules on top, evaluated by Vendure's own promotion
 * engine every time the order is priced:
 *
 * - the athlete must be enabled;
 * - an athlete can't benefit from their own code;
 * - only the first athlete code applied to an order counts, so one order
 *   never stacks several athlete discounts nor credits several athletes.
 *
 * Registered via AthletesPlugin's `configuration` hook.
 */
export const athleteCodeCondition = new PromotionCondition({
    code: ATHLETE_PROMOTION_CONDITION_CODE,
    description: [
        { languageCode: LanguageCode.en, value: 'Athlete code rules (managed from the Athletes section)' },
        { languageCode: LanguageCode.es, value: 'Reglas de código de atleta (gestionado desde la sección Atletas)' },
    ],
    args: {
        athleteId: {
            type: 'ID',
            label: [
                { languageCode: LanguageCode.en, value: 'Athlete ID' },
                { languageCode: LanguageCode.es, value: 'ID del atleta' },
            ],
        },
    },
    init(injector) {
        connection = injector.get(TransactionalConnection);
    },
    async check(ctx, order, args, promotion) {
        if (!connection) {
            return false;
        }
        const athlete = await connection.getRepository(ctx, Athlete).findOne({ where: { id: args.athleteId } });
        if (!athlete || !athlete.enabled || athlete.deletedAt) {
            return false;
        }
        const orderCustomerId = order.customer?.id ?? order.customerId;
        if (orderCustomerId && idsAreEqual(orderCustomerId, athlete.customerId)) {
            return false;
        }
        const couponCodes = order.couponCodes ?? [];
        if (couponCodes.length > 1) {
            const athleteCodesOnOrder = await connection.getRepository(ctx, AthleteCode).find({
                select: { code: true },
                where: { code: In(couponCodes.map(normalizeAthleteCode)) },
            });
            const winner = firstAthleteCode(couponCodes, athleteCodesOnOrder.map(c => c.code));
            if (winner && promotion.couponCode && normalizeAthleteCode(promotion.couponCode) !== winner) {
                return false;
            }
        }
        return true;
    },
});

// Exported for the spec only: lets it inject a fake connection without Nest.
export function setAthleteConditionConnection(value: TransactionalConnection | undefined): void {
    connection = value;
}
