import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CreatePromotionInput } from '@vendure/common/lib/generated-types';
import {
    Customer,
    CustomerService,
    ID,
    idsAreEqual,
    isGraphQlErrorResult,
    LanguageCode,
    Order,
    PaginatedList,
    Promotion,
    PromotionService,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { IsNull, Not } from 'typeorm';

import { LoyaltyService } from '../loyalty/loyalty.service';
import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteCodeTerms, normalizeAthleteCode, validateAthleteCodeInput } from './athlete-rules';
import { ATHLETE_PROMOTION_CONDITION_CODE } from './constants';

export interface AthleteCodeInput extends AthleteCodeTerms {
    code: string;
    enabled?: boolean;
}

export interface CreateAthleteInput {
    /** Convertir un cliente existente… */
    customerId?: ID;
    /** …o crear uno nuevo (podrá registrar su acceso más tarde con el mismo email). */
    customer?: { firstName: string; lastName: string; emailAddress: string; phoneNumber?: string };
    enabled?: boolean;
    notes?: string | null;
    code?: AthleteCodeInput;
}

export interface UpdateAthleteInput {
    enabled?: boolean;
    notes?: string | null;
}

export type AthleteResult = { success: true; athlete: Athlete } | { success: false; reason: string };
export type AthleteCodeResult = { success: true; code: AthleteCode } | { success: false; reason: string };

class AthleteValidationError extends Error {}

@Injectable()
export class AthleteService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private customerService: CustomerService,
        private promotionService: PromotionService,
        private loyaltyService: LoyaltyService,
    ) {}

    onApplicationBootstrap(): void {
        // Los atletas no ganan puntos normales por sus compras: los ganan con sus
        // códigos (ver AthleteRewardService). Un atleta desactivado vuelve a tratarse
        // como cliente normal.
        this.loyaltyService.registerEarnPolicy({
            name: 'athletes-do-not-earn-on-own-purchases',
            canEarnForOrder: async (ctx, order) => !(await this.isActiveAthleteCustomer(ctx, order)),
        });
    }

    async isActiveAthleteCustomer(ctx: RequestContext, order: Pick<Order, 'customerId'>): Promise<boolean> {
        if (!order.customerId) {
            return false;
        }
        const athlete = await this.connection
            .getRepository(ctx, Athlete)
            .findOne({ where: { customerId: order.customerId, enabled: true, deletedAt: IsNull() } });
        return !!athlete;
    }

    async list(ctx: RequestContext, options?: { skip?: number; take?: number; term?: string }): Promise<PaginatedList<Athlete>> {
        const qb = this.connection
            .getRepository(ctx, Athlete)
            .createQueryBuilder('athlete')
            .leftJoinAndSelect('athlete.customer', 'customer')
            .leftJoinAndSelect('athlete.codes', 'code')
            .where('athlete.deletedAt IS NULL')
            .orderBy('athlete.createdAt', 'DESC')
            .skip(options?.skip ?? 0)
            .take(Math.min(options?.take ?? 50, 100));
        const term = options?.term?.trim();
        if (term) {
            qb.andWhere(
                `(customer.firstName ILIKE :term OR customer.lastName ILIKE :term OR customer.emailAddress ILIKE :term OR code.code ILIKE :term)`,
                { term: `%${term}%` },
            );
        }
        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async findById(ctx: RequestContext, id: ID): Promise<Athlete | null> {
        return this.connection.getRepository(ctx, Athlete).findOne({
            where: { id, deletedAt: IsNull() },
            relations: { customer: true, codes: true },
            order: { codes: { createdAt: 'ASC' } },
        });
    }

    async findByCustomerId(ctx: RequestContext, customerId: ID): Promise<Athlete | null> {
        return this.connection.getRepository(ctx, Athlete).findOne({
            where: { customerId, deletedAt: IsNull() },
            relations: { customer: true, codes: true },
            order: { codes: { createdAt: 'ASC' } },
        });
    }

    async findCodeById(ctx: RequestContext, id: ID): Promise<AthleteCode | null> {
        return this.connection.getRepository(ctx, AthleteCode).findOne({ where: { id } });
    }

    async create(ctx: RequestContext, input: CreateAthleteInput): Promise<AthleteResult> {
        if (!input.customerId === !input.customer) {
            return { success: false, reason: 'Provide either an existing customer or the data for a new one' };
        }
        if (input.code) {
            const invalid = validateAthleteCodeInput(input.code);
            if (invalid) {
                return { success: false, reason: invalid };
            }
        }
        try {
            const athlete = await this.connection.withTransaction(ctx, async txCtx => {
                const customer = input.customerId
                    ? await this.connection.getRepository(txCtx, Customer).findOne({ where: { id: input.customerId, deletedAt: IsNull() } })
                    : await this.createCustomer(txCtx, input.customer!);
                if (!customer) {
                    throw new AthleteValidationError('Customer not found');
                }
                const existing = await this.connection.getRepository(txCtx, Athlete).findOne({ where: { customerId: customer.id } });
                if (existing && !existing.deletedAt) {
                    throw new AthleteValidationError('This customer is already an athlete');
                }
                // Un cliente al que se le quitó el rol de atleta puede volver a serlo: se
                // restaura la misma fila, así que conserva su historial de recompensas.
                // Sus códigos antiguos siguen desactivados hasta que se reactiven.
                const saved = await this.connection.getRepository(txCtx, Athlete).save(
                    existing
                        ? Object.assign(existing, { deletedAt: null, enabled: input.enabled ?? true, notes: input.notes?.trim() || existing.notes })
                        : new Athlete({ customerId: customer.id, enabled: input.enabled ?? true, notes: input.notes?.trim() || null, deletedAt: null }),
                );
                saved.customer = customer;
                if (input.code) {
                    await this.createCodeInTransaction(txCtx, saved, input.code);
                }
                return saved;
            });
            return { success: true, athlete: (await this.findById(ctx, athlete.id))! };
        } catch (err) {
            return this.toFailure(err);
        }
    }

    async update(ctx: RequestContext, id: ID, input: UpdateAthleteInput): Promise<AthleteResult> {
        try {
            await this.connection.withTransaction(ctx, async txCtx => {
                const athlete = await this.connection.getRepository(txCtx, Athlete).findOne({
                    where: { id, deletedAt: IsNull() },
                    relations: { customer: true, codes: true },
                });
                if (!athlete) {
                    throw new AthleteValidationError('Athlete not found');
                }
                const enabledChanged = input.enabled !== undefined && input.enabled !== athlete.enabled;
                if (input.enabled !== undefined) athlete.enabled = input.enabled;
                if (input.notes !== undefined) athlete.notes = input.notes?.trim() || null;
                await this.connection.getRepository(txCtx, Athlete).save(athlete, { reload: false });
                if (enabledChanged) {
                    for (const code of athlete.codes) {
                        await this.syncPromotion(txCtx, athlete, code);
                    }
                }
            });
            return { success: true, athlete: (await this.findById(ctx, id))! };
        } catch (err) {
            return this.toFailure(err);
        }
    }

    /**
     * Acción de administración: el cliente sigue siendo cliente, pero deja de ser
     * atleta. Conserva sus puntos y su historial de recompensas; si más adelante
     * vuelve a ser atleta, se restaura este mismo registro.
     */
    async removeRole(ctx: RequestContext, id: ID): Promise<{ success: true } | { success: false; reason: string }> {
        const removed = await this.connection.withTransaction(ctx, async txCtx => {
            const athlete = await this.connection
                .getRepository(txCtx, Athlete)
                .findOne({ where: { id, deletedAt: IsNull() }, relations: { codes: true } });
            return athlete ? this.softDelete(txCtx, athlete) : false;
        });
        return removed ? { success: true } : { success: false, reason: 'Athlete not found' };
    }

    /**
     * Se llama cuando Vendure borra un cliente (borrado lógico, ver
     * Athlete.deletedAt): un atleta no puede existir sin su cliente y sus códigos
     * deben dejar de dar descuento en el acto.
     */
    async removeForDeletedCustomer(ctx: RequestContext, customerId: ID): Promise<boolean> {
        return this.connection.withTransaction(ctx, async txCtx => {
            const athlete = await this.connection
                .getRepository(txCtx, Athlete)
                .findOne({ where: { customerId, deletedAt: IsNull() }, relations: { codes: true } });
            return athlete ? this.softDelete(txCtx, athlete) : false;
        });
    }

    private async softDelete(ctx: RequestContext, athlete: Athlete): Promise<true> {
        for (const code of athlete.codes ?? []) {
            if (code.promotionId) {
                const promotion = await this.connection
                    .getRepository(ctx, Promotion)
                    .findOne({ where: { id: code.promotionId, deletedAt: IsNull() } });
                if (promotion) {
                    await this.promotionService.softDeletePromotion(ctx, promotion.id);
                }
            }
            await this.connection.getRepository(ctx, AthleteCode).update({ id: code.id }, { enabled: false });
        }
        await this.connection.getRepository(ctx, Athlete).update({ id: athlete.id }, { enabled: false, deletedAt: new Date() });
        return true;
    }

    async createCode(ctx: RequestContext, athleteId: ID, input: AthleteCodeInput): Promise<AthleteCodeResult> {
        const invalid = validateAthleteCodeInput(input);
        if (invalid) {
            return { success: false, reason: invalid };
        }
        try {
            const code = await this.connection.withTransaction(ctx, async txCtx => {
                const athlete = await this.connection
                    .getRepository(txCtx, Athlete)
                    .findOne({ where: { id: athleteId, deletedAt: IsNull() }, relations: { customer: true } });
                if (!athlete) {
                    throw new AthleteValidationError('Athlete not found');
                }
                return this.createCodeInTransaction(txCtx, athlete, input);
            });
            return { success: true, code };
        } catch (err) {
            return this.toFailure(err);
        }
    }

    /**
     * Cambiar las condiciones de un código solo afecta a los pedidos futuros: las
     * recompensas ya concedidas conservan su copia (ver AthleteReward).
     */
    async updateCode(ctx: RequestContext, id: ID, input: Partial<AthleteCodeInput>): Promise<AthleteCodeResult> {
        try {
            const code = await this.connection.withTransaction(ctx, async txCtx => {
                const repo = this.connection.getRepository(txCtx, AthleteCode);
                const existing = await repo.findOne({ where: { id }, relations: { athlete: { customer: true } } });
                if (!existing || existing.athlete.deletedAt) {
                    throw new AthleteValidationError('Athlete code not found');
                }
                const merged = {
                    code: input.code ?? existing.code,
                    discountType: input.discountType ?? existing.discountType,
                    discountValue: input.discountValue ?? existing.discountValue,
                    rewardType: input.rewardType ?? existing.rewardType,
                    rewardValue: input.rewardValue ?? existing.rewardValue,
                };
                const invalid = validateAthleteCodeInput(merged);
                if (invalid) {
                    throw new AthleteValidationError(invalid);
                }
                const normalized = normalizeAthleteCode(merged.code);
                await this.assertCodeIsAvailable(txCtx, normalized, existing);
                existing.code = normalized;
                existing.discountType = merged.discountType;
                existing.discountValue = merged.discountValue;
                existing.rewardType = merged.rewardType;
                existing.rewardValue = merged.rewardValue;
                if (input.enabled !== undefined) existing.enabled = input.enabled;
                const athlete = existing.athlete;
                await repo.save(existing, { reload: false });
                await this.syncPromotion(txCtx, athlete, existing);
                return existing;
            });
            return { success: true, code: (await this.findCodeById(ctx, code.id))! };
        } catch (err) {
            return this.toFailure(err);
        }
    }

    private async createCodeInTransaction(ctx: RequestContext, athlete: Athlete, input: AthleteCodeInput): Promise<AthleteCode> {
        const normalized = normalizeAthleteCode(input.code);
        await this.assertCodeIsAvailable(ctx, normalized);
        const code = await this.connection.getRepository(ctx, AthleteCode).save(
            new AthleteCode({
                athleteId: athlete.id,
                code: normalized,
                enabled: input.enabled ?? true,
                discountType: input.discountType,
                discountValue: input.discountValue,
                rewardType: input.rewardType,
                rewardValue: input.rewardValue,
                promotionId: null,
            }),
        );
        await this.syncPromotion(ctx, athlete, code);
        return code;
    }

    /**
     * Un código debe ser único entre los códigos de atleta *y* entre todos los demás
     * cupones activos de la tienda; si no, aplicar "PEDRO10" podría activar otra
     * promoción. Se compara sin distinguir mayúsculas, como hace Vendure.
     */
    private async assertCodeIsAvailable(ctx: RequestContext, normalizedCode: string, current?: AthleteCode): Promise<void> {
        const clash = await this.connection.getRepository(ctx, AthleteCode).findOne({
            where: current ? { code: normalizedCode, id: Not(current.id) } : { code: normalizedCode },
        });
        if (clash) {
            throw new AthleteValidationError(`The code "${normalizedCode}" is already in use by another athlete`);
        }
        const promotionQb = this.connection
            .getRepository(ctx, Promotion)
            .createQueryBuilder('promotion')
            .where('LOWER(promotion.couponCode) = LOWER(:code)', { code: normalizedCode })
            .andWhere('promotion.deletedAt IS NULL');
        if (current?.promotionId) {
            promotionQb.andWhere('promotion.id != :ownId', { ownId: current.promotionId });
        }
        if (await promotionQb.getCount()) {
            throw new AthleteValidationError(`The code "${normalizedCode}" is already used by an existing promotion`);
        }
    }

    /**
     * Refleja un AthleteCode en su Promotion de Vendure, creándola si falta (o si un
     * administrador la borró de la lista de promociones). La promoción solo está
     * activa mientras lo estén el atleta y el código.
     */
    private async syncPromotion(ctx: RequestContext, athlete: Athlete, code: AthleteCode): Promise<void> {
        const customer = athlete.customer ?? (await this.connection.getRepository(ctx, Customer).findOne({ where: { id: athlete.customerId } }));
        const athleteName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : `#${athlete.id}`;
        const discountAction =
            code.discountType === 'PERCENTAGE'
                ? { code: 'order_percentage_discount', arguments: [{ name: 'discount', value: String(code.discountValue) }] }
                : { code: 'order_fixed_discount', arguments: [{ name: 'discount', value: String(Math.round(code.discountValue)) }] };
        const input: Omit<CreatePromotionInput, 'translations'> = {
            enabled: athlete.enabled && code.enabled,
            couponCode: code.code,
            conditions: [{ code: ATHLETE_PROMOTION_CONDITION_CODE, arguments: [{ name: 'athleteId', value: String(athlete.id) }] }],
            actions: [discountAction],
        };
        const translations = [
            {
                languageCode: LanguageCode.es,
                name: `Atleta: ${athleteName} (${code.code})`,
                description: 'Gestionado desde la sección Atletas — no editar aquí.',
            },
            {
                languageCode: LanguageCode.en,
                name: `Athlete: ${athleteName} (${code.code})`,
                description: 'Managed from the Athletes section — do not edit here.',
            },
        ];

        const existing = code.promotionId
            ? await this.connection.getRepository(ctx, Promotion).findOne({ where: { id: code.promotionId, deletedAt: IsNull() } })
            : null;
        const result = existing
            ? await this.promotionService.updatePromotion(ctx, { id: existing.id, ...input, translations })
            : await this.promotionService.createPromotion(ctx, { ...input, translations });
        if (isGraphQlErrorResult(result)) {
            throw new Error(`Could not sync promotion for athlete code ${code.code}: ${result.message}`);
        }
        if (!code.promotionId || !idsAreEqual(code.promotionId, result.id)) {
            code.promotionId = result.id;
            await this.connection.getRepository(ctx, AthleteCode).update({ id: code.id }, { promotionId: result.id });
        }
    }

    private async createCustomer(
        ctx: RequestContext,
        input: NonNullable<CreateAthleteInput['customer']>,
    ): Promise<Customer> {
        const emailAddress = input.emailAddress.trim().toLowerCase();
        if (!input.firstName?.trim() || !input.lastName?.trim() || !emailAddress.includes('@')) {
            throw new AthleteValidationError('First name, last name and a valid email are required');
        }
        const existing = await this.connection
            .getRepository(ctx, Customer)
            .findOne({ where: { emailAddress, deletedAt: IsNull() } });
        if (existing) {
            throw new AthleteValidationError('A customer with this email already exists — convert them instead');
        }
        const result = await this.customerService.create(ctx, {
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            emailAddress,
            phoneNumber: input.phoneNumber?.trim() || undefined,
        });
        if (isGraphQlErrorResult(result)) {
            throw new AthleteValidationError(result.message);
        }
        return result;
    }

    private toFailure(err: unknown): { success: false; reason: string } {
        if (err instanceof AthleteValidationError) {
            return { success: false, reason: err.message };
        }
        if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505') {
            // Otra creación simultánea con el mismo código o cliente ganó la carrera:
            // los índices únicos son la última línea de defensa.
            return { success: false, reason: 'That code or customer is already registered as an athlete' };
        }
        throw err;
    }
}
