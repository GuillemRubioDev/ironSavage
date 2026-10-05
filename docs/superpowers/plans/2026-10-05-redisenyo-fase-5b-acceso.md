# Rediseño · Fase 5B: pendientes de la 5A, acceso e imagen del panel configurable · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- cerrar los detalles menores de la revisión final de la 5A;
- hacer configurable desde el admin la imagen del panel de acceso (`GlobalSettings.authPanelImage`), con su migración y una consulta pública para la tienda;
- unificar las páginas de acceso con el mismo diseño: panel de marca con imagen a la izquierda, pestañas que enlazan login y registro, y el mismo estilo en recuperar y restablecer contraseña y en la verificación.

**Architecture:**
- **Servidor:**
  - campo personalizado `authPanelImage` (relación con `Asset`, en `vendure-config.ts`, con etiquetas es/en para el dashboard);
  - migración escrita a mano con los nombres exactos que generaría TypeORM (columna `customFieldsAuthpanelimageid` y clave foránea `FK_18de4e503601e8016ac0367b183`, calculada con la misma regla `FK_ + sha1("global_settings_customFieldsAuthpanelimageid")[0..27]`), porque no hay base de datos local arrancada para generarla;
  - plugin `storefront-settings` con la consulta pública `storefrontSettings { authPanelImage }`, porque la Shop API no expone `GlobalSettings`;
  - aviso de revalidación a la tienda con el evento `GlobalSettingsEvent`.
- **Tienda:**
  - `getAuthPanelImage()` en caché (etiqueta `storefront-settings`; si la consulta falla, `null`);
  - un componente común `AuthShell` que usan las seis páginas de acceso.

**Tech Stack:** Vendure 3.7 (plugins, campos personalizados, EventBus), TypeORM, Next.js 16.3, next-intl y `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-04-redisenyo-storefront-design.md` (5.7 acceso; sección 7 punto 5, imagen configurable). Pendientes: informe de revisión final de la 5A.

## Global Constraints

- No se cambia la lógica de negocio ni la de autenticación: mismos formularios, acciones, validaciones y redirecciones. Solo cambia el envoltorio visual.
- La migración solo **añade** una columna nula y su clave foránea: es segura con datos reales. Se aplica sola al arrancar (`runMigrations` en `apps/server/src/index.ts`) y se documenta en `docs/database-migrations.md`.
- Sin imagen configurada (o si la consulta falla, p. ej. con un servidor aún sin desplegar), el panel muestra el fondo de marca de hoy.
- Sin librerías nuevas. Textos en `es` y `en`. Las features solo importan módulos de primer nivel de otras features.
- Comentarios en español. Nunca se dejan servidores de prueba arrancados. Tras tocar el servidor, `npm run build` del servidor (o su `tsc`) y sus tests.

## Review Focus

- **Servidor sin la consulta nueva (develop sin desplegar) o sin imagen:** las páginas de acceso funcionan con el fondo de marca (test de la Task 3 y comprobación en el navegador contra la API de desarrollo, que aún no tiene la consulta).
- **Imagen clara de fondo:** el texto del panel sigue legible gracias a un velo oscuro (test de la Task 3).
- **Pestañas:** enlazan las dos páginas y conservan `redirectTo` (si alguien llega a login desde el checkout y cambia a registro, vuelve al checkout tras registrarse) (test de la Task 3).
- **Migración:** solo añade columna y clave foránea, con nombres idénticos a los de TypeORM; `down` lo deshace (test de la Task 2).
- **Imagen borrada en el admin:** la columna apunta a `asset` con `NO ACTION`, así que Vendure no deja borrar un asset en uso. Se documenta: antes de borrarlo hay que quitarlo de los ajustes.

---

### Task 1: Pendientes de la 5A

**Files (Modify, desde `apps/storefront/src`):**
- `app/[locale]/globals.css`, `features/cart/routes/cart.tsx`
- `features/account/routes/summary/page.tsx`, `features/account/account-summary.ts`, `features/account/messages/{es,en}.json`
- `features/account/components/account-nav-links.tsx`

**Test:** `apps/storefront/tests/design/pending-fixes-5a.test.mjs` (nuevo).

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/pending-fixes-5a.test.mjs -->
```js
// Detalles menores de la revisión final de la fase 5A, cerrados en la 5B.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('barras fijas con la zona segura del iPhone y sin hueco doble en el carrito', async () => {
    assert.match(await read('app/[locale]/globals.css'), /padding-bottom: calc\(5rem \+ env\(safe-area-inset-bottom\)\)/);
    assert.doesNotMatch(await read('features/cart/routes/cart.tsx'), /pb-24/);
});

test('resumen: saludo sin coma colgando, moneda activa y puntos con plural', async () => {
    const page = await read('features/account/routes/summary/page.tsx');
    assert.match(page, /customer\?\.firstName \? t\('overview\.greeting'/);
    assert.match(page, /getActiveCurrencyCode\(\)/);
    for (const loc of ['es', 'en']) {
        const o = (await json(`features/account/messages/${loc}.json`)).Account.overview;
        assert.match(o.pointsBalance, /plural/);
        assert.match(o.toFirstRedeem, /plural/);
    }
});

test('con mínimo 0 y saldo 0 no se ofrece canjear 0 €', async () => {
    const {loyaltyProgress} = await load('features/account/account-summary.ts');
    assert.equal(loyaltyProgress({balance: 0, minRedeemablePoints: 0, pointValueInCents: 1, maxDiscountPerOrderCents: 2000}).canRedeem, false);
});

test('cerrar sesión se bloquea mientras trabaja', async () => {
    assert.match(await read('features/account/components/account-nav-links.tsx'), /useFormStatus/);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/pending-fixes-5a.test.mjs`
Expected: FAIL en los 4 tests.

- [ ] **Step 3: Implementar**

1. **Zona segura del iPhone y hueco doble.** En `globals.css`, `padding-bottom: calc(5rem + env(safe-area-inset-bottom));`. En `cart.tsx`, quitar `pb-24 lg:pb-0` de la rejilla (el relleno ya lo da `body:has([data-mobile-bar])`).
2. **Saludo sin coma colgando.** En el resumen, el `h1` usa `{customer?.firstName ? t('overview.greeting', {name: customer.firstName}) : t('overview.title')}`.
3. **Moneda activa.** En el resumen, `getActiveCurrencyCode()` (de `@/features/currency/currency-server`) entra en el `Promise.all` y sustituye a `lastOrder?.currencyCode ?? 'EUR'` en el importe canjeable.
4. **Puntos con plural.**
   - `Account.overview.pointsBalance`: es `"{points, plural, one {# punto} other {# puntos}}"` / en `"{points, plural, one {# point} other {# points}}"`.
   - `Account.overview.toFirstRedeem`: es `"{remaining, plural, one {Te falta # punto para tu primer canje} other {Te faltan # puntos para tu primer canje}}"` / en `"{remaining, plural, one {# point to go until your first redemption} other {# points to go until your first redemption}}"`.

   El `#` de ICU ya pone el separador de miles según el idioma.
5. **Mínimo 0.** En `loyaltyProgress`, la condición pasa a `balance > 0 && (minRedeemablePoints <= 0 || balance >= minRedeemablePoints)`. Si no se cumple y `minRedeemablePoints <= 0`, se devuelve `{canRedeem: false, percent: 0, remaining: 0, redeemableCents: 0}`.
6. **Cerrar sesión con estado de espera.** En `account-nav-links.tsx`, el botón pasa a un componente local `LogoutButton` que usa `useFormStatus()` (de `react-dom`) con `disabled={pending}` y `aria-busy={pending}`.
7. **Puntos de invitados con token.** Se queda como está: el token de invitado existe y la consulta devuelve `null` sin coste visible. El comentario de `cart.tsx` se corrige a "Sin token no hay sesión ni puntos".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && node --test tests/design/*.test.mjs && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS. Si un test anterior comprobaba `pb-24` o el texto antiguo, se actualiza con un ruling.

- [ ] **Step 5: Commit** — `fix(rediseño): pendientes menores de la cuenta`

---

### Task 2: Servidor: campo `authPanelImage`, migración, consulta pública y revalidación

**Files:**
- Modify: `apps/server/src/vendure-config.ts` (`customFields.GlobalSettings` y registro del plugin)
- Create: `apps/server/src/migrations/1791210000000-AddAuthPanelImage.ts`
- Create: `apps/server/src/plugins/storefront-settings/{api-extensions.ts,storefront-settings-shop.resolver.ts,storefront-settings.plugin.ts,storefront-settings-shop.resolver.spec.ts}`
- Modify: `apps/server/src/storefront-cache-event.ts` (etiqueta `storefront-settings`), `apps/server/src/plugins/price-display/storefront-revalidation.subscriber.ts` (escucha `GlobalSettingsEvent`)
- Modify: `apps/storefront/src/platform/revalidation/handler.ts` (`{match: 'storefront-settings', kind: 'exact'}`)
- Modify: `docs/database-migrations.md`

**Interfaces:**
- Produces: consulta pública de la Shop API `storefrontSettings: StorefrontSettings!`, con `type StorefrontSettings { authPanelImage: Asset }`.

- [ ] **Step 1: Escribir los tests que fallan**

<!-- archivo: apps/server/src/plugins/storefront-settings/storefront-settings-shop.resolver.spec.ts -->
```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { StorefrontSettingsShopResolver } from './storefront-settings-shop.resolver';

const fakeService = (customFields: Record<string, unknown>) => ({ getSettings: async () => ({ customFields }) }) as never;

test('storefrontSettings devuelve la imagen del panel de acceso configurada', async () => {
    const asset = { id: '7', preview: 'https://x/preview.webp' };
    const resolver = new StorefrontSettingsShopResolver(fakeService({ authPanelImage: asset }));
    assert.deepEqual(await resolver.storefrontSettings({} as never), { authPanelImage: asset });
});

test('storefrontSettings devuelve null si no hay imagen', async () => {
    const resolver = new StorefrontSettingsShopResolver(fakeService({}));
    assert.deepEqual(await resolver.storefrontSettings({} as never), { authPanelImage: null });
});

test('la migración solo añade la columna y su clave foránea, con los nombres de TypeORM', () => {
    const file = fs.readFileSync(path.join(__dirname, '../../migrations/1791210000000-AddAuthPanelImage.ts'), 'utf8');
    assert.match(file, /ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer/);
    assert.match(file, /ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY \("customFieldsAuthpanelimageid"\) REFERENCES "asset"\("id"\) ON DELETE NO ACTION ON UPDATE NO ACTION/);
    assert.match(file, /DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"/);
    assert.match(file, /DROP COLUMN "customFieldsAuthpanelimageid"/);
    assert.doesNotMatch(file, /DROP TABLE|TRUNCATE|DELETE FROM/);
});
```

- [ ] **Step 2: Lanzar los tests y ver que fallan**

Run: `cd apps/server && node --require ts-node/register --test src/plugins/storefront-settings/storefront-settings-shop.resolver.spec.ts`
Expected: FAIL (no existe el resolver ni la migración).

- [ ] **Step 3: Implementar**

<!-- archivo: apps/server/src/migrations/1791210000000-AddAuthPanelImage.ts -->
```ts
import {MigrationInterface, QueryRunner} from "typeorm";

/**
 * Imagen configurable del panel de acceso de la tienda (GlobalSettings.authPanelImage,
 * relación con Asset). Solo añade una columna nula y su clave foránea. Nombres
 * idénticos a los que genera TypeORM: columna = "customFields" + titleCase(
 * "authPanelImageId"); clave = "FK_" + sha1("global_settings_customFieldsAuthpanelimageid")
 * recortado a 27 caracteres.
 */
export class AddAuthPanelImage1791210000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY ("customFieldsAuthpanelimageid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAuthpanelimageid"`, undefined);
   }

}
```

<!-- archivo: apps/server/src/plugins/storefront-settings/api-extensions.ts -->
```ts
import gql from 'graphql-tag';

// Ajustes de la tienda que el storefront necesita leer sin sesión. La Shop API de
// Vendure no expone GlobalSettings, así que se publica solo lo necesario.
export const shopApiExtensions = gql`
    type StorefrontSettings {
        "Imagen del panel de marca de las páginas de acceso (login y registro). Null si no hay."
        authPanelImage: Asset
    }

    extend type Query {
        storefrontSettings: StorefrontSettings!
    }
`;
```

<!-- archivo: apps/server/src/plugins/storefront-settings/storefront-settings-shop.resolver.ts -->
```ts
import { Query, Resolver } from '@nestjs/graphql';
import { Asset, Ctx, GlobalSettingsService, RequestContext } from '@vendure/core';

/** Consulta pública con los ajustes de la tienda que necesita el storefront. */
@Resolver()
export class StorefrontSettingsShopResolver {
    constructor(private globalSettingsService: GlobalSettingsService) {}

    @Query()
    async storefrontSettings(@Ctx() ctx: RequestContext): Promise<{ authPanelImage: Asset | null }> {
        const settings = await this.globalSettingsService.getSettings(ctx);
        // authPanelImage es una relación eager: viene cargada con los ajustes.
        const customFields = settings.customFields as { authPanelImage?: Asset | null };
        return { authPanelImage: customFields.authPanelImage ?? null };
    }
}
```

<!-- archivo: apps/server/src/plugins/storefront-settings/storefront-settings.plugin.ts -->
```ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api-extensions';
import { StorefrontSettingsShopResolver } from './storefront-settings-shop.resolver';

/**
 * Publica en la Shop API los ajustes globales que necesita el storefront sin sesión
 * (hoy, la imagen del panel de acceso, GlobalSettings.authPanelImage). El campo
 * personalizado se define en vendure-config.ts, como los demás.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [StorefrontSettingsShopResolver],
    },
    compatibility: '^3.0.0',
})
export class StorefrontSettingsPlugin {}
```

En `vendure-config.ts`:
- importar `Asset` de `@vendure/core` y `StorefrontSettingsPlugin`, y añadir `StorefrontSettingsPlugin,` a `plugins`;
- en `customFields`, añadir:
  ```ts
  GlobalSettings: [
      {
          name: 'authPanelImage',
          type: 'relation',
          entity: Asset,
          eager: true,
          nullable: true,
          public: true,
          label: [
              { languageCode: LanguageCode.en, value: 'Sign-in panel image' },
              { languageCode: LanguageCode.es, value: 'Imagen del panel de acceso' },
          ],
          description: [
              { languageCode: LanguageCode.en, value: 'Image on the brand panel of the store sign-in and register pages. Empty: dark brand background. Remove it here before deleting the asset.' },
              { languageCode: LanguageCode.es, value: 'Imagen del panel de marca de las páginas de acceso y registro de la tienda. Vacío: fondo oscuro de marca. Quítala aquí antes de borrar el archivo.' },
          ],
      },
  ],
  ```

En `storefront-cache-event.ts`, `StorefrontCacheTag` gana `| 'storefront-settings'`.

En `storefront-revalidation.subscriber.ts`, importar `GlobalSettingsEvent` de `@vendure/core` y, junto a la suscripción de `StorefrontCacheEvent`:
```ts
// La imagen del panel de acceso vive en los ajustes globales.
this.eventBus.ofType(GlobalSettingsEvent).subscribe(() => this.schedule(['storefront-settings'], false));
```
(Mirar la firma real de `schedule` en el fichero y usar la misma forma que la línea de `StorefrontCacheEvent`.)

En `apps/storefront/src/platform/revalidation/handler.ts`, añadir `{match: 'storefront-settings', kind: 'exact'},` a `TAG_RULES`.

En `docs/database-migrations.md`, una sección nueva con el mismo formato que las demás:

> ## Cambio: imagen del panel de acceso (migración `AddAuthPanelImage`)
>
> - **Fichero**: `apps/server/src/migrations/1791210000000-AddAuthPanelImage.ts`
> - **Por qué existe**: la imagen del panel de marca de login y registro se elige en el dashboard (Ajustes → Ajustes globales → Imagen del panel de acceso).
> - **Esquema**: `global_settings.customFieldsAuthpanelimageid` (integer, nulo) con clave foránea a `asset(id)`.
> - **Solo añade una columna.** Segura con datos reales. Para borrar el archivo de la imagen, primero hay que quitarlo de los ajustes.

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/server && node --require ts-node/register --test src/plugins/storefront-settings/storefront-settings-shop.resolver.spec.ts && npm test 2>&1 | tail -4 && npx tsc --noEmit -p .`
Expected: PASS y tsc limpio.

- [ ] **Step 5: Commit** — `feat(servidor): imagen configurable del panel de acceso (GlobalSettings.authPanelImage) con consulta pública`

---

### Task 3: Tienda: páginas de acceso con `AuthShell`

**Files:**
- Create: `apps/storefront/src/features/authentication/auth-panel-image.ts`, `apps/storefront/src/features/authentication/components/auth-shell.tsx`
- Modify: `apps/storefront/src/features/authentication/routes/{sign-in,register,forgot-password,reset-password,verify,verify-pending}/page.tsx`
- Modify: `apps/storefront/src/features/authentication/messages/{es,en}.json`
- Test: `apps/storefront/tests/design/auth.test.mjs` (nuevo)

**Interfaces:**
- Produces:
  - `getAuthPanelImage() → Promise<string | null>`;
  - `AuthShell({tab?: 'signIn' | 'register', redirectTo?: string, title?: string, subtitle?: string, panelText?: string, children})` (componente de servidor).

- [ ] **Step 1: Escribir el test que falla**

<!-- archivo: apps/storefront/tests/design/auth.test.mjs -->
```js
// Fase 5B del rediseño: páginas de acceso.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));

test('imagen del panel desde storefrontSettings, en caché y con respaldo si falla', async () => {
    const data = await read('features/authentication/auth-panel-image.ts');
    assert.match(data, /storefrontSettings/);
    assert.match(data, /'use cache'/);
    assert.match(data, /cacheTag\('storefront-settings'\)/);
    assert.match(data, /catch/);
    assert.match(await read('platform/revalidation/handler.ts'), /\{match: 'storefront-settings', kind: 'exact'\}/);
});

test('AuthShell: imagen con velo oscuro o fondo de marca, y pestañas que conservan redirectTo', async () => {
    const shell = await read('features/authentication/components/auth-shell.tsx');
    assert.match(shell, /getAuthPanelImage\(\)/);
    assert.match(shell, /bg-gradient-to-t from-black\/85/);
    assert.match(shell, /bg-brand/);
    assert.match(shell, /aria-current=\{tab === 'signIn' \? 'page' : undefined\}/);
    assert.match(shell, /redirectTo \? `\?redirectTo=\$\{encodeURIComponent\(redirectTo\)\}` : ''/);
});

test('las seis páginas de acceso usan AuthShell; login y registro con pestañas', async () => {
    for (const p of ['sign-in', 'register', 'forgot-password', 'reset-password', 'verify', 'verify-pending']) {
        assert.match(await read(`features/authentication/routes/${p}/page.tsx`), /<AuthShell/, p);
    }
    assert.match(await read('features/authentication/routes/sign-in/page.tsx'), /tab="signIn"/);
    assert.match(await read('features/authentication/routes/register/page.tsx'), /tab="register"/);
    for (const loc of ['es', 'en']) assert.ok((await json(`features/authentication/messages/${loc}.json`)).Auth.authTabs);
});
```

- [ ] **Step 2: Lanzar el test y ver que falla**

Run: `cd apps/storefront && node --test tests/design/auth.test.mjs`
Expected: FAIL en los 3 tests.

- [ ] **Step 3: Implementar**

<!-- archivo: apps/storefront/src/features/authentication/auth-panel-image.ts -->
```ts
import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {graphql} from '@/platform/vendure/graphql';

// La copia local del esquema (graphql-env.d.ts) aún no conoce storefrontSettings (la
// añade el plugin storefront-settings del servidor): el resultado se tipa a mano, igual
// que activeBanners en site/home/banners-data.ts.
const StorefrontSettingsQuery = graphql(`
    query StorefrontSettings {
        storefrontSettings {
            authPanelImage {
                preview
            }
        }
    }
`);

/**
 * URL de la imagen del panel de acceso configurada en el admin (Ajustes globales), o
 * null. Si la consulta falla (p. ej. un servidor aún sin el plugin), null: el panel
 * usa el fondo de marca. Se revalida con la etiqueta storefront-settings.
 */
export async function getAuthPanelImage(): Promise<string | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag('storefront-settings');

    try {
        const {data} = await query(StorefrontSettingsQuery);
        const settings = (data as unknown as {storefrontSettings?: {authPanelImage?: {preview: string} | null}}).storefrontSettings;
        return settings?.authPanelImage?.preview ?? null;
    } catch {
        return null;
    }
}
```

<!-- archivo: apps/storefront/src/features/authentication/components/auth-shell.tsx -->
```tsx
import type {ReactNode} from 'react';
import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {Logo} from '@/components/brand/logo';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {cn} from '@/lib/utils';
import {getAuthPanelImage} from '@/features/authentication/auth-panel-image';

/**
 * Envoltorio de las páginas de acceso: panel de marca a la izquierda (imagen elegida en
 * el admin con un velo oscuro para leer el texto, o el fondo de marca) y, a la derecha,
 * pestañas Iniciar sesión / Crear cuenta (solo en login y registro), título y formulario.
 * Las pestañas conservan redirectTo para volver adonde se iba (p. ej. al checkout).
 */
export async function AuthShell({tab, redirectTo, title, subtitle, panelText, children}: {
    tab?: 'signIn' | 'register';
    redirectTo?: string;
    title?: string;
    subtitle?: string;
    panelText?: string;
    children: ReactNode;
}) {
    const locale = await getRouteLocale();
    const [t, image] = await Promise.all([getTranslations({locale, namespace: 'Auth'}), getAuthPanelImage()]);
    const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
    const tabClass = (active: boolean) => cn(
        'flex-1 border-b-2 px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide transition-colors',
        active ? 'border-primary-solid text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
    );

    return (
        <div className="flex min-h-[calc(100vh-var(--header-offset))]">
            {/* Panel de marca, solo escritorio: siempre oscuro, sea cual sea el tema. */}
            <div className="relative hidden overflow-hidden bg-brand text-brand-fg lg:flex lg:w-1/2 lg:items-end">
                {image ? (
                    <>
                        <Image src={image} alt="" fill priority sizes="50vw" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" aria-hidden="true" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(231_0_11/22%),transparent)]" aria-hidden="true" />
                )}
                <div className="relative w-full max-w-lg space-y-6 p-12">
                    <Logo variant="full" className="h-32 w-auto" />
                    {panelText && <p className="text-xl leading-relaxed text-white/85">{panelText}</p>}
                    <ul className="grid grid-cols-3 gap-6 pt-2">
                        {[['featureFast', 'featureCheckout'], ['featureSecure', 'featurePayments'], ['featureEasy', 'featureReturns']].map(([title, text]) => (
                            <li key={title}>
                                <p className="font-display text-2xl font-black italic">{t(title)}</p>
                                <p className="text-sm text-white/70">{t(text)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Formulario */}
            <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
                <div className="w-full max-w-md space-y-6">
                    <Logo variant="wordmark" className="mx-auto h-6 lg:hidden" />
                    {tab && (
                        <nav aria-label={t('authTabs')} className="flex border-b border-border">
                            <Link href={`/login${query}`} aria-current={tab === 'signIn' ? 'page' : undefined} className={tabClass(tab === 'signIn')}>{t('signIn')}</Link>
                            <Link href={`/registro${query}`} aria-current={tab === 'register' ? 'page' : undefined} className={tabClass(tab === 'register')}>{t('createAccount')}</Link>
                        </nav>
                    )}
                    {(title || subtitle) && (
                        <div className="space-y-2 text-center">
                            {title && <h1 className="text-5xl">{title}</h1>}
                            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
```

Páginas:
- `sign-in/page.tsx`: el `return` pasa a `<AuthShell tab="signIn" redirectTo={…} title={t('signIn')} subtitle={t('enterCredentials')} panelText={t('welcomeBack')}><Suspense fallback={<LoginFormSkeleton/>}><SignInContent searchParams={searchParams}/></Suspense></AuthShell>`. `redirectTo` se lee de `searchParams` dentro de un componente con su propio `Suspense`: como `searchParams` es dinámico, `AuthShell` recibe `redirectTo` de un envoltorio asíncrono (`SignInShell`), que se pinta dentro de un `Suspense` con el mismo esqueleto de la página. Se quita el `Logo` y el marcado del panel antiguo.
- `register/page.tsx`: igual, con `tab="register"`, `title={t('createAccount')}`, `subtitle={t('signUpMessage')}` y `panelText={t('joinUs')}`.
- `forgot-password`, `reset-password`, `verify` y `verify-pending`: el contenedor exterior (`div` con `min-h…` o `container…`) se sustituye por `<AuthShell panelText={t('welcomeBack')}>…</AuthShell>` y el contenido interior se queda igual. Si la página no tiene `t` del namespace `Auth`, se añade `getTranslations({locale, namespace: 'Auth'})`. En `verify-pending`, si el `return` con `Card` es de un componente interno, se envuelve la página que lo pinta.

Mensajes `Auth.authTabs`: "Acceso a tu cuenta" / "Account access".

- [ ] **Step 4: Lanzar los tests y ver que pasan**

Run: `cd apps/storefront && npm test 2>&1 | tail -4 && npx tsc --noEmit -p . && npx eslint src`
Expected: PASS, salvo los 3 de upgrade; limpio.

- [ ] **Step 5: Commit** — `feat(acceso): páginas de acceso con panel de marca e imagen configurable y pestañas`

---

### Task 4: Verificación

- [ ] **Step 1:**
  - **Servidor:** `npm test` y `npx tsc --noEmit -p .` en `apps/server`, y `npm run build:server`, que compila sin tocar la base de datos.
  - **Tienda:** `npm test`, `tsc` y `eslint`.
- [ ] **Step 2:** `next build` de la tienda en la copia temporal `tmp-fase5b` (ignorada por git y por VS Code) y `next start -p 3200` contra la API de desarrollo, que aún no tiene `storefrontSettings` (comprueba el respaldo).
- [ ] **Step 3:** Capturas de `/login`, `/registro`, `/forgot-password` y `/verify-pending`, en escritorio y móvil y en claro y oscuro (`visual-check.mjs`, `OUT=fase5b`). Comprobar en `/login?redirectTo=/checkout` que la pestaña "Crear cuenta" enlaza a `/registro?redirectTo=%2Fcheckout`.
- [ ] **Step 4:** La imagen configurada solo se puede ver tras desplegar el servidor con la migración. Queda como comprobación del usuario en develop: dashboard → Ajustes → Ajustes globales → "Imagen del panel de acceso".
- [ ] **Step 5:** Limpieza: solo el árbol del puerto 3200; quitar la unión con `rmdir` desde dentro de la copia; borrar la copia; comprobar `node_modules`.
