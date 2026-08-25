import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LegalPageShell, Placeholder} from '@/site/legal/legal-page';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    const url = buildCanonicalUrl(localizedPath(locale, '/envios-y-devoluciones'));
    return {
        title: `${t('shippingReturns')} | ${SITE_NAME}`,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/envios-y-devoluciones'))])),
        },
    };
}

export default async function ShippingReturnsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('shippingReturns')}>
            <section>
                <h2>1. Envíos</h2>
                <p>
                    Los plazos y costes de envío se calculan y muestran durante el checkout según el método de envío
                    elegido y la dirección de entrega. Los plazos estimados de entrega son{' '}
                    <Placeholder>[PLAZOS DE ENTREGA A CONFIRMAR]</Placeholder> desde la confirmación del pedido, salvo
                    incidencias del transportista.
                </p>
            </section>

            <section>
                <h2>2. Seguimiento del pedido</h2>
                <p>
                    Puedes consultar el estado de tus pedidos en cualquier momento desde{' '}
                    <a href="/mi-cuenta/pedidos">Mi cuenta &gt; Pedidos</a>.
                </p>
            </section>

            <section>
                <h2>3. Derecho de desistimiento y devoluciones</h2>
                <p>
                    Dispones de 14 días naturales desde la recepción del pedido para desistir de la compra sin
                    necesidad de justificar tu decisión, conforme al Real Decreto Legislativo 1/2007. Para iniciar una
                    devolución, contacta con nosotros en{' '}
                    <Placeholder>[EMAIL DE ATENCIÓN AL CLIENTE]</Placeholder>.
                </p>
                <p>
                    El producto debe devolverse en su estado original, sin abrir cuando la naturaleza del producto
                    (suplementos alimenticios) lo requiera por motivos de higiene y seguridad alimentaria — consulta{' '}
                    <Placeholder>[EXCEPCIONES AL DESISTIMIENTO A CONFIRMAR PARA PRODUCTOS SELLADOS/PERECEDEROS]</Placeholder>.
                </p>
            </section>

            <section>
                <h2>4. Costes de la devolución</h2>
                <p>
                    <Placeholder>[POLÍTICA DE QUIÉN ASUME EL COSTE DE DEVOLUCIÓN A CONFIRMAR]</Placeholder>.
                </p>
            </section>

            <section>
                <h2>5. Reembolsos</h2>
                <p>
                    Una vez recibido y verificado el producto devuelto, tramitaremos el reembolso utilizando el mismo
                    medio de pago empleado en la compra, en un plazo máximo de 14 días naturales desde que ejerzas tu
                    derecho de desistimiento.
                </p>
            </section>

            <section>
                <h2>6. Productos defectuosos</h2>
                <p>
                    Si recibes un producto defectuoso o distinto al pedido, contáctanos en{' '}
                    <Placeholder>[EMAIL DE ATENCIÓN AL CLIENTE]</Placeholder> y gestionaremos la sustitución o
                    reembolso sin coste para ti.
                </p>
            </section>
        </LegalPageShell>
    );
}
