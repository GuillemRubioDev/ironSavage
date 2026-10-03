import { Args, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';

import { logSecurityEvent } from '../security/security-events';
import { CustomerAccountResult, CustomerAccountService } from './customer-account.service';

// Vendure deduce este valor de ErrorCode del nombre del tipo `CustomerAccountError`
// (ver api-extensions.ts); el enum de TypeScript generado no lo conoce.
const CUSTOMER_ACCOUNT_ERROR = 'CUSTOMER_ACCOUNT_ERROR' as ErrorCode;

class CustomerAccountError {
    readonly errorCode = CUSTOMER_ACCOUNT_ERROR;
    constructor(readonly message: string) {}
}

@Resolver()
export class CustomerAccountsAdminResolver {
    constructor(private customerAccountService: CustomerAccountService) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    customerAccountStatus(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
        return this.customerAccountService.getStatus(ctx, customerId);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async sendCustomerVerificationEmail(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
        return this.toGraphQl(ctx, 'send_verification_email', customerId, await this.customerAccountService.sendVerificationEmail(ctx, customerId));
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async verifyCustomerAccountManually(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID,
        @Args('password') password?: string | null,
    ) {
        const result = await this.customerAccountService.verifyManually(ctx, customerId, { password });
        return this.toGraphQl(ctx, password ? 'verify_manually_with_password' : 'verify_manually', customerId, result);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async setCustomerPassword(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID, @Args('password') password: string) {
        // La contraseña nunca se registra en los logs; solo que se ha cambiado.
        return this.toGraphQl(ctx, 'set_password', customerId, await this.customerAccountService.setPassword(ctx, customerId, password));
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async sendCustomerPasswordResetEmail(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
        return this.toGraphQl(ctx, 'send_password_reset', customerId, await this.customerAccountService.sendPasswordResetEmail(ctx, customerId));
    }

    @ResolveField('__resolveType')
    @Resolver('CustomerAccountResult')
    resolveResultType(value: CustomerAccountError | object): string {
        return 'errorCode' in value ? 'CustomerAccountError' : 'CustomerAccountStatus';
    }

    private toGraphQl(ctx: RequestContext, action: string, customerId: ID, result: CustomerAccountResult) {
        if (!result.success) {
            return new CustomerAccountError(result.reason);
        }
        logSecurityEvent('admin_customer_account_action', {
            adminUserId: ctx.activeUserId ? String(ctx.activeUserId) : undefined,
            customerId: String(customerId),
            action,
        });
        return { ...result.status, passwordSetupEmailSent: result.passwordSetupEmailSent ?? false };
    }
}
