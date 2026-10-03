import { CrudPermissionDefinition } from '@vendure/core';

/**
 * Un permiso nativo propio (no uno existente que no encaje), registrado con
 * `authOptions.customPermissions` en vendure-config.ts y asignable a roles en el
 * dashboard como cualquier permiso estándar.
 * Crea CreateContent/ReadContent/UpdateContent/DeleteContent.
 */
export const contentPermission = new CrudPermissionDefinition('Content', operation => `Allows ${operation} access to news/content articles`);
