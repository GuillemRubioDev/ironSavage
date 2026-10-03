import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, CustomerService, ID, RequestContext } from '@vendure/core';

import { logSecurityEvent } from '../security/security-events';
import { Athlete } from './athlete.entity';
import { athletePermission } from './athlete.permission';
import { AthleteReward } from './athlete-reward.entity';
import { AthleteRewardService } from './athlete-reward.service';
import { AthleteCodeInput, AthleteService, CreateAthleteInput, UpdateAthleteInput } from './athlete.service';

// Vendure deduce este valor de ErrorCode del nombre del tipo `AthleteError`
// (ver api-extensions.ts); el enum de TypeScript generado no lo conoce.
const ATHLETE_ERROR = 'ATHLETE_ERROR' as ErrorCode;

class AthleteError {
    readonly errorCode = ATHLETE_ERROR;
    constructor(readonly message: string) {}
}

type ListOptions = { skip?: number; take?: number };

@Resolver()
export class AthletesAdminResolver {
    constructor(
        private athleteService: AthleteService,
        private athleteRewardService: AthleteRewardService,
    ) {}

    @Query()
    @Allow(athletePermission.Read)
    athletes(@Ctx() ctx: RequestContext, @Args() args: { options?: ListOptions & { term?: string } }) {
        return this.athleteService.list(ctx, args.options);
    }

    @Query()
    @Allow(athletePermission.Read)
    athlete(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.athleteService.findById(ctx, id);
    }

    @Query()
    @Allow(athletePermission.Read)
    athleteByCustomer(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
        return this.athleteService.findByCustomerId(ctx, customerId);
    }

    @Query()
    @Allow(athletePermission.Read)
    athleteRewards(@Ctx() ctx: RequestContext, @Args('athleteId') athleteId: ID, @Args() args: { options?: ListOptions }) {
        return this.athleteRewardService.listRewards(ctx, athleteId, args.options);
    }

    @Query()
    @Allow(athletePermission.Read)
    athleteCodeOrders(@Ctx() ctx: RequestContext, @Args('codeId') codeId: ID, @Args() args: { options?: ListOptions }) {
        return this.athleteRewardService.listOrdersForCode(ctx, codeId, args.options);
    }

    @Mutation()
    @Allow(athletePermission.Create)
    async createAthlete(@Ctx() ctx: RequestContext, @Args('input') input: CreateAthleteInput) {
        const result = await this.athleteService.create(ctx, input);
        if (!result.success) return new AthleteError(result.reason);
        this.audit(ctx, 'create_athlete', { athleteId: String(result.athlete.id) });
        return result.athlete;
    }

    @Mutation()
    @Allow(athletePermission.Update)
    async updateAthlete(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: UpdateAthleteInput) {
        const result = await this.athleteService.update(ctx, id, input);
        if (!result.success) return new AthleteError(result.reason);
        this.audit(ctx, 'update_athlete', { athleteId: String(id), enabled: result.athlete.enabled });
        return result.athlete;
    }

    @Mutation()
    @Allow(athletePermission.Create)
    async createAthleteCode(@Ctx() ctx: RequestContext, @Args('athleteId') athleteId: ID, @Args('input') input: AthleteCodeInput) {
        const result = await this.athleteService.createCode(ctx, athleteId, input);
        if (!result.success) return new AthleteError(result.reason);
        this.audit(ctx, 'create_athlete_code', { athleteId: String(athleteId), code: result.code.code });
        return result.code;
    }

    @Mutation()
    @Allow(athletePermission.Update)
    async updateAthleteCode(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: Partial<AthleteCodeInput>) {
        const result = await this.athleteService.updateCode(ctx, id, input);
        if (!result.success) return new AthleteError(result.reason);
        this.audit(ctx, 'update_athlete_code', { codeId: String(id), code: result.code.code, enabled: result.code.enabled });
        return result.code;
    }

    @Mutation()
    @Allow(athletePermission.Update)
    async revertAthleteReward(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('note') note: string) {
        const existing = await this.athleteRewardService.findRewardById(ctx, id);
        if (!existing) return new AthleteError('Reward not found');
        if (existing.revertedPoints >= existing.points) return new AthleteError('This reward has already been fully reverted');
        const { reverted } = await this.athleteRewardService.revertManually(ctx, id, note, ctx.activeUserId);
        logSecurityEvent('admin_revert_athlete_reward', {
            adminUserId: ctx.activeUserId ? String(ctx.activeUserId) : undefined,
            rewardId: String(id),
            points: reverted,
        });
        return this.athleteRewardService.findRewardById(ctx, id);
    }

    @Mutation()
    @Allow(athletePermission.Delete)
    async removeAthleteRole(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        const result = await this.athleteService.removeRole(ctx, id);
        if (result.success) this.audit(ctx, 'remove_athlete_role', { athleteId: String(id) });
        return result.success;
    }

    @ResolveField('__resolveType')
    @Resolver('AthleteResult')
    resolveAthleteResultType(value: AthleteError | object): string {
        return 'errorCode' in value ? 'AthleteError' : 'Athlete';
    }

    @ResolveField('__resolveType')
    @Resolver('AthleteCodeResult')
    resolveAthleteCodeResultType(value: AthleteError | object): string {
        return 'errorCode' in value ? 'AthleteError' : 'AthleteCode';
    }

    @ResolveField('__resolveType')
    @Resolver('AthleteRewardResult')
    resolveAthleteRewardResultType(value: AthleteError | object): string {
        return 'errorCode' in value ? 'AthleteError' : 'AthleteReward';
    }

    private audit(ctx: RequestContext, action: string, fields: Record<string, string | boolean>) {
        logSecurityEvent('admin_athlete_change', {
            adminUserId: ctx.activeUserId ? String(ctx.activeUserId) : undefined,
            action,
            ...fields,
        });
    }
}

@Resolver('Athlete')
export class AthleteEntityResolver {
    constructor(private athleteRewardService: AthleteRewardService) {}

    @ResolveField()
    stats(@Ctx() ctx: RequestContext, @Parent() athlete: Athlete) {
        return this.athleteRewardService.getStats(ctx, athlete.id);
    }
}

@Resolver('AthleteReward')
export class AthleteRewardEntityResolver {
    constructor(private customerService: CustomerService) {}

    @ResolveField()
    customer(@Ctx() ctx: RequestContext, @Parent() reward: AthleteReward) {
        return reward.customerId ? this.customerService.findOne(ctx, reward.customerId) : null;
    }

    @ResolveField()
    reversals(@Parent() reward: AthleteReward) {
        return reward.reversals ?? [];
    }
}
