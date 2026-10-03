import { CrudPermissionDefinition } from '@vendure/core';

/**
 * Un permiso nativo propio (no uno existente que no encaje), registrado con
 * `authOptions.customPermissions` en vendure-config.ts y asignable a roles en el
 * dashboard como cualquier permiso estándar.
 * Crea CreateBanner/ReadBanner/UpdateBanner/DeleteBanner.
 */
export const bannerPermission = new CrudPermissionDefinition('Banner', operation => `Allows ${operation} access to home carousel banners`);
