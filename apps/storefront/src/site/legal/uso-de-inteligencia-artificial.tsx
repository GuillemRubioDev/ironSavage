import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {LegalPageShell, legalPageMetadata, Placeholder} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/uso-de-inteligencia-artificial', 'aiTransparency');
}

/**
 * Transparency notice about the use of AI (in the spirit of art. 50 of the EU
 * AI Act, Regulation (EU) 2024/1689). Linked from the footer on every page.
 */
export default async function AiTransparencyPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('aiTransparency')}>
            <section>
                <h2>1. Cómo hemos usado la inteligencia artificial</h2>
                <p>
                    Para el diseño y la programación de {SITE_NAME} se han utilizado herramientas de inteligencia
                    artificial generativa como asistentes. Todo lo que producen lo revisan, adaptan y validan personas
                    antes de publicarlo.
                </p>
                <p>
                    Contenidos de la tienda (textos, imágenes o traducciones) creados o editados con ayuda de IA:{' '}
                    <Placeholder>
                        [INDICAR QUÉ CONTENIDOS SE HAN GENERADO CON IA —p. ej. descripciones, noticias, imágenes— O QUE
                        NINGUNO]
                    </Placeholder>
                    . Si una imagen generada con IA pudiera confundirse con una fotografía real, la identificaremos como
                    tal junto a la propia imagen.
                </p>
            </section>

            <section>
                <h2>2. Lo que no hace la inteligencia artificial</h2>
                <ul>
                    <li>No hay ningún chatbot ni asistente automático: cuando nos escribes, te responde una persona.</li>
                    <li>No se usa para tomar decisiones sobre ti: precios, pedidos, cuentas, puntos o devoluciones se
                        rigen por reglas fijas y por la revisión de nuestro equipo.</li>
                    <li>No se usa para elaborar perfiles con tus datos personales.</li>
                    <li>La información alimentaria de los productos (ingredientes, alérgenos, dosis y advertencias)
                        procede del etiquetado del fabricante y no la genera ninguna IA.</li>
                </ul>
            </section>

            <section>
                <h2>3. Responsabilidad</h2>
                <p>
                    <Company field="legalName" /> es responsable de todos los contenidos del sitio, se hayan elaborado o
                    no con ayuda de IA. Si detectas un error, escríbenos a <Company field="contactEmail" /> y lo
                    corregiremos.
                </p>
            </section>
        </LegalPageShell>
    );
}
