import { ID, NativeAuthenticationMethod, RequestContext, TransactionalConnection } from '@vendure/core';

/**
 * Si un User ha elegido contraseña. Las cuentas creadas desde el dashboard sin
 * contraseña (p. ej. un atleta nuevo) la eligen desde el enlace de verificación.
 * passwordHash es `select: false` en la entidad, de ahí el select explícito.
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
