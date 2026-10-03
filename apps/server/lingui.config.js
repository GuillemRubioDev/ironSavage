// Configuración de extracción de las traducciones de NUESTRAS extensiones del
// dashboard (el dashboard de Vendure trae sus propios catálogos).
// `npm run i18n:extract` busca en la carpeta dashboard/ de cada plugin las macros
// de Lingui (<Trans>, t`...`, msg`...`) y las marcas `/* i18n*/ 'Título del menú'`,
// y actualiza el dashboard/i18n/{idioma}.po de ese plugin; el plugin de Vite del
// dashboard carga esos archivos solo. Ver docs/dashboard-i18n.md.
const { formatter } = require('@lingui/format-po');

const PLUGINS_WITH_DASHBOARD = [
    'athletes',
    'banners',
    'content',
    'customer-accounts',
    'dashboard-extras',
    'invoicing',
    'loyalty',
    'order-tools',
    'reviews',
];

module.exports = {
    sourceLocale: 'en',
    locales: ['en', 'es'],
    format: formatter({ lineNumbers: false }),
    orderBy: 'messageId',
    catalogs: PLUGINS_WITH_DASHBOARD.map(plugin => ({
        path: `<rootDir>/src/plugins/${plugin}/dashboard/i18n/{locale}`,
        include: [`<rootDir>/src/plugins/${plugin}/dashboard`],
        exclude: ['**/i18n/**'],
    })),
};
