import { CrudPermissionDefinition } from '@vendure/core';

/**
 * A genuine native permission (not a borrowed/ill-fitting existing one) —
 * registered via `authOptions.customPermissions` in vendure-config.ts, and
 * assignable to Roles in the Admin UI/Dashboard like any built-in permission.
 * Creates CreateContent/ReadContent/UpdateContent/DeleteContent.
 */
export const contentPermission = new CrudPermissionDefinition('Content', operation => `Allows ${operation} access to news/content articles`);
