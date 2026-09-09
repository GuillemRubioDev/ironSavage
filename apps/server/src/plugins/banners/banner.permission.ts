import { CrudPermissionDefinition } from '@vendure/core';

/**
 * A genuine native permission (not a borrowed/ill-fitting existing one) —
 * registered via `authOptions.customPermissions` in vendure-config.ts, and
 * assignable to Roles in the Admin UI/Dashboard like any built-in permission.
 * Creates CreateBanner/ReadBanner/UpdateBanner/DeleteBanner.
 */
export const bannerPermission = new CrudPermissionDefinition('Banner', operation => `Allows ${operation} access to home carousel banners`);
