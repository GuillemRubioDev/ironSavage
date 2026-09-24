import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LegalPageShell, Placeholder} from '@/site/legal/legal-page';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    const url = buildCanonicalUrl(localizedPath(locale, '/terminos-y-condiciones'));
    return {
        title: `${t('termsAndConditions')} | ${SITE_NAME}`,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/terminos-y-condiciones'))])),
        },
    };
}

export default async function TermsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('termsAndConditions')}>
            <section>
                <h2>1. Objeto y aceptación</h2>
                <p>
                    Las presentes condiciones generales regulan la compra de productos a través de {SITE_NAME},
                    operado por <Placeholder>[RAZÓN SOCIAL DE LA EMPRESA]</Placeholder>. La realización de un pedido
                    implica la aceptación plena de estas condiciones.
                </p>
            </section>

            <section>
                <h2>2. Productos y precios</h2>
                <p>
                    Los precios mostrados incluyen impuestos aplicables salvo que se indique lo contrario. Nos
                    reservamos el derecho a modificar precios y disponibilidad de productos sin previo aviso, sin
                    afectar a pedidos ya confirmados.
                </p>
            </section>

            <section>
                <h2>3. Proceso de compra y pago</h2>
                <p>
                    El pago se realiza a través de los métodos habilitados en el checkout. Los pagos con tarjeta se
                    procesan mediante pasarela de pago segura (Redsys). El contrato se entiende perfeccionado en el
                    momento de la confirmación del pedido tras el pago.
                </p>
            </section>

            <section>
                <h2>4. Derecho de desistimiento</h2>
                <p>
                    De acuerdo con la normativa de consumidores, dispones de 14 días naturales desde la recepción del
                    pedido para desistir de la compra sin necesidad de justificación. Consulta las condiciones
                    completas en <a href="/envios-y-devoluciones">Envíos y Devoluciones</a>.
                </p>
            </section>

            <section>
                <h2>5. Programa de puntos / fidelización</h2>
                <p>
                    Si participas en el programa de puntos de {SITE_NAME}, su acumulación y canje se rige por las
                    condiciones específicas mostradas en tu cuenta, pudiendo {SITE_NAME} modificarlas razonablemente
                    con carácter general.
                </p>
            </section>

            <section>
                <h2>6. Garantías y reclamaciones</h2>
                <p>
                    Los productos cuentan con las garantías legalmente establecidas. Para cualquier incidencia, puedes
                    contactarnos en <Placeholder>[EMAIL DE ATENCIÓN AL CLIENTE]</Placeholder>. Como consumidor,
                    también puedes acceder a la plataforma europea de resolución de litigios en línea (ODR).
                </p>
            </section>

            <section>
                <h2>7. Legislación aplicable</h2>
                <p>
                    Estas condiciones se rigen por la legislación española, en particular el Real Decreto Legislativo
                    1/2007 (Texto Refundido de la Ley General para la Defensa de los Consumidores y Usuarios) y la Ley
                    34/2002 (LSSI-CE).
                </p>
            </section>
        </LegalPageShell>
    );
}
