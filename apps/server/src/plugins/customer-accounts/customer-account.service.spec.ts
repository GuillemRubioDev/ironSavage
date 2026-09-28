import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const {
    AccountRegistrationEvent,
    AccountVerifiedEvent,
    Customer,
    NativeAuthenticationMethod,
    PasswordResetEvent,
    Permission,
    PERMISSIONS_METADATA_KEY,
    User,
} = require('@vendure/core');
const { CustomerAccountService } = require('./customer-account.service');
const { CustomerAccountsAdminResolver } = require('./customer-accounts-admin.resolver');
const { renderEmailVerification } = require('../transactional-email/templates/email-verification');

const ctx = {};

/**
 * Fakes for the three tables involved (customer, user, native auth method)
 * plus Vendure's own services, recording exactly which Vendure mechanisms
 * the service drives.
 */
function setup(account: { user?: { verified: boolean; passwordHash?: string | null; verificationToken?: string | null } | null }) {
    const customer: any = { id: 'c1', emailAddress: 'pedro@example.com', firstName: 'Pedro', user: null };
    const authMethod: any = account.user
        ? { id: 'auth1', passwordHash: account.user.passwordHash ?? null, verificationToken: account.user.verificationToken ?? 'tok-1' }
        : null;
    let user: any = account.user
        ? { id: 'u1', verified: account.user.verified, lastLogin: null, authenticationMethods: [authMethod], getNativeAuthenticationMethod: () => authMethod }
        : null;
    customer.user = user;

    const customerRepo = {
        findOne: async () => ({ ...customer, user }),
        update: mock.fn(async (_where: any, patch: any) => {
            if (patch.user) user = createdUser;
        }),
    };
    const userRepo = {
        findOne: async () => user,
        update: mock.fn(async (_where: any, patch: any) => Object.assign(user, patch)),
    };
    const authRepo = {
        update: mock.fn(async (_where: any, patch: any) => Object.assign(user.getNativeAuthenticationMethod(), patch)),
        createQueryBuilder: () => {
            const qb: any = {
                addSelect: () => qb,
                innerJoin: () => qb,
                where: () => qb,
                getOne: async () => (user ? user.getNativeAuthenticationMethod() : null),
            };
            return qb;
        },
    };
    const connection = {
        getRepository: (_ctx: unknown, Entity: unknown) =>
            Entity === Customer ? customerRepo : Entity === User ? userRepo : Entity === NativeAuthenticationMethod ? authRepo : null,
    };
    const createdAuth: any = { id: 'auth2', passwordHash: null, verificationToken: 'tok-new' };
    const createdUser: any = { id: 'u2', verified: false, lastLogin: null, authenticationMethods: [createdAuth], getNativeAuthenticationMethod: () => createdAuth };
    const userService = {
        createCustomerUser: mock.fn(async (_ctx: unknown, _email: string) => createdUser),
        setVerificationToken: mock.fn(async (_ctx: unknown, u: any) => {
            u.getNativeAuthenticationMethod().verificationToken = 'tok-2';
            u.verified = false;
            return u;
        }),
    };
    const tokenGenerator = { generateVerificationToken: mock.fn(async () => 'reset-tok') };
    const historyService = { createHistoryEntryForCustomer: mock.fn(async () => undefined) };
    const published: any[] = [];
    const eventBus = { publish: mock.fn(async (event: any) => published.push(event)) };
    // Mirrors Vendure's DefaultPasswordValidationStrategy (min length 4) closely enough for these tests.
    const configService = {
        authOptions: { passwordValidationStrategy: { validate: async (_ctx: unknown, p: string) => (p.length >= 8 ? true : 'Password too short') } },
    };
    const passwordCipher = { hash: async (p: string) => `hashed:${p}` };
    const sessionService = { deleteSessionsByUser: mock.fn(async () => undefined) };
    const service = new CustomerAccountService(connection, userService, historyService, eventBus, tokenGenerator, configService, passwordCipher, sessionService);
    return { service, published, userService, historyService, sessionService, customerRepo, getUser: () => user };
}

test('status distinguishes guest, pending activation without password, and verified accounts', async () => {
    assert.deepEqual(
        await setup({ user: null }).service.getStatus(ctx, 'c1'),
        { customerId: 'c1', emailAddress: 'pedro@example.com', hasUser: false, verified: false, hasPassword: false, lastLogin: null },
    );
    const pending = await setup({ user: { verified: false, passwordHash: null } }).service.getStatus(ctx, 'c1');
    assert.equal(pending.hasUser, true);
    assert.equal(pending.verified, false);
    assert.equal(pending.hasPassword, false);
    const verified = await setup({ user: { verified: true, passwordHash: 'hash' } }).service.getStatus(ctx, 'c1');
    assert.equal(verified.verified, true);
    assert.equal(verified.hasPassword, true);
});

test('resending the activation email issues a fresh token and emits the registration event', async () => {
    const { service, published, userService } = setup({ user: { verified: false, passwordHash: null } });

    const result = await service.sendVerificationEmail(ctx, 'c1');

    assert.equal(result.success, true);
    assert.equal(userService.setVerificationToken.mock.callCount(), 1);
    assert.equal(published.length, 1);
    assert.ok(published[0] instanceof AccountRegistrationEvent);
    assert.equal(published[0].user.getNativeAuthenticationMethod().verificationToken, 'tok-2');
});

test('for a guest customer, the activation email first creates their login', async () => {
    const { service, published, userService, customerRepo } = setup({ user: null });

    const result = await service.sendVerificationEmail(ctx, 'c1');

    assert.equal(result.success, true);
    assert.equal(userService.createCustomerUser.mock.callCount(), 1);
    assert.equal(userService.createCustomerUser.mock.calls[0].arguments[1], 'pedro@example.com');
    assert.deepEqual(customerRepo.update.mock.calls[0].arguments[1], { user: { id: 'u2' } });
    assert.ok(published[0] instanceof AccountRegistrationEvent);
    assert.equal(result.status.hasUser, true);
});

test('an already verified account gets no activation email', async () => {
    const { service, published } = setup({ user: { verified: true, passwordHash: 'hash' } });

    const result = await service.sendVerificationEmail(ctx, 'c1');

    assert.equal(result.success, false);
    assert.equal(published.length, 0);
});

test('an admin can verify an account without a password: the customer is emailed a link to create one', async () => {
    const { service, published, getUser } = setup({ user: { verified: false, passwordHash: null } });

    const result = await service.verifyManually(ctx, 'c1');

    assert.equal(result.success, true);
    assert.equal(result.passwordSetupEmailSent, true);
    assert.equal(getUser().verified, true);
    assert.equal(getUser().getNativeAuthenticationMethod().passwordResetToken, 'reset-tok');
    assert.equal(published.length, 1);
    assert.ok(published[0] instanceof PasswordResetEvent, 'never left verified but unable to sign in');
});

test('an admin can verify an account and set its password in one go', async () => {
    const { service, published, getUser } = setup({ user: { verified: false, passwordHash: null } });

    const result = await service.verifyManually(ctx, 'c1', { password: 'Temporal123' });

    assert.equal(result.success, true);
    assert.equal(result.passwordSetupEmailSent, undefined);
    assert.equal(getUser().verified, true);
    assert.equal(getUser().getNativeAuthenticationMethod().passwordHash, 'hashed:Temporal123');
    assert.ok(published[0] instanceof AccountVerifiedEvent);
});

test('a password that fails the password policy is rejected without changing anything', async () => {
    const { service, published, getUser } = setup({ user: { verified: false, passwordHash: null } });

    const result = await service.verifyManually(ctx, 'c1', { password: 'short' });

    assert.equal(result.success, false);
    assert.equal(getUser().verified, false);
    assert.equal(published.length, 0);
});

test('verifying a guest customer creates their login first', async () => {
    const { service, userService, getUser } = setup({ user: null });

    const result = await service.verifyManually(ctx, 'c1', { password: 'Temporal123' });

    assert.equal(result.success, true);
    assert.equal(userService.createCustomerUser.mock.callCount(), 1);
    assert.equal(getUser().verified, true);
});

test('an already verified account cannot be verified again', async () => {
    const { service } = setup({ user: { verified: true, passwordHash: 'hash' } });
    assert.equal((await service.verifyManually(ctx, 'c1')).success, false);
});

test('manual verification of an account with a password verifies it, clears the token and logs history', async () => {
    const { service, published, getUser, historyService } = setup({ user: { verified: false, passwordHash: 'hash', verificationToken: 'tok-1' } });

    const result = await service.verifyManually(ctx, 'c1');

    assert.equal(result.success, true);
    assert.equal(getUser().verified, true);
    assert.equal(getUser().getNativeAuthenticationMethod().verificationToken, null);
    assert.equal(historyService.createHistoryEntryForCustomer.mock.callCount(), 1);
    assert.ok(published[0] instanceof AccountVerifiedEvent, 'sends the usual "account activated" email');
});

test('password reset sets a token on the customer\'s own user and emits the standard event', async () => {
    const withUser = setup({ user: { verified: true, passwordHash: 'hash' } });
    assert.equal((await withUser.service.sendPasswordResetEmail(ctx, 'c1')).success, true);
    assert.equal(withUser.getUser().getNativeAuthenticationMethod().passwordResetToken, 'reset-tok');
    assert.ok(withUser.published[0] instanceof PasswordResetEvent);
    assert.equal(withUser.historyService.createHistoryEntryForCustomer.mock.callCount(), 1);

    const guest = setup({ user: null });
    assert.equal((await guest.service.sendPasswordResetEmail(ctx, 'c1')).success, false);
    assert.equal(guest.published.length, 0);
});

test('account actions require customer permissions — never available to customers', () => {
    const perms = (method: string) => Reflect.getMetadata(PERMISSIONS_METADATA_KEY, CustomerAccountsAdminResolver.prototype[method]);
    assert.deepEqual(perms('customerAccountStatus'), [Permission.ReadCustomer]);
    assert.deepEqual(perms('sendCustomerVerificationEmail'), [Permission.UpdateCustomer]);
    assert.deepEqual(perms('verifyCustomerAccountManually'), [Permission.UpdateCustomer]);
    assert.deepEqual(perms('sendCustomerPasswordResetEmail'), [Permission.UpdateCustomer]);
    assert.deepEqual(perms('setCustomerPassword'), [Permission.UpdateCustomer]);
});

test('an account created without a password gets an "activate and choose your password" email', () => {
    const config = { storeName: 'Iron Savage' };
    const normal = renderEmailVerification(config, { customerName: 'Ana', verificationUrl: 'http://x/verify?token=a' });
    const invite = renderEmailVerification(config, { customerName: 'Pedro', verificationUrl: 'http://x/verify?token=b', needsPassword: true });

    assert.match(normal.subject, /Verifica tu email/);
    assert.match(invite.subject, /Activa tu cuenta/);
    assert.match(invite.html, /elige tu contraseña/);
    assert.match(invite.html, /token=b/);
});

test('an admin can change a customer password at any time; the customer is signed out everywhere', async () => {
    const { service, getUser, sessionService, historyService } = setup({ user: { verified: true, passwordHash: 'old' } });

    const result = await service.setPassword(ctx, 'c1', 'NuevaTemporal9');

    assert.equal(result.success, true);
    assert.equal(getUser().getNativeAuthenticationMethod().passwordHash, 'hashed:NuevaTemporal9');
    assert.equal(getUser().verified, true, 'verification state untouched');
    assert.equal(sessionService.deleteSessionsByUser.mock.callCount(), 1);
    assert.equal(historyService.createHistoryEntryForCustomer.mock.callCount(), 1);
});

test('changing a password requires 8+ characters and an existing login', async () => {
    const short = setup({ user: { verified: true, passwordHash: 'old' } });
    const r1 = await short.service.setPassword(ctx, 'c1', 'abc1234');
    assert.equal(r1.success, false);
    assert.match(r1.reason, /8 characters/);
    assert.equal(short.getUser().getNativeAuthenticationMethod().passwordHash, 'old');

    const guest = setup({ user: null });
    assert.equal((await guest.service.setPassword(ctx, 'c1', 'Suficiente123')).success, false);
});
