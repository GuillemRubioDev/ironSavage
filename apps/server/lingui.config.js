// Extraction config for the translations of OUR Dashboard extensions (the
// Vendure Dashboard ships its own catalogs). `npm run i18n:extract` scans each
// plugin's dashboard/ folder for Lingui macros (<Trans>, t`...`, msg`...`) and
// `/* i18n*/ 'Menu title'` markers, and updates that plugin's
// dashboard/i18n/{locale}.po — the Dashboard's Vite plugin loads those files
// automatically. See docs/dashboard-i18n.md.
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
