# Importación del catálogo desde Excel — diseño

Fecha: 2026-10-14 · Estado: pendiente de revisión

## Objetivo

Que el cliente final rellene una **plantilla Excel** con sus productos, variantes y categorías, y que un administrador la **suba desde el panel de Vendure** para crear o actualizar el catálogo sin tocar la base de datos a mano.

El primer uso real será cargar el **catálogo base de develop** (los 5 productos actuales, con ISO SAVAGE como modelo de ficha completa) después de limpiar develop con `scripts/limpiar-develop.sh`.

**Criterios de éxito:**
- La plantilla se descarga desde el panel, se entiende sin explicaciones (hoja de instrucciones, listas desplegables, una fila de ejemplo) y abre bien en Excel y en LibreOffice.
- Subir un Excel con errores **no cambia nada** y muestra cada error con su hoja, fila y columna.
- Subir el mismo Excel dos veces deja el mismo catálogo (no duplica).
- Un producto importado se ve completo en la tienda: ficha, sabores, precio con IVA, stock, fotos, categorías, objetivos e información alimentaria.

## Decisiones

| Decisión | Elegido | Por qué |
|---|---|---|
| Formato | `.xlsx` (no CSV) | Es lo que el cliente sabe usar: varias hojas, desplegables, celdas con saltos de línea (tabla nutricional). |
| Librería | `exceljs` (MIT) | Lee y escribe `.xlsx` con validaciones de datos (desplegables) y estilos. Nueva dependencia del servidor. |
| Crear o actualizar | **Crear si no existe, actualizar si existe, nunca borrar** | El cliente puede corregir y volver a subir la ficha. Clave: `slug` en productos y categorías, `SKU` en variantes. |
| Celda vacía al actualizar | **No cambia ese campo** | Así se puede subir un Excel parcial (p. ej. solo precios) sin vaciar lo demás. Para vaciar un campo de texto se escribe `-`. |
| Motor | Servicios de Vendure (`ProductService`, `ProductVariantService`, `CollectionService`, `AssetService`…), no el `Importer` CSV | El `Importer` de Vendure solo crea. Los servicios garantizan traducciones, canal, precios, stock, índice de búsqueda y colecciones. |
| Todo o nada | Validación completa antes de escribir y escritura en **una transacción** | Un Excel con un error no deja el catálogo a medias. |
| Precio | Se escribe **con IVA** (como lo ve el cliente) | El canal guarda los precios sin IVA (`pricesIncludeTax: false`): el importador divide por el tipo de la categoría de IVA elegida en la zona por defecto. |
| Fotos | Nombre de archivo de un **ZIP** que se sube junto al Excel, o una **URL** | El cliente suele tener las fotos en una carpeta; las URL sirven para fotos ya publicadas. Una foto ya importada antes (mismo contenido) se reutiliza. |
| Tamaño | Petición síncrona, máx. 2.000 filas de variantes y ZIP de 200 MB | El catálogo es de decenas de productos. Una cola de trabajos sería complejidad sin necesidad hoy. |
| Exportar el catálogo actual a Excel | **Fuera de esta versión** | Útil más adelante (editar lo existente); el catálogo base se prepara a mano esta vez. |

## La plantilla (`plantilla-catalogo.xlsx`)

Se genera en el servidor, así las listas desplegables salen siempre de los datos reales (categorías de IVA, objetivos, categorías existentes). Las columnas obligatorias van marcadas con `*` y en otro color. Cada hoja trae una fila de ejemplo en gris (ISO SAVAGE) que el importador ignora.

**Hoja «Instrucciones»:** qué es cada hoja, la regla de crear/actualizar/nunca borrar, la de la celda vacía y el `-`, cómo nombrar las fotos y cómo se escribe la tabla nutricional.

**Hoja «Productos»** (una fila por producto):

| Columna | Notas |
|---|---|
| `slug*` | Identificador en la URL (`iso-savage`). Clave para actualizar. Solo minúsculas, números y guiones. |
| `nombre*` / `nombre_en` | |
| `descripcion` / `descripcion_en` | Texto; los saltos de línea se convierten en párrafos. |
| `categorias` | Slugs de la hoja «Categorías» o ya existentes, separados por `|`. |
| `objetivos` | Desplegable múltiple con los objetivos de la tienda (`ganar-musculo|recuperacion`). |
| `marca`, `etiquetas` | Valores de faceta (`marca`: pública; `etiquetas`: privada, separadas por `|`). |
| `fotos` | Archivos del ZIP o URL, separados por `|`; la primera es la principal. |
| `activo`, `visible_en_tienda`, `novedad`, `es_complemento_alimenticio` | Sí/No. |
| `ingredientes`, `alergenos`, `tabla_nutricional`, `modo_de_empleo`, `advertencias`, `conservacion`, `pais_origen`, `operador_responsable` | Los campos de «Información alimentaria» que ya tiene la ficha. `tabla_nutricional`: una línea por nutriente, `Nutriente | por 100 g | por dosis`. |

**Hoja «Variantes»** (una fila por formato vendible):

| Columna | Notas |
|---|---|
| `slug_producto*` | Producto al que pertenece. |
| `sku*` | Clave para actualizar. Único en todo el catálogo. |
| `sabor`, `peso` | Opciones de la variante (grupos «Sabor» y «Peso» del producto). Un producto con un solo sabor puede dejarlo vacío. |
| `color_sabor` | Color de muestra del botón (`#5B3A29`). |
| `precio_con_iva*` | En euros (`39,90`). |
| `iva*` | Desplegable: General / Reducido / Superreducido. |
| `stock*` | Unidades en el almacén por defecto. |
| `cantidad_neta` | `1 kg`, `300 g`… (se ve en la ficha). |
| `fotos`, `activa`, `novedad` | Como en productos. |

**Hoja «Categorías»:** `slug*`, `nombre*`, `nombre_en`, `descripcion`, `categoria_padre` (slug), `imagen`, `orden`, `privada`. Cada categoría se crea con el filtro «productos elegidos a mano»; sus productos son los que la nombran en la columna `categorias` de «Productos».

**Hoja «Listas»** (oculta): los valores de los desplegables.

## Flujo en el panel

Nueva entrada **Catálogo → Importar desde Excel** (permisos `CreateCatalog` y `UpdateCatalog`):

1. **Descargar plantilla.**
2. **Subir** el Excel y, opcionalmente, el ZIP de fotos.
3. **Revisión:** el servidor valida sin escribir nada y devuelve un resumen («3 productos nuevos, 2 actualizados, 12 variantes, 4 categorías nuevas, 18 fotos») y la lista de errores (hoja · fila · columna · mensaje) y avisos (p. ej. «la variante X no tiene foto»). Con errores, el botón de importar queda desactivado.
4. **Importar:** repite la validación y escribe todo en una transacción. Al terminar muestra el resultado con enlaces a los productos.

## Arquitectura

Plugin nuevo `apps/server/src/plugins/catalog-import/`, independiente del resto:

- `template.service.ts`: genera la plantilla (`exceljs`) con los desplegables a partir de los datos reales.
- `workbook-parser.ts`: Excel → filas tipadas. Funciones puras, sin acceso a la base de datos; se prueban con `node --test`.
- `catalog-validator.ts`: reglas de validación (obligatorios, formatos, SKU y slugs repetidos, referencias a categorías, productos y fotos existentes). Puras, con tests.
- `catalog-import.service.ts`: resuelve qué se crea y qué se actualiza (consultando la base de datos), prepara las fotos (ZIP/URL, deduplicadas por hash) y escribe con los servicios de Vendure en una transacción. Lanza la reindexación del buscador al terminar.
- `catalog-import.controller.ts`: `GET /catalog-import/template` (descarga) y `POST /catalog-import/preview` y `POST /catalog-import/run` (multipart: excel + zip), con la misma autenticación de administrador que los controladores existentes (facturas, herramientas de pedidos).
- `dashboard/`: la página de importación (React, mismo estilo que banners y atletas) y sus textos en español e inglés.

## Errores y seguridad

- Solo administradores con permisos de catálogo.
- Límites de tamaño (Excel 10 MB, ZIP 200 MB) y de filas; el ZIP solo admite imágenes (jpg, png, webp, avif) y se rechazan rutas con `..`.
- URL de fotos: solo `https`, con tiempo máximo y tamaño máximo por imagen.
- Un fallo durante la escritura deshace toda la transacción; las fotos ya copiadas al disco se eliminan.

## Pruebas

- Tests unitarios del parser y del validador con libros generados en el propio test.
- Prueba de integración en local: plantilla → rellenar el catálogo base → previsualizar → importar → reimportar (sin duplicados) → comprobar ficha, precio con IVA, stock, fotos, categorías y objetivos en la tienda.
- Después, en develop: `limpiar-develop.sh` y la importación del catálogo base.

## Catálogo base (primer Excel)

Lo preparo con los datos actuales de develop: ISO SAVAGE completo (4 sabores × 1 kg, información alimentaria tal cual) y los otros cuatro productos con los mismos campos. Lo que hoy no existe en develop (información alimentaria de IRON MAPS, GLUTA SAVAGE, IRON CREATINE y WHEY SAVAGE) se deja **vacío** para que lo complete el cliente; no se inventa. Las fotos actuales de develop se descargan antes de la limpieza y van en el ZIP.

## Fuera de alcance

Exportar el catálogo a Excel, borrar productos desde el Excel, varios canales o monedas, promociones y programar importaciones.
