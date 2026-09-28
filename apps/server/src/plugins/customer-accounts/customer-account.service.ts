import { Injectable } from '@nestjs/common';
import { HistoryEntryType } from '@vendure/common/lib/generated-types';
import {
    AccountRegistrationEvent,
    AccountVerifiedEvent,
    ConfigService,
    Customer,
    EventBus,
    HistoryService,
    ID,
    isGraphQlErrorResult,
    NativeAuthenticationMethod,
    PasswordCipher,
    PasswordResetEvent,
    RequestContext,
    SessionService,
    TransactionalConnection,
    User,
    UserService,
    VerificationTokenGenerator,
} from '@vendure/core';
import { IsNull } from 'typeorm';

import { userHasPassword } from './user-has-password';

export interface CustomerAccountStatus {
    customerId: ID;
    emailAddress: string;
    /** false for guest customers (created at checkout): they have no login at all. */
    hasUser: boolean;
    verified: boolean;
    /** false for accounts created by an admin without a password — they set it from the activation email. */
    hasPassword: boolean;
    lastLogin: Date | null;
}

export type CustomerAccountResult =
    | { success: true; status: CustomerAccountStatus; passwordSetupEmailSent?: boolean }
    | { success: false; reason: string };

/**
 * Admin-side control over a customer's login (athletes included — an athlete
 * is a customer): see its status, verify it directly, resend the activation
 * email, or send a password email. Every action reuses Vendure's own
 * User/token machinery and events, so the emails are still sent by
 * TransactionalEmailPlugin with its existing templates.
 */
@Injectable()
export class CustomerAccountService {
    constructor(
        private connection: TransactionalConnection,
        private userService: UserService,
        private historyService: HistoryService,
        private eventBus: EventBus,
        private verificationTokenGenerator: VerificationTokenGenerator,
        private configService: ConfigService,
        private passwordCipher: PasswordCipher,
        private sessionService: SessionService,
    ) {}

    async getStatus(ctx: RequestContext, customerId: ID): Promise<CustomerAccountStatus | null> {
        const customer = await this.findCustomer(ctx, customerId);
        if (!customer) {
            return null;
        }
        if (!customer.user) {
            return { customerId, emailAddress: customer.emailAddress, hasUser: false, verified: false, hasPassword: false, lastLogin: null };
        }
        return {
            customerId,
            emailAddress: customer.emailAddress,
            hasUser: true,
            verified: customer.user.verified,
            hasPassword: await userHasPassword(this.connection, ctx, customer.user.id),
            lastLogin: customer.user.lastLogin ?? null,
        };
    }

    /**
     * (Re)sends the activation email with a fresh token (the old link stops
     * working). For a guest customer with no login yet, creates one first, so
     * this doubles as "invite this customer to create an account". Accounts
     * without a password choose it from that same link.
     */
    async sendVerificationEmail(ctx: RequestContext, customerId: ID): Promise<CustomerAccountResult> {
        const customer = await this.findCustomer(ctx, customerId);
        if (!customer) {
            return { success: false, reason: 'Customer not found' };
        }
        let user = customer.user ? await this.loadUser(ctx, customer.user.id) : null;
        if (user?.verified) {
            return { success: false, reason: 'This account is already verified — send a password email instead' };
        }
        if (!user) {
            const created = await this.createLogin(ctx, customer);
            if (typeof created === 'string') {
                return { success: false, reason: created };
            }
            user = created;
        } else {
            await this.userService.setVerificationToken(ctx, user);
        }
        // Same event a storefront registration emits → same email template.
        await this.eventBus.publish(new AccountRegistrationEvent(ctx, user));
        return { success: true, status: (await this.getStatus(ctx, customerId))! };
    }

    /**
     * Verifies the account directly from the Dashboard — no email click
     * needed. Works for any unverified customer, including guests (a login is
     * created) and accounts without a password:
     * - with `password`: the admin sets it, and the customer can sign in at once;
     * - without one, for an account that has none: the customer gets a
     *   "create your password" email (a password-reset link), so they're never
     *   left verified but unable to sign in.
     */
    async verifyManually(ctx: RequestContext, customerId: ID, options: { password?: string | null } = {}): Promise<CustomerAccountResult> {
        const customer = await this.findCustomer(ctx, customerId);
        if (!customer) {
            return { success: false, reason: 'Customer not found' };
        }
        const password = options.password?.length ? options.password : undefined;
        if (password) {
            const invalid = await this.validatePassword(ctx, password);
            if (invalid) {
                return { success: false, reason: invalid };
            }
        }

        let user = customer.user ? await this.loadUser(ctx, customer.user.id) : null;
        if (user?.verified) {
            return { success: false, reason: 'This account is already verified' };
        }
        if (!user) {
            const created = await this.createLogin(ctx, customer);
            if (typeof created === 'string') {
                return { success: false, reason: created };
            }
            user = created;
        }
        const nativeAuth = user.getNativeAuthenticationMethod(false);
        if (!nativeAuth) {
            return { success: false, reason: 'This customer has no email/password login' };
        }

        await this.connection.getRepository(ctx, NativeAuthenticationMethod).update(
            { id: nativeAuth.id },
            password ? { verificationToken: null, passwordHash: await this.passwordCipher.hash(password) } : { verificationToken: null },
        );
        await this.connection.getRepository(ctx, User).update({ id: user.id }, { verified: true });
        await this.historyService.createHistoryEntryForCustomer({
            ctx,
            customerId: customer.id,
            type: HistoryEntryType.CUSTOMER_VERIFIED,
            data: { strategy: 'admin' },
        });

        if (password || (await userHasPassword(this.connection, ctx, user.id))) {
            // The customer can sign in now: send the usual "account activated" email.
            await this.eventBus.publish(new AccountVerifiedEvent(ctx, customer));
            return { success: true, status: (await this.getStatus(ctx, customerId))! };
        }
        await this.issuePasswordEmail(ctx, customer, user);
        return { success: true, status: (await this.getStatus(ctx, customerId))!, passwordSetupEmailSent: true };
    }

    /**
     * Admin sets (or changes) the customer's password at any time — e.g. a
     * temporary one the customer changes later from their account. Signs the
     * customer out of every session so an old/compromised password can't keep
     * a session alive. Doesn't change the verification state.
     */
    async setPassword(ctx: RequestContext, customerId: ID, password: string): Promise<CustomerAccountResult> {
        const customer = await this.findCustomer(ctx, customerId);
        if (!customer) {
            return { success: false, reason: 'Customer not found' };
        }
        if (!customer.user) {
            return { success: false, reason: 'This customer has no login yet — use "Verify now" to create it with a password' };
        }
        const invalid = await this.validatePassword(ctx, password ?? '');
        if (invalid) {
            return { success: false, reason: invalid };
        }
        const user = await this.loadUser(ctx, customer.user.id);
        const nativeAuth = user?.getNativeAuthenticationMethod(false);
        if (!user || !nativeAuth) {
            return { success: false, reason: 'This customer has no email/password login' };
        }
        await this.connection
            .getRepository(ctx, NativeAuthenticationMethod)
            .update({ id: nativeAuth.id }, { passwordHash: await this.passwordCipher.hash(password), passwordResetToken: null });
        await this.sessionService.deleteSessionsByUser(ctx, user);
        await this.historyService.createHistoryEntryForCustomer({
            ctx,
            customerId: customer.id,
            type: HistoryEntryType.CUSTOMER_PASSWORD_UPDATED,
            data: {},
        });
        return { success: true, status: (await this.getStatus(ctx, customerId))! };
    }

    /**
     * Sends a password email: "reset your password" for accounts that have
     * one, "create your password" for accounts that don't. Also works for an
     * unverified account: completing it proves control of the email, so
     * Vendure verifies the account at the same time.
     */
    async sendPasswordResetEmail(ctx: RequestContext, customerId: ID): Promise<CustomerAccountResult> {
        const customer = await this.findCustomer(ctx, customerId);
        if (!customer) {
            return { success: false, reason: 'Customer not found' };
        }
        if (!customer.user) {
            return { success: false, reason: 'This customer has no login yet — send an activation email or verify them instead' };
        }
        const user = await this.loadUser(ctx, customer.user.id);
        if (!user?.getNativeAuthenticationMethod(false)) {
            return { success: false, reason: 'This customer has no email/password login' };
        }
        await this.issuePasswordEmail(ctx, customer, user);
        return { success: true, status: (await this.getStatus(ctx, customerId))! };
    }

    /**
     * Doesn't call CustomerService.requestPasswordReset(): from the Admin API
     * its email lookup searches *administrator* users (UserService picks the
     * table from ctx.apiType), so it silently does nothing for a customer.
     * This sets the token on the customer's own user and emits the same event.
     */
    private async issuePasswordEmail(ctx: RequestContext, customer: Customer, user: User): Promise<void> {
        const nativeAuth = user.getNativeAuthenticationMethod();
        nativeAuth.passwordResetToken = await this.verificationTokenGenerator.generateVerificationToken(ctx);
        await this.connection
            .getRepository(ctx, NativeAuthenticationMethod)
            .update({ id: nativeAuth.id }, { passwordResetToken: nativeAuth.passwordResetToken });
        await this.historyService.createHistoryEntryForCustomer({
            ctx,
            customerId: customer.id,
            type: HistoryEntryType.CUSTOMER_PASSWORD_RESET_REQUESTED,
            data: {},
        });
        await this.eventBus.publish(new PasswordResetEvent(ctx, user));
    }

    /** Creates the login of a guest customer (unverified, no password) and links it. Returns an error message on failure. */
    private async createLogin(ctx: RequestContext, customer: Customer): Promise<User | string> {
        const created = await this.userService.createCustomerUser(ctx, customer.emailAddress);
        if (isGraphQlErrorResult(created)) {
            return created.message;
        }
        await this.connection.getRepository(ctx, Customer).update({ id: customer.id }, { user: { id: created.id } });
        return (await this.loadUser(ctx, created.id)) ?? 'Could not load the customer login';
    }

    /** Storefront minimum + the policy Vendure applies to customer-chosen passwords (authOptions.passwordValidationStrategy). */
    private async validatePassword(ctx: RequestContext, password: string): Promise<string | undefined> {
        if (!password) {
            return 'A password is required';
        }
        // Same minimum the storefront enforces on registration (Vendure's default policy only asks for 4).
        if (password.length < 8) {
            return 'The password must be at least 8 characters long';
        }
        const result = await this.configService.authOptions.passwordValidationStrategy.validate(ctx, password);
        if (result === true) {
            return undefined;
        }
        return typeof result === 'string' ? result : 'The password does not meet the password policy';
    }

    private findCustomer(ctx: RequestContext, customerId: ID): Promise<Customer | null> {
        return this.connection.getRepository(ctx, Customer).findOne({
            where: { id: customerId, deletedAt: IsNull() },
            relations: { user: true },
        });
    }

    private loadUser(ctx: RequestContext, userId: ID): Promise<User | null> {
        return this.connection.getRepository(ctx, User).findOne({ where: { id: userId }, relations: { authenticationMethods: true } });
    }
}
