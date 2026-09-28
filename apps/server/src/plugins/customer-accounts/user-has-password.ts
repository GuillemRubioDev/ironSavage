import { ID, NativeAuthenticationMethod, RequestContext, TransactionalConnection } from '@vendure/core';

/**
 * Whether a User has chosen a password. Accounts created from the Dashboard
 * without one (e.g. a new athlete) choose it from the verification link.
 * passwordHash is `select: false` on the entity, hence the explicit select.
 */
export async function userHasPassword(connection: TransactionalConnection, ctx: RequestContext, userId: ID): Promise<boolean> {
    const method = await connection
        .getRepository(ctx, NativeAuthenticationMethod)
        .createQueryBuilder('method')
        .addSelect('method.passwordHash')
        .innerJoin('method.user', 'user')
        .where('user.id = :userId', { userId })
        .getOne();
    return !!method?.passwordHash;
}
