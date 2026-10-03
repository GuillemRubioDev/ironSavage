// Módulo público de primer nivel de la ruta de esta funcionalidad; ver
// tests/i18n/../architecture/boundaries.test.mjs y la regla no-restricted-imports de
// eslint.config.mjs: site/ no puede entrar directamente en features/*/routes, así que
// site/products/product-detail-page.tsx compone la página mediante esta reexportación.
export {default, generateMetadata} from './routes/page';
export type {ProductDetailPageProps} from './routes/page';
