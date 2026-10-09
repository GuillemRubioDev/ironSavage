# Guía de imágenes: qué subir desde el dashboard

Para quien sube fotos a la tienda desde el dashboard de Vendure. Sube **una sola imagen
por hueco**, en buena calidad: la tienda genera sola las versiones pequeñas (miniaturas,
tarjetas, móvil…) en formatos ligeros (AVIF/WebP). No hace falta preparar tamaños ni
convertir a WebP.

## Tabla resumen

| Qué subes | Dónde se sube en el dashboard | Tamaño recomendado (mínimo) | Proporción | Formato | Peso máx. | Dónde se ve |
|---|---|---|---|---|---|---|
| **Foto de producto** | Producto → Recursos | **2048 × 2048** (mín. 1200 × 1200) | 1:1 cuadrada | PNG con fondo transparente, o JPG con fondo blanco | 5 MB | Ficha del producto (con zoom), tarjetas de listados y búsqueda, carrito, añadido rápido, pedidos, al compartir el enlace |
| **Foto de variante** (sabor, tamaño…) | Producto → Variante → Recursos | **2048 × 2048** (mín. 1200 × 1200) | 1:1 | Igual que la de producto | 5 MB | Ficha al elegir esa variante, carrito y pedidos |
| **Banner de fondo** (portada) | Banners → imagen, diseño «Fondo» | **2400 × 1200** (mín. 1920 × 960) | 2:1 horizontal | JPG | 5 MB | Cabecera de la home, a todo el ancho |
| **Banner lateral** (bote a un lado) | Banners → imagen, diseño «Izquierda/Derecha» | **2048 × 2048** (mín. 1200 × 1200) | 1:1 | PNG con fondo transparente | 5 MB | Cabecera de la home, foto entera a un lado del texto |
| **Portada de noticia** | Contenido → Noticia → Imagen de portada | **1920 × 1080** (mín. 1600 × 900) | 16:9 horizontal | JPG | 5 MB | Listado de noticias, noticia destacada, cabecera de la noticia, al compartir |
| **Categoría** | Colecciones → Imagen destacada | **1200 × 1200** | 1:1 | JPG | 3 MB | Bloque «Categorías» de la home |
| **Objetivo** (colecciones `objetivo-…`) | Colecciones → Imagen destacada | **1200 × 1600** | 3:4 vertical | JPG | 3 MB | Bloque «Objetivos» de la home |
| **Panel de acceso** (login/registro) | Ajustes globales → Imagen del panel de acceso | **1600 × 2000** | 4:5 vertical | JPG | 5 MB | Mitad de la pantalla en login y registro (solo en ordenador) |

La imagen al compartir en WhatsApp o redes (Open Graph) **no se sube**: se genera sola a
partir de la foto del producto, la colección o la noticia.

## Reglas para todas

- **Más grande que el mínimo, nunca más pequeña.** Una imagen pequeña se ve borrosa en
  pantallas grandes y en el zoom. Más grande de lo recomendado no pasa nada: el servidor la
  reduce, pero no aporta nada y tarda más en subir.
- **Formato:** JPG para fotos; PNG solo cuando hace falta transparencia; WebP también vale.
  Nada de capturas de pantalla, PDF ni imágenes con texto pequeño (en móvil no se lee).
- **Peso:** el límite es por comodidad al subir; el cliente nunca descarga el original.
  Una foto de cámara de 10 MB conviene reducirla antes (lado largo de unos 2500 px).
- **Nombre del archivo:** descriptivo y sin espacios raros, p. ej.
  `iso-savage-chocolate-1kg.jpg`. Acaba formando parte de la URL de la imagen.
- **Sustituir una imagen:** sube una nueva y quita la antigua. No se «reemplaza» el archivo.

## Por tipo

### Productos y variantes
- **Mínimo 3 fotos por producto:** frontal (la primera, que es la que sale en listados),
  trasera con la información nutricional legible y una de detalle o en uso.
- El bote **centrado y con algo de margen** alrededor (≈ 8-10 % por lado): en tarjetas y
  carrito se muestra en cuadrado y no debe tocar los bordes.
- **Mismo fondo en todo el catálogo** (todo transparente o todo blanco) y el mismo
  encuadre, para que los listados se vean uniformes.
- La foto de cada variante (sabor) se muestra al elegirla; si una variante no tiene foto,
  se usan las del producto.

### Banners de la portada
- **Fondo:** la foto cubre toda la cabecera y se recorta según la pantalla. En ordenador
  se ve casi entera; **en móvil solo la franja central** (vertical). Pon lo importante en
  el centro y deja libre el lado donde va el texto (el de la alineación elegida): ahí se
  oscurece para que el texto se lea.
- **Lateral:** la foto se ve **entera, sin recortar**, junto al texto, sobre el fondo de
  marca. Ideal: el producto recortado con fondo transparente.
- Sin texto dentro de la imagen: el título y el botón los pone la tienda (y se traducen).

### Noticias
- Se recorta a 16:9; si la subes ya en 16:9 no se pierde nada.
- Sin texto dentro de la imagen (se cortaría y no se traduce).

### Categorías y objetivos
- Llevan un degradado oscuro abajo con el nombre encima: deja la **parte inferior
  tranquila**, sin detalles importantes.
- Si una categoría no tiene imagen, la tienda usa fotos de sus productos; un objetivo sin
  imagen muestra la inicial de su nombre sobre el fondo de marca.

### Panel de acceso
- Usa el **punto focal** del dashboard (al editar la imagen) para marcar lo importante: es
  lo que se mantiene a la vista cuando la pantalla recorta la foto.
- En móvil no se muestra ni se descarga.

## Detalles técnicos (para el equipo)

- Vendure guarda el original y crea una **preview WebP de hasta 2048 px**
  (`apps/server/src/webp-asset-preview-strategy.ts`); de ahí `next/image` genera cada
  tamaño en AVIF/WebP según la pantalla. Por eso 2048 es el tamaño útil máximo.
- Las imágenes subidas antes de ese cambio se regeneran con
  `node dist/regenerate-asset-previews.js` (ver el propio script).
- La imagen para compartir la genera `/api/og-image` (JPG 1200×630 con fondo blanco).
