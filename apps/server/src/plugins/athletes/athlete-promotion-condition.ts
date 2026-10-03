import { idsAreEqual, LanguageCode, PromotionCondition, TransactionalConnection } from '@vendure/core';
import { In } from 'typeorm';

import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { firstAthleteCode, normalizeAthleteCode } from './athlete-rules';
import { ATHLETE_PROMOTION_CONDITION_CODE } from './constants';

let connection: TransactionalConnection | undefined;

/**
 * Va en cada Promotion asociada a un AthleteCode. El propio código de cupón ya
 * hace que la promoción solo se aplique si se introduce; esta condición añade las
 * reglas propias de los atletas, que evalúa el motor de promociones de Vendure
 * cada vez que se calcula el precio del pedido:
 *
 * - el atleta debe estar activo;
 * - un atleta no puede beneficiarse de su propio código;
 * - solo cuenta el primer código de atleta aplicado a un pedido, así que un
 *   pedido nunca acumula varios descuentos de atleta ni abona a varios atletas.
 *
 * Se registra con el hook `configuration` de AthletesPlugin.
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

// Exportado solo para el test: permite inyectar una conexión falsa sin Nest.
export function setAthleteConditionConnection(value: TransactionalConnection | undefined): void {
    connection = value;
}
