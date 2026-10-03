# Arquitectura del storefront

El storefront se distribuye como código fuente: el equipo es dueño de todos los archivos escritos por personas y puede
cambiarlos. Su organización sirve para que personas y agentes encuentren las cosas en un sitio predecible, no para
hacer intocables partes del storefront.

## A quién pertenece cada carpeta

```text
src/
  app/          Solo el cableado de rutas de Next.js
  config/       Valores de toda la tienda compartidos por features y composición del sitio
  features/     Funcionalidades de comercio verticales
  platform/     Mecánica transversal: Next.js, i18n, revalidación, analítica y Vendure
  site/         Composición propia de la tienda, navegación, páginas legales y marca
  components/ui Componentes de diseño genéricos
```

Cada feature agrupa sus operaciones GraphQL, acciones, vistas, mensajes e implementaciones de rutas. El árbol `app/`
delega en esas implementaciones, para que el enrutado por carpetas no sea también el sitio donde se concentra la lógica.

Las dependencias apuntan hacia la configuración compartida y la plataforma: los módulos de `site/` pueden componer
features, pero las features no pueden importar de `site/`. ESLint y los tests de arquitectura comprueban estas fronteras,
tanto con alias como con imports relativos.

## Interfaz de cada feature

Los archivos de primer nivel de una feature son su interfaz externa. Sus carpetas `components/` y `routes/` son detalles
internos: otra feature o un módulo de `site/` no puede importarlas directamente (lo comprueba ESLint). El código de
dentro de una feature sí puede usar sus propias carpetas internas.

Es preferible un módulo de primer nivel concreto, como `features/account/customer.ts`, a un barrel que lo reexporte
todo: así quedan claras las fronteras entre servidor y cliente y no se arrastran exportaciones ajenas a los bundles.

## A quién pertenece cada operación GraphQL

Las operaciones GraphQL escritas a mano van con la feature responsable de su comportamiento. El transporte y los tipos
generados del esquema están en `platform/vendure`. Los campos personalizados propios se piden en la operación de la
feature correspondiente; `src/graphql-env.d.ts` es código generado y se regenera contra el esquema de la Shop API.

## Traducciones

Las traducciones van con su feature o módulo de `site/`. Cada uno expone un único registro de idiomas de primer nivel, y
`site/i18n/messages.ts` los combina y rechaza los namespaces duplicados. Añadir una feature supone una sola entrada en
esa composición; añadir un idioma solo toca a cada módulo y a la configuración de rutas.

## Tipos de las rutas

Las implementaciones de rutas de las features usan los tipos `PageProps` y `LayoutProps` que genera Next.js para su ruta
concreta. Así los parámetros de ruta se comprueban contra el árbol `app/`, aunque los archivos mínimos de `app/` deleguen
la implementación en las features.
