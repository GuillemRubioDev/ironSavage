import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/dashboard',
    build: {
        outDir: join(__dirname, 'dist/dashboard'),
    },
    plugins: [
        vendureDashboardPlugin({
            // The vendureDashboardPlugin will scan your configuration in order
            // to find any plugins which have dashboard extensions, as well as
            // to introspect the GraphQL schema based on any API extensions
            // and custom fields that are configured.
            vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
            // Points to the location of your Vendure server.
            // In production, 'auto' lets the dashboard derive the API URL from the
            // server that serves it. In development, we use explicit defaults so that
            // the Vite dev server can reach the Vendure backend.
            api: process.env.NODE_ENV === 'production'
                ? { host: 'auto', port: 'auto' }
                : { host: 'http://localhost', port: 3000 },
            // When you start the Vite server, your Admin API schema will
            // be introspected and the types will be generated in this location.
            // These types can be used in your dashboard extensions to provide
            // type safety when writing queries and mutations.
            gqlOutputPath: './src/gql',
            // Iron Savage red as the Dashboard's accent color, via the
            // official theme-override option (vendureDashboardPlugin's
            // `theme.light`/`theme.dark`, since 3.5.1) — only the accent
            // tokens are overridden, not layout/typography/radius, so the
            // Dashboard keeps its own native look rather than mimicking the
            // storefront. No global CSS overrides.
            theme: {
                light: {
                    primary: 'oklch(0.577 0.245 27.325)',
                    'primary-foreground': 'oklch(0.99 0 0)',
                    ring: 'oklch(0.577 0.245 27.325)',
                    'sidebar-primary': 'oklch(0.577 0.245 27.325)',
                    'sidebar-primary-foreground': 'oklch(0.99 0 0)',
                    'sidebar-ring': 'oklch(0.577 0.245 27.325)',
                },
                dark: {
                    primary: 'oklch(0.63 0.23 27.325)',
                    'primary-foreground': 'oklch(0.99 0 0)',
                    ring: 'oklch(0.63 0.23 27.325)',
                    'sidebar-primary': 'oklch(0.63 0.23 27.325)',
                    'sidebar-primary-foreground': 'oklch(0.99 0 0)',
                    'sidebar-ring': 'oklch(0.63 0.23 27.325)',
                },
            },
        }),
    ],
    resolve: {
        alias: {
            // This allows all plugins to reference a shared set of
            // GraphQL types.
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
        },
    },
});
