import { VendurePlugin } from '@vendure/core';

/**
 * Plugin solo para el dashboard: sin esquema ni resolvers en el servidor. Existe
 * únicamente para que el buscador de plugins del dashboard de Vendure recoja su
 * carpeta `dashboard/` (exige un VendurePlugin registrado con la propiedad
 * `dashboard` en el decorador; ver vite/utils/plugin-discovery.js de
 * @vendure/dashboard). Contiene la marca de Iron Savage en la pantalla de login, el
 * widget de stock bajo y traducciones del núcleo, que no pertenecen a ningún otro
 * plugin (reseñas, contenido, fidelización, facturación).
 */
@VendurePlugin({
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class DashboardExtrasPlugin {}
