# Idiomas del dashboard

El dashboard de administración se usa en **español** (por defecto) y, ocasionalmente, en **inglés**. Cada
administrador elige su idioma desde el menú de usuario (abajo a la izquierda → idioma); solo se ofrecen esos dos.

## Cómo está montado

| Pieza | Dónde | Qué hace |
|---|---|---|
| Idiomas disponibles y por defecto | `apps/server/vite.config.mts` → `vendureDashboardPlugin({ i18n })` | Solo `es` y `en`; `es` por defecto. Regiones `ES`/`GB` (formato de fechas y moneda). |
| Idioma por defecto para administradores nuevos | `patches/@vendure+dashboard+3.7.2.patch` (`user-settings.tsx`) | Vendure 3.7.2 ignoraba `defaultLanguage` y empezaba siempre en inglés. |
| Textos de Vendure | catálogos de `@vendure/dashboard` | Ya vienen en español. Los que Vendure dejó sin traducir se completan en `dashboard-extras/dashboard/vendure-core-translations.ts`. |
| Textos fijos en inglés dentro de Vendure | mismo parche (`nav-main.tsx`, `customer-order-table.tsx`) | «Administración» del menú y las cabeceras/estados de la tabla de pedidos del cliente. |
| Textos de nuestros plugins | `apps/server/src/plugins/<plugin>/dashboard/i18n/{es,en}.po` | Uno por plugin; el dashboard los carga solo y tienen prioridad sobre los de Vendure. |

El idioma de cada administrador se guarda en el servidor (ajuste `vendure.dashboard.userSettings`). El español
por defecto solo aplica a quien aún no tenga ese ajuste guardado. Si ya usabas el dashboard en inglés,
cámbialo una vez desde el selector de idioma.

## Añadir o cambiar textos en una extensión del dashboard

Los textos se escriben **en inglés** en el código y se traducen en el `.po`:

```tsx
import { Trans, useLingui } from '@lingui/react/macro';

function MiPagina() {
    const { t } = useLingui();
    return (
        <>
            <PageTitle><Trans>Athletes</Trans></PageTitle>                 {/* texto JSX */}
            <Input placeholder={t`Search by name or email...`} />           {/* atributos / strings */}
        </>
    );
}
```

- Fuera de componentes (funciones auxiliares): `import { t } from '@lingui/core/macro'`.
- Constantes de módulo que se muestran después (p. ej. opciones de un select): `msg` de
  `@lingui/core/macro` y en el componente `i18n._(descriptor)`.
- Títulos de menú (`navMenuItem.title`) y `name` de widgets: `/* i18n*/ 'Athletes'` (id explícito).
- Breadcrumbs y títulos de bloques aceptan JSX: `breadcrumb: <Trans>Athletes</Trans>`.
- Nombres de estados de pedido: ids `orderState.<Estado>` (ver `order-tools/dashboard/order-state-translations.ts`).

Después, desde `apps/server`:

```bash
npm run i18n:extract
```

Esto actualiza los `.po` de todos los plugins. Rellena los `msgstr ""` vacíos de cada `es.po`: son los textos
nuevos. Las traducciones que ya existían se conservan. En `en.po` solo hay que tocar los ids explícitos que no
son texto (como `orderState.*`), porque para el resto el inglés es el propio texto de origen.

Si tienes `npm run dev` arrancado, **reinícialo** para que el dashboard cargue los `.po` nuevos.
