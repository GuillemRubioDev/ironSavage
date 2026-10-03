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
    /** false en clientes invitados (creados en el checkout): no tienen acceso de ningún tipo. */
    hasUser: boolean;
    verified: boolean;
    /** false en cuentas creadas por un administrador sin contraseña: la eligen desde el email de activación. */
    hasPassword: boolean;
    lastLogin: Date | null;
}

export type CustomerAccountResult =
    | { success: true; status: CustomerAccountStatus; passwordSetupEmailSent?: boolean }
    | { success: false; reason: string };

/**
 * Control del acceso de un cliente desde administración (atletas incluidos: un
 * atleta es un cliente): ver su estado, verificarlo directamente, reenviar el email
 * de activación o enviar un email de contraseña. Todas las acciones reutilizan el
 * sistema de usuarios, tokens y eventos de Vendure, así que los emails los sigue
 * enviando TransactionalEmailPlugin con sus plantillas.
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
     * (Re)envía el email de activación con un token nuevo (el enlace anterior deja de
     * funcionar). Si es un cliente invitado sin acceso, primero se lo crea, así que
     * también sirve para «invitar a este cliente a crear una cuenta». Las cuentas sin
     * contraseña la eligen desde ese mismo enlace.
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
        // El mismo evento que emite un registro en la tienda → la misma plantilla de email.
        await this.eventBus.publish(new AccountRegistrationEvent(ctx, user));
        return { success: true, status: (await this.getStatus(ctx, customerId))! };
    }

    /**
     * Verifica la cuenta directamente desde el dashboard, sin que el cliente tenga que
     * pulsar el enlace del email. Sirve para cualquier cliente sin verificar, incluidos
     * los invitados (se les crea el acceso) y las cuentas sin contraseña:
     * - con `password`: la pone el administrador y el cliente puede entrar ya;
     * - sin ella, en una cuenta que no tiene: el cliente recibe un email «crea tu
     *   contraseña» (un enlace de restablecer contraseña), para que nunca quede
     *   verificado pero sin poder entrar.
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
            // El cliente ya puede entrar: se envía el email habitual de «cuenta activada».
            await this.eventBus.publish(new AccountVerifiedEvent(ctx, customer));
            return { success: true, status: (await this.getStatus(ctx, customerId))! };
        }
        await this.issuePasswordEmail(ctx, customer, user);
        return { success: true, status: (await this.getStatus(ctx, customerId))!, passwordSetupEmailSent: true };
    }

    /**
     * El administrador pone (o cambia) la contraseña del cliente en cualquier momento,
     * p. ej. una temporal que el cliente cambiará luego desde su cuenta. Cierra todas
     * las sesiones del cliente para que una contraseña antigua o comprometida no
     * mantenga ninguna abierta. No cambia el estado de verificación.
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
     * Envía un email de contraseña: «restablece tu contraseña» si la cuenta tiene una,
     * «crea tu contraseña» si no. También sirve para una cuenta sin verificar:
     * completarlo demuestra que controla el email, así que Vendure verifica la cuenta
     * a la vez.
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
     * No llama a CustomerService.requestPasswordReset(): desde la Admin API busca el
     * email entre los usuarios *administradores* (UserService elige la tabla según
     * ctx.apiType), así que con un cliente no hace nada y no avisa. Aquí se pone el
     * token en el usuario del propio cliente y se emite el mismo evento.
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

    /** Crea el acceso de un cliente invitado (sin verificar, sin contraseña) y lo vincula. Si falla, devuelve un mensaje de error. */
    private async createLogin(ctx: RequestContext, customer: Customer): Promise<User | string> {
        const created = await this.userService.createCustomerUser(ctx, customer.emailAddress);
        if (isGraphQlErrorResult(created)) {
            return created.message;
        }
        await this.connection.getRepository(ctx, Customer).update({ id: customer.id }, { user: { id: created.id } });
        return (await this.loadUser(ctx, created.id)) ?? 'Could not load the customer login';
    }

    /** El mínimo del storefront + la política que aplica Vendure a las contraseñas que eligen los clientes (authOptions.passwordValidationStrategy). */
    private async validatePassword(ctx: RequestContext, password: string): Promise<string | undefined> {
        if (!password) {
            return 'A password is required';
        }
        // El mismo mínimo que exige el storefront al registrarse (la política por defecto de Vendure solo pide 4).
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
