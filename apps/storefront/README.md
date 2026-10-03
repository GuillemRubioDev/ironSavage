<p align="center">
  <a href="https://vendure.io">
    <img alt="Logo de Vendure" height="60" width="auto" src="https://a.storyblok.com/f/328257/699x480/8dbb4c7a3c/logo-icon.png/m/0x80">
  </a>
</p>
<h1 align="center">
  Storefront de Iron Savage
</h1>
<h3 align="center">
  Tienda en Next.js 16 sobre Vendure, basada en el Vendure Next.js Storefront Starter
</h3>
<p align="center">
  Código propio y personalizable, con un camino controlado para incorporar las nuevas versiones de la plantilla.
</p>
<h4 align="center">
  <a href="https://next.vendure.io">Demo de la plantilla</a> |
  <a href="https://docs.vendure.io">Documentación de Vendure</a> |
  <a href="https://vendure.io">Web de Vendure</a>
</h4>

## Funcionalidades

**Autenticación y cuentas**

- Registro de clientes con verificación por email y aceptación de los términos
- Inicio y cierre de sesión
- Recuperación y cambio de contraseña
- Cambio de email con verificación

**Cuenta de cliente**

- Gestión del perfil (nombre, email, contraseña)
- Gestión de direcciones (crear, editar, borrar, predeterminada)
- Historial de pedidos con paginación y detalle
- Facturas, puntos de fidelización y panel de atleta

**Catálogo**

- Colecciones y productos destacados
- Fichas de producto con variantes, galería e información alimentaria
- Búsqueda de texto con filtros por facetas
- Paginación y ordenación

**Carrito**

- Añadir y quitar productos, cambiar cantidades
- Códigos promocionales (incluidos los de atleta)
- Totales actualizados al momento

**Checkout**

- Proceso por pasos: dirección de envío, método de envío, pago y revisión
- Selección de direcciones guardadas
- Pago con tarjeta mediante Redsys
- Aceptación de los términos registrada en el pedido

**Pedidos**

- Página de confirmación
- Seguimiento del estado
- Detalle del pedido

**Idiomas**

- Español (por defecto) e inglés con next-intl
- Varias monedas con selección persistente
- Precios con el formato de cada idioma

**Legal, accesibilidad y analítica**

- Páginas legales (aviso legal, términos, privacidad, cookies, envíos y devoluciones, IA, accesibilidad)
- Banner y preferencias de cookies; Google Analytics 4 solo con consentimiento
- Objetivo WCAG 2.1 AA

**Pensado para personalizar y actualizar**

- Código propio, sin capas bloqueadas ni generadas
- Módulos por funcionalidad con fronteras de dependencias comprobadas
- Operaciones GraphQL y traducciones junto a su funcionalidad
- Manifiestos de versión para conciliar los cambios de la plantilla con las personalizaciones

## Puesta en marcha

En este monorepo, lo normal es arrancar todo desde la raíz con `npm run dev` (servidor Vendure, dashboard y
storefront). Para arrancar solo el storefront hace falta un servidor Vendure con la Shop API disponible: copia el
entorno de ejemplo, apunta `VENDURE_SHOP_API_URL` a esa API, instala dependencias y arranca:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001) en el navegador.

La plantilla de entorno documenta también los ajustes opcionales de canal, metadatos, cabecera de autenticación y
revalidación de caché.

## Arquitectura

Todo archivo del storefront escrito por personas se puede cambiar. El código está organizado para que esos cambios
queden localizados y las actualizaciones futuras sean fáciles de conciliar:

```text
src/
  app/          Solo el cableado de rutas de Next.js
  config/       Configuración de toda la tienda (empresa, versión legal, metadatos)
  features/     Funcionalidades de comercio verticales
  platform/     Integraciones con Next.js, i18n, revalidación, analítica y Vendure
  site/         Composición propia de la tienda, navegación, páginas legales y marca
  components/ui Componentes de diseño genéricos
```

Los archivos de `src/app` deben ser mínimos; la lógica va en el módulo al que pertenece. Una feature se expone a otros
módulos mediante sus archivos de primer nivel; sus carpetas `components/` y `routes/` son internas.

Lee la [guía de arquitectura](./docs/architecture.md) antes de añadir una funcionalidad.

## Actualizaciones de la plantilla

Las versiones etiquetadas de la plantilla incluyen indicaciones estructuradas para que una persona o un agente pueda
incorporar los cambios sin sobrescribir sin querer las personalizaciones de la tienda.

Tras crear el storefront desde una etiqueta de versión, registra una vez su procedencia exacta:

```bash
npm run upgrade:init
git add .vendure/storefront.json
git commit -m "chore: initialize storefront provenance"
```

Para preparar una actualización posterior, en una rama limpia y dedicada:

```bash
npm run upgrade:prepare -- 1.1.0
```

El comando crea un espacio de trabajo (ignorado por git) con las instantáneas antigua y nueva de la plantilla, las
indicaciones de la versión y una plantilla de informe. Concilia los cambios y sigue las instrucciones generadas para
verificar y cerrar la actualización.

La [guía de actualizaciones](./docs/upgrades.md) describe el flujo completo, la incorporación de proyectos antiguos y la
publicación de versiones.

## Desarrollo

Antes de enviar un cambio, ejecuta las mismas comprobaciones que la CI:

```bash
npm run upgrade:validate
npm test
npm run lint
npm run check-types
npm run build
```

Los pull requests que afectan al código propio necesitan una nota de actualización o una exención explícita. Ver
[CONTRIBUTING.md](./CONTRIBUTING.md).
