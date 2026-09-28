import { CrudPermissionDefinition } from '@vendure/core';

/**
 * Native, role-assignable permission (registered via
 * `authOptions.customPermissions` in vendure-config.ts). Creates
 * CreateAthlete/ReadAthlete/UpdateAthlete/DeleteAthlete. Customers and
 * athletes never hold it — they only reach the Owner-scoped Shop API queries.
 */
export const athletePermission = new CrudPermissionDefinition('Athlete', operation => `Allows ${operation} access to athletes, their codes and rewards`);
