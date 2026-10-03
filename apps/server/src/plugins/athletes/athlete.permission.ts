import { CrudPermissionDefinition } from '@vendure/core';

/**
 * Permiso nativo, asignable a roles (registrado con
 * `authOptions.customPermissions` en vendure-config.ts). Crea
 * CreateAthlete/ReadAthlete/UpdateAthlete/DeleteAthlete. Los clientes y los atletas
 * nunca lo tienen: solo acceden a las consultas de la Shop API limitadas a su propio usuario.
 */
export const athletePermission = new CrudPermissionDefinition('Athlete', operation => `Allows ${operation} access to athletes, their codes and rewards`);
