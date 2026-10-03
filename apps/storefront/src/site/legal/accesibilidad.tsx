import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {LegalPageShell, legalPageMetadata, Placeholder} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/accesibilidad', 'accessibility');
}

/**
 * Declaración de accesibilidad — the information the Ley 11/2023 (European
 * Accessibility Act) requires e-commerce services to give about how they
 * meet the accessibility requirements, plus a channel to report barriers.
 * Keep "Cómo lo hemos evaluado" in sync with the last audit that was run.
 */
export default async function AccessibilityPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('accessibility')}>
            <section>
                <h2>1. Nuestro compromiso</h2>
                <p>
                    Queremos que cualquier persona pueda informarse y comprar en {SITE_NAME}, también quienes usan
                    lector de pantalla, navegan solo con el teclado, amplían el texto o necesitan más contraste. Esta
                    declaración se ajusta a la Ley 11/2023, que transpone la Directiva (UE) 2019/882 sobre los requisitos
                    de accesibilidad de los productos y servicios (Acta Europea de Accesibilidad).
                </p>
            </section>

            <section>
                <h2>2. Nivel de cumplimiento</h2>
                <p>
                    Nuestro objetivo es el nivel AA de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1,
                    recogidas en la norma europea EN 301 549. El sitio web es <strong>parcialmente conforme</strong>: las
                    páginas principales superan la evaluación automática, pero aún no se ha completado una revisión
                    manual completa con tecnologías de apoyo.
                </p>
            </section>

            <section>
                <h2>3. Qué hemos hecho</h2>
                <ul>
                    <li>Contraste suficiente de textos y botones en los temas claro y oscuro.</li>
                    <li>Navegación completa con el teclado, foco siempre visible y un enlace &quot;Saltar al contenido
                        principal&quot; al comienzo de cada página.</li>
                    <li>Estructura semántica: idioma de la página declarado, encabezados ordenados, regiones (cabecera,
                        navegación, contenido, pie) identificadas y un título distinto en cada página.</li>
                    <li>Formularios con etiquetas asociadas a cada campo y mensajes de error vinculados al campo que los
                        provoca.</li>
                    <li>Textos alternativos en las imágenes de producto y nombres accesibles en los botones que solo
                        muestran un icono (buscar, carrito, menú, idioma, tema).</li>
                    <li>Las valoraciones con estrellas se anuncian como texto (por ejemplo, &quot;4 de 5
                        estrellas&quot;).</li>
                    <li>Si tu sistema pide reducir el movimiento, el sitio desactiva animaciones y transiciones.</li>
                    <li>El texto se puede ampliar hasta el 200 % sin perder contenido, y el diseño se adapta a móviles.</li>
                    <li>Los textos legales se pueden imprimir o guardar en PDF.</li>
                </ul>
            </section>

            <section>
                <h2>4. Limitaciones conocidas</h2>
                <ul>
                    <li>El pago con tarjeta se completa en la pasarela de Redsys, que no gestionamos nosotros. Su
                        accesibilidad depende de Redsys y de tu entidad bancaria.</li>
                    <li>Algunas imágenes de producto facilitadas por los fabricantes pueden contener texto (por ejemplo,
                        la etiqueta del envase). Esa información está disponible también como texto en la ficha del
                        producto.</li>
                    <li>
                        <Placeholder>
                            [AÑADIR AQUÍ LAS BARRERAS QUE DETECTE LA REVISIÓN MANUAL, CON SU ALTERNATIVA Y LA FECHA
                            PREVISTA DE SOLUCIÓN]
                        </Placeholder>
                    </li>
                </ul>
            </section>

            <section>
                <h2>5. Cómo lo hemos evaluado</h2>
                <p>
                    Evaluación automática con axe-core (reglas WCAG 2.0, 2.1 y 2.2, niveles A y AA) de la portada, el
                    catálogo, la ficha de producto, el carrito, el proceso de compra, el registro, el inicio de sesión y
                    las páginas legales, en los temas claro y oscuro, realizada el 28 de septiembre de 2026.
                </p>
            </section>

            <section>
                <h2>6. Comunícanos cualquier barrera</h2>
                <p>
                    Si encuentras algún contenido que no puedes usar, escríbenos a <Company field="contactEmail" /> o
                    llámanos al <Company field="phone" />. Indica la página y el problema. Te facilitaremos la información
                    o el producto por otra vía accesible y te responderemos en un plazo máximo de un mes. También puedes
                    tramitar el pedido con nuestra ayuda por esos mismos medios.
                </p>
                <p>
                    Si no quedas satisfecho con nuestra respuesta, puedes presentar una reclamación ante los servicios de
                    consumo de tu comunidad autónoma, o ante la autoridad de vigilancia del mercado que corresponda según
                    la Ley 11/2023.
                </p>
            </section>
        </LegalPageShell>
    );
}
