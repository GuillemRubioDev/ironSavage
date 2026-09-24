// Top-level public module for this feature's route — see
// tests/i18n/../architecture/boundaries.test.mjs and eslint.config.mjs's
// no-restricted-imports: site/ may not reach into features/*/routes
// directly, so site/products/product-detail-page.tsx composes the page
// through this re-export instead.
export {default, generateMetadata} from './routes/page';
export type {ProductDetailPageProps} from './routes/page';
