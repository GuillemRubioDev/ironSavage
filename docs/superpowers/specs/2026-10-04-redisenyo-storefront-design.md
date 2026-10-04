# Rediseño completo del storefront: diseño

- **Fecha:** 2026-10-04
- **Rama:** `redisenyo-app`
- **Estado:** aprobado en conversación (maquetas del companion visual: sistema visual, portada, catálogo y
  ficha, carrito y compra, cuenta y páginas secundarias). Pendiente de revisión de este documento.

## 1. Objetivo

Convertir la tienda en una **marca premium deportiva** a la altura de las referencias (Amix, Myprotein,
Prozis, HSN, Lifepro, GNC): más pulida, con fotografía, aire y animaciones actuales, pensada para vender en
móvil y escritorio. Se revisan **todas las pantallas** del storefront.

**Regla de oro:** no se cambia la lógica de negocio (precios, impuestos, stock, pedidos, pagos con Redsys,
login obligatorio para comprar, puntos, facturas, legal). Se cambia la presentación. Las únicas
funcionalidades nuevas son las listadas en la sección 7 y todas reutilizan la lógica existente.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dirección | Marca premium con base **híbrida**: oscuro en cabecera, portada, bloques de marca y pie; claro en catálogo, ficha, carrito, checkout y cuenta |
| Tema claro/oscuro | **Se mantiene el selector** (claro, oscuro, sistema). Claro = híbrido; oscuro = todo oscuro |
| Tipografía | Titulares **Barlow Condensed** cursiva (700–900); textos, interfaz y precios **Inter** con cifras tabulares. Se retiran Oswald, Black Ops One y Geist Mono |
| Paleta | Negro marca `#0B0B0C`, grafito `#17181B`, rojo marca `#E7000B` (hover `#C50009`), rojo para texto sobre oscuro `#FF4D4D`, blanco, gris claro `#F3F3F4`, verde estado `#16A34A` |
| Portada | Banner fijo con producto estrella + fila de categorías justo debajo + bloque de objetivos más abajo; se elimina el banner de texto con SVG |
| Tarjeta de producto | Botón **Añadir** que abre un selector rápido de variante |
| Movimiento | **Mixto**: enérgico en portada y bloques de marca; sutil en catálogo, ficha, carrito y checkout. Siempre se respeta `prefers-reduced-motion` |
| Fotografía | Hoy solo producto (gama, variante, ambiente); el diseño luce sin fotos de deportistas y las admite más adelante |
| Enfoque | **Sistema visual primero y después pantalla a pantalla**, por fases revisables |
| Animaciones | CSS moderno + View Transitions de Next; **sin librerías nuevas** salvo que un efecto concreto lo exija (se consultará antes) |

## 3. Sistema visual

### 3.1 Tokens (en `globals.css`, como variables CSS de Tailwind 4)

- **Zonas:** dos familias de superficies. *Marca* (`--brand-bg`, `--brand-surface`, `--brand-line`,
  `--brand-fg`, `--brand-muted`) siempre oscura en los dos temas, y *contenido* (`--background`, `--card`,
  `--muted`, `--foreground`…) que es clara en el tema claro y oscura en el oscuro. Cada sección declara a qué
  zona pertenece, así el modo oscuro no requiere estilos sueltos.
- **Rojo:** `--primary` para fondos con texto blanco (contraste AA garantizado en los dos temas) y
  `--primary-text` para texto rojo sobre fondo oscuro (`#FF4D4D`).
- **Radios:** 8 px controles, 12 px tarjetas, 14 px paneles grandes; 999 px pastillas.
- **Sombras:** elevación suave solo al interactuar (tarjetas al pasar el ratón, paneles flotantes).
- **Movimiento:** `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-spring: cubic-bezier(.3,1.6,.5,1)`;
  duraciones `--dur-fast: 160ms`, `--dur-base: 240ms`, `--dur-slow: 420ms`, `--dur-hero: 600ms`.
  Todo animando solo `transform` y `opacity` (o `background-size` en imágenes).

### 3.2 Tipografía

- `font-display` = Barlow Condensed cursiva, mayúsculas, interlineado ~0.92; para titulares, nombres de
  producto, cifras grandes y etiquetas de marca.
- Cuerpo e interfaz en Inter. Precios con `font-variant-numeric: tabular-nums`.
- Carga con `next/font/google` (sin peticiones externas en ejecución; la CSP no cambia).

### 3.3 Movimiento por zonas

- **Enérgico (portada y marca):** titulares que entran escalonados, zoom lento de la foto del banner, cinta
  de avisos en movimiento, objetivos que se elevan y subrayan en rojo, contadores/cifras que aparecen.
- **Sutil (tienda):** aparición escalonada de tarjetas al cargar, elevación 4 px y zoom de imagen al pasar
  el ratón, botones que se hunden al pulsar, carrito que "salta" al añadir, paneles que entran desde el
  lateral/abajo.
- **Transiciones entre páginas** con la View Transitions API (soportada por Next 16), degradando sin ella.
- Con `prefers-reduced-motion: reduce` se desactiva todo lo anterior salvo cambios instantáneos.

## 4. Componentes compartidos

| Componente | Qué es |
|---|---|
| `Button` (variantes) | Primario rojo, secundario con borde, fantasma sobre oscuro; respuesta al pulsar |
| `ProductCard` | Imagen (o nombre en grande si no hay foto), etiqueta Nuevo/Oferta, categoría principal, nombre en `font-display`, estrellas solo si hay reseñas, puntos de sabor, "desde X €", botón Añadir |
| `QuickAddSheet` | Selector rápido: diálogo en escritorio, panel desde abajo en móvil. Elige opciones, cantidad y añade con la acción de carrito existente. Productos con una sola variante se añaden directamente |
| `CartDrawer` | Panel lateral al añadir: confirmación, línea añadida, "Combínalo con" (productos relacionados existentes), subtotal, Finalizar compra / Ver carrito |
| `BrandBand` | Franja oscura de cabecera de listados y bloques de marca |
| `SectionHeader` | Titular de sección con palabra en rojo y enlace "Ver todos" |
| `CategoryTile` / `GoalTile` | Bloques de categoría y objetivo; imagen de la colección o inicial grande si no tiene |
| `TrustStrip` | Envío, pago seguro, 14 días, Iron Rewards |
| `Marquee` | Cinta de avisos (los textos de `top-bar-messages.ts`) |

El triángulo de entorno, la página de error con vuelta automática, el aviso de versión nueva y el banner de
cookies se mantienen tal cual, solo con los nuevos estilos.

## 5. Pantallas

### 5.1 Cabecera y pie
- Cabecera oscura: logo más grande, menú (categorías + "Objetivos" desplegable), **buscador visible** en
  escritorio, idioma, tema, cuenta y carrito con importe. Móvil: menú lateral (ya sensible a la sesión).
- Pie oscuro: logo grande, columnas Tienda / Ayuda / Legal, medios de pago, versión y aviso de IA.

### 5.2 Portada
Orden: cinta de avisos → cabecera → **banner fijo** (el primer banner activo de Marketing → Banners de
portada; titular escalonado y zoom lento) → **categorías** superpuestas al borde del banner → franja de
confianza → **Los más vendidos** (con Añadir) → **¿Cuál es tu objetivo?** (colecciones de la faceta
Objetivo; el bloque solo aparece si existen) → **Iron Rewards** (cifras leídas de la configuración real del
programa) → **Últimas noticias** → pie. Si no hay banner activo, se muestra un banner de marca oscuro.

### 5.3 Listados (productos, categoría, objetivo, búsqueda)
Franja oscura con migas de pan, título grande y nº de productos; filtros a la izquierda (facetas existentes)
con etiquetas de filtros activos y ordenación; rejilla de `ProductCard`; paginación actual. Móvil: botones
Filtrar y Ordenar, filtros en panel desde abajo con "Ver X productos".

### 5.4 Ficha de producto
Galería con miniaturas y zoom; al entrar no hay nada marcado salvo las opciones únicas (ver 7.8 y 7.9);
**al elegir una variante se ven todas sus fotos** y después las del producto
(hoy solo se ve la principal de la variante). Información: categoría, nombre, reseñas, precio con "IVA
incluido", stock, selectores con muestra de color, cantidad, Añadir al carrito, "Con esta compra sumas X
puntos" (configuración real), mini franja de confianza, desplegables (descripción, información alimentaria
en tabla, modo de empleo, ingredientes y alérgenos, advertencias, conservación). Franja oscura de **cifras
clave** derivadas de datos reales: proteína por dosis (fila "Proteínas" de la información nutricional),
nº de sabores (opciones), cantidad neta; solo se muestran las que existan. Debajo: reseñas, preguntas
frecuentes, relacionados. Móvil: carrusel de fotos y barra fija con precio y Añadir.

### 5.5 Carrito, checkout y confirmación
- **Carrito:** líneas con cantidad y eliminar; **resumen oscuro fijo** con subtotal, IVA, envío, canje de
  puntos (solo con sesión) y Finalizar compra. Móvil: resumen fijo abajo. Barra de "envío gratis" solo si
  existe un método de envío gratuito a partir de un importe.
- **Checkout:** barra de pasos (Dirección → Envío → Pago → Confirmación), paneles con "Cambiar", Redsys,
  condiciones y botón "Pagar X € de forma segura"; resumen al lado. Mismo flujo y validaciones de hoy.
- **Confirmación:** bloque oscuro con check animado, confeti rojo breve, puntos ganados y tres tarjetas
  (qué pasa ahora, factura, tu cuenta).

### 5.6 Cuenta
Barra lateral oscura (inicial, secciones, Atleta solo para atletas, cerrar sesión). **Nueva página de
resumen** `/mi-cuenta`: saludo, tarjeta Iron Rewards con barra, último pedido con estado, accesos rápidos
(incluido **Repetir último pedido**) y tabla de pedidos recientes. Resto de páginas (pedidos, detalle,
facturas, puntos, direcciones, perfil, atleta) con el nuevo estilo y la misma funcionalidad.

### 5.7 Acceso
Login y registro con panel de marca a la izquierda (imagen configurable, ver 6) y formulario a la derecha;
pestañas que enlazan las dos páginas actuales. Recuperar y restablecer contraseña y verificación de cuenta
con el mismo estilo.

### 5.8 Páginas secundarias
- **Noticias:** destacada grande en bloque oscuro + tarjetas; artículo con lectura cómoda.
- **Legales:** mismos textos; índice, títulos claros, ancho de línea cómodo, imprimir/PDF.
- **404:** bloque oscuro con "404" enorme y animación breve, "Te has salido de la ruta".
- **Error:** mismo comportamiento actual (vuelta automática), nuevo estilo.

## 6. Imágenes y de dónde salen

| Lugar | Fuente (editable en el dashboard) |
|---|---|
| Banner de portada | Marketing → Banners de portada (existente) |
| Categorías y objetivos | Imagen de la colección (existente); sin imagen → inicial grande |
| Productos | Imagen destacada del producto y de cada variante (existente); sin imagen → nombre en grande |
| Noticias | Imagen de portada de cada noticia (existente) |
| **Panel del login/registro** | **Nuevo campo personalizado `GlobalSettings.authPanelImage`** (Asset) en Ajustes globales; si no hay → imagen del primer banner activo; si no → fondo de marca |

## 7. Funcionalidades nuevas (todas sobre lógica existente)

1. **Selector rápido de variante** (`QuickAddSheet`): usa la acción de añadir al carrito actual.
2. **Panel lateral del carrito** (`CartDrawer`): se abre tras añadir; lee el pedido activo actual.
3. **Galería por variante** en la ficha.
4. **Repetir último pedido:** toma el pedido más reciente que el cliente haya realizado (ya pagado; se
   excluyen el carrito en curso y los cancelados) y añade sus líneas al carrito con la acción de añadir
   existente, una a una y con las mismas cantidades; omite variantes desactivadas o sin stock e informa de las
   omitidas. Solo con sesión iniciada; si no hay pedidos, el acceso rápido no aparece. **Solo copia productos y
   cantidades al carrito:** a partir de ahí es una compra nueva normal (checkout, pago, pedido nuevo, factura
   nueva, puntos nuevos) con los precios y promociones vigentes en ese momento; el pedido anterior no se toca.
5. **Imagen del panel de acceso configurable** (`GlobalSettings.authPanelImage`) con su migración.
6. **Página de resumen de la cuenta** (`/mi-cuenta`).
7. **Objetivos:** la faceta y las colecciones vienen del seed (rama `feat/objetivos`); el storefront solo
   las muestra.


8. **Opciones únicas marcadas por defecto** (selector rápido y ficha): si un grupo de opciones tiene una sola
   opción (p. ej. un único tamaño), aparece ya marcada; si el producto tiene una sola variante, todo está
   marcado y el botón Añadir funciona directamente (en las tarjetas, sin abrir el selector).
9. **La selección no se recuerda:** al salir de una ficha y volver (con un enlace o con "atrás"), las opciones
   aparecen sin marcar, salvo las únicas del punto 8. La selección vive solo en el estado de la página y deja
   de guardarse en la URL (hoy se guarda como `?grupo=opcion`); por tanto los enlaces ya no llevan el sabor
   elegido.

## 8. Fases de implementación

Cada fase se hace en `redisenyo-app`, se revisa en local (y con capturas en escritorio, móvil, claro y
oscuro) antes de pasar a la siguiente.

1. **Sistema visual:** tokens, fuentes, componentes base, movimiento y cabecera/pie.
2. **Portada.**
3. **Catálogo y ficha** (incluye selector rápido y galería por variante).
4. **Carrito, checkout y confirmación** (incluye panel lateral).
5. **Cuenta y acceso** (incluye resumen, repetir pedido e imagen configurable).
6. **Páginas secundarias** (noticias, legales, 404, error) y repaso final de todas las pantallas.

Al terminar todas: PR único de `redisenyo-app` a `develop`, prueba en el servidor de desarrollo y después a
`master`.

## 9. Requisitos transversales

- **Accesibilidad (Ley 11/2023 / WCAG 2.1 AA):** contraste AA en los dos temas, foco visible, navegación
  por teclado en paneles y diálogos, `prefers-reduced-motion`, zoom permitido, encabezados ordenados.
- **Idiomas:** todo texto nuevo en `es` y `en` (claves iguales en los dos; lo comprueba el test de mensajes).
- **Arquitectura del storefront:** `src/app` solo reexporta; `features` no importan de `site`; reglas de
  `tests/architecture`.
- **Rendimiento:** sin librerías nuevas; imágenes con `next/image` y tamaños adecuados; animaciones solo con
  `transform`/`opacity`.
- **Comprobación por fase:** `tsc`, lint, tests del storefront y del servidor, build de producción y
  capturas automáticas (escritorio/móvil, claro/oscuro). Nunca dejar servidores de prueba arrancados.

## 10. Fuera de alcance

- Cambios de precios, impuestos, envíos, pagos, estados de pedido, puntos o facturación.
- Boletín de noticias (newsletter), lista de deseos, reseñas nuevas o comparador.
- Fotografía definitiva (la aportará el equipo; el diseño funciona con lo que haya).
- Dashboard de Vendure (solo se añade el campo de imagen del panel de acceso).
