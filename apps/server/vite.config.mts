import type { LanguageCode } from '@vendure/common/lib/generated-types';
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
            // vendureDashboardPlugin analiza la configuración para encontrar los
            // plugins con extensiones del dashboard y para introspeccionar el
            // esquema GraphQL con las extensiones de API y campos personalizados
            // configurados.
            vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
            // Dónde está el servidor Vendure.
            // En producción, 'auto' hace que el dashboard deduzca la URL de la API del
            // servidor que lo sirve. En desarrollo se usan valores explícitos para que
            // el servidor de Vite pueda llegar al backend de Vendure.
            api: process.env.NODE_ENV === 'production'
                ? { host: 'auto', port: 'auto' }
                : { host: 'http://localhost', port: 3000 },
            // Al arrancar Vite se introspecciona el esquema de la Admin API y se
            // generan los tipos en esta ruta. Las extensiones del dashboard los usan
            // para tener tipos al escribir consultas y mutaciones.
            gqlOutputPath: './src/gql',
            // El dashboard se usa en español (por defecto) y a veces en inglés; el
            // selector de idioma solo ofrece estos dos. Nuestras extensiones traen
            // sus traducciones en el dashboard/i18n/{es,en}.po de cada plugin (ver
            // docs/dashboard-i18n.md).
            i18n: {
                defaultLanguage: 'es' as LanguageCode,
                availableLanguages: ['es', 'en'] as LanguageCode[],
                defaultLocale: 'ES',
                availableLocales: ['ES', 'GB'],
            },
            // El rojo de Iron Savage como color de acento del dashboard, con la
            // opción oficial para personalizar el tema (`theme.light`/`theme.dark`
            // de vendureDashboardPlugin, desde la 3.5.1). Solo se cambian los
            // colores de acento, no la maquetación, tipografía ni bordes: el
            // dashboard conserva su aspecto propio. Sin CSS global.
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
            // Permite que todos los plugins usen un mismo conjunto de tipos GraphQL.
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
        },
    },
});
