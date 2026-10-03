# Textos legales, aceptación de condiciones, accesibilidad, aviso de IA y versión

## Páginas

| Página | Ruta | Archivo |
|---|---|---|
| Aviso legal (LSSI-CE art. 10) | `/aviso-legal` | `apps/storefront/src/site/legal/aviso-legal.tsx` |
| Términos y condiciones (uso de la cuenta + condiciones de compra, puntos, códigos de atleta, reseñas) | `/terminos-y-condiciones` | `terminos-y-condiciones.tsx` |
| Política de privacidad (RGPD/LOPDGDD) | `/politica-de-privacidad` | `politica-de-privacidad.tsx` |
| Política de cookies | `/politica-de-cookies` | `politica-de-cookies.tsx` |
| Envíos y devoluciones (con formulario de desistimiento) | `/envios-y-devoluciones` | `envios-y-devoluciones.tsx` |
| Uso de inteligencia artificial | `/uso-de-inteligencia-artificial` | `uso-de-inteligencia-artificial.tsx` |
| Declaración de accesibilidad (Ley 11/2023) | `/accesibilidad` | `accesibilidad.tsx` |

Todas tienen un botón «Imprimir o guardar en PDF». Al imprimir se ocultan la cabecera, el pie y el banner de cookies.
Los textos solo están en español. En inglés se muestra un aviso de que la versión válida es la española.

Se enlazan desde:

- el pie de página, en todas las páginas;
- la casilla obligatoria del **registro**, con enlaces a los términos y la privacidad y la información básica de
  protección de datos debajo;
- la casilla obligatoria del **checkout**, antes del botón «Pagar pedido».

## Antes de publicar: rellenar los datos de la empresa

Todos los datos de la empresa (razón social, NIF, domicilio, emails, transportistas, plazos…) están en **un único
archivo**: `apps/storefront/src/config/company.ts`. Mientras un valor sea `null`, se muestra resaltado entre corchetes
en todas las páginas donde aparece y en el aviso de privacidad del registro. Rellénalos con datos reales y
verificados.

Quedan también marcas que no son datos de la empresa y se editan en su propia página:

- `uso-de-inteligencia-artificial.tsx`: qué contenidos (textos, imágenes) se han generado con IA.
- `politica-de-cookies.tsx`: qué cookies de analítica o marketing se añadan en el futuro.
- `accesibilidad.tsx`: las barreras que detecte una revisión manual.

Cuando no quede ninguna marca, quita el aviso «Borrador — pendiente de revisión legal» de `legal-page.tsx`. Conviene
que un abogado revise los textos antes de hacerlo.

## Al cambiar un texto legal

Actualiza `LEGAL_VERSION` en `apps/storefront/src/config/legal.ts` (formato `AAAA-MM-DD`). Es la fecha de «Última
actualización» que ven los clientes arriba de cada página y la versión que se guarda en cada pedido (ver abajo).

Si añades una cookie o una clave de `localStorage` en el storefront, añádela a la tabla de `politica-de-cookies.tsx`.
El comentario del archivo indica dónde se define cada una.

## Prueba de aceptación en cada pedido

Cuando el cliente marca «He leído y acepto los términos y condiciones…» y pulsa «Pagar pedido», el pedido guarda:

| Campo (pedido) | Qué guarda |
|---|---|
| `termsAcceptedAt` — «Condiciones aceptadas el» | Fecha y hora de la aceptación, con el reloj **del servidor** |
| `termsVersion` — «Versión de las condiciones» | La `LEGAL_VERSION` vigente, p. ej. `2026-09-28` |

- Se ven en el dashboard, en la ficha del pedido (bloque de campos personalizados), en solo lectura.
- **Nadie puede modificarlos por la API**, ni desde la tienda ni un administrador. Solo los escribe la mutación
  `acceptTermsForActiveOrder` de la Shop API, que usa siempre el pedido activo de la sesión y la hora del servidor.
- **El servidor no deja pagar sin ellos:** un pedido de la tienda no puede pasar a «Gestionando el pago» si no tiene
  registrada la aceptación. Los pedidos creados por un administrador (borradores) no se ven afectados.
- Si el cliente reintenta el pago, se vuelve a registrar: el pedido refleja la aceptación inmediatamente anterior al
  pago real.
- Los pedidos anteriores a este cambio tienen los dos campos vacíos.

Código: `apps/server/src/plugins/legal-acceptance/` (plugin, tests) y la migración `AddOrderTermsAcceptance` (ver
[database-migrations.md](database-migrations.md)). En el storefront: `features/checkout/routes/actions.ts`.

## Accesibilidad (Ley 11/2023)

La Ley 11/2023 (Acta Europea de Accesibilidad) obliga a las tiendas online desde el 28 de junio de 2025. **Están
exentas las microempresas** que prestan servicios: menos de 10 personas empleadas y volumen de negocio o balance
anual de hasta 2 millones de euros. Aun así, conviene cumplir, y la declaración no hace daño.

Objetivo: WCAG 2.1 nivel AA (norma EN 301 549). Lo que ya se ha hecho está descrito en la propia declaración
(`/accesibilidad`): contrastes AA en los dos temas, enlace «Saltar al contenido principal», navegación por teclado
con foco visible, regiones y encabezados correctos, nombres accesibles en todos los botones de icono, `alt` en las
imágenes, estrellas anunciadas como texto, respeto de «reducir movimiento» y diseño sin desbordamiento a 320 px.

Para no romperlo:

- **Rojo de marca sobre fondo con texto blanco** (botones, insignias, contadores): usa `bg-primary-solid`, no
  `bg-primary`. En tema oscuro `--primary` está aclarado para leerse como texto sobre negro, y con texto blanco encima
  no llega al contraste mínimo.
- **Botones que solo tienen un icono:** ponles `aria-label` (traducido) y `aria-hidden="true"` al icono.
- **Imágenes:** `alt` descriptivo; `alt=""` solo si son decorativas o repiten un texto que ya está al lado.
- **Encabezados:** un único `<h1>` por página y sin saltar niveles. `AccordionTrigger` acepta `headingLevel`.

Cómo se auditó (28/09/2026): axe-core con reglas WCAG 2.0, 2.1 y 2.2 A/AA sobre portada, catálogo, ficha de producto,
carrito con producto, checkout (pasos de pago y revisión), registro, inicio de sesión, contraseña olvidada, noticias y
páginas legales, en temas claro y oscuro: **0 incidencias**. Queda pendiente una revisión manual con lector de
pantalla (NVDA o VoiceOver). Anota lo que salga en el apartado «Limitaciones conocidas» de la declaración.

## Google Analytics 4

Integrado y listo; **solo falta el ID de medición**. Sin él no se carga nada, ni en local ni en producción.

1. En Google Analytics, crea una propiedad GA4 y un flujo de datos web para el dominio de la tienda. Copia el ID de
   medición (`G-XXXXXXXXXX`).
2. En el `.env` de producción: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`. Se incrusta al compilar: **reconstruye la imagen del
   storefront** después de cambiarlo.
3. Recomendado en GA4 (Administrar → Recogida y conservación de datos): conservación de datos a 14 meses, y dejar
   desactivadas las «señales de Google» y la personalización de anuncios.

Cómo funciona:

- **Solo tras el consentimiento:** gtag.js no se carga hasta que el visitante acepta las cookies «analíticas». Si
  retira el consentimiento en «Configurar cookies», GA se desactiva y se borran sus cookies (`_ga`, `_ga_*`).
- **Consent Mode v2:** la analítica está concedida; la publicidad (`ad_storage`, `ad_user_data`,
  `ad_personalization`) siempre denegada.
- **Eventos de tienda:** `view_item` (ficha de producto), `add_to_cart`, `begin_checkout` (una vez por pedido) y
  `purchase` (en la confirmación, una vez por pedido, con `transaction_id` = código del pedido). Las visitas de
  página, incluida la navegación interna, las cuenta la «medición mejorada» de GA4, activa por defecto.
- **Textos legales:** con el ID configurado, la política de cookies añade `_ga` y `_ga_<id>`, y la de privacidad
  añade el tratamiento y a Google como destinatario (transferencia amparada en el Marco de Privacidad UE-EE. UU.). Sin
  ID, ambas siguen diciendo que no hay cookies analíticas.
- **CSP:** los dominios de Google se añaden a la política de seguridad solo si hay ID.

Código: `apps/storefront/src/platform/analytics/gtag.ts` (`trackEvent`) y `src/site/analytics/google-analytics.tsx`.

## Versión de la aplicación

El pie de página muestra «Versión X.Y.Z», tomada del campo `version` del `package.json` **raíz** del monorepo. Se
inyecta al compilar desde `apps/storefront/next.config.ts`. Para publicar una versión nueva, cambia ese campo; en
desarrollo hay que reiniciar `npm run dev` para verla.
