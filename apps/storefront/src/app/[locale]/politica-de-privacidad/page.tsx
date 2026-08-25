import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LegalPageShell, Placeholder} from '@/site/legal/legal-page';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    const url = buildCanonicalUrl(localizedPath(locale, '/politica-de-privacidad'));
    return {
        title: `${t('privacyPolicy')} | ${SITE_NAME}`,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/politica-de-privacidad'))])),
        },
    };
}

export default async function PrivacyPolicyPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('privacyPolicy')}>
            <section>
                <h2>1. Responsable del tratamiento</h2>
                <p>
                    El responsable del tratamiento de los datos personales recabados a través de este sitio web es{' '}
                    <Placeholder>[RAZÓN SOCIAL DE LA EMPRESA]</Placeholder>, con NIF/CIF{' '}
                    <Placeholder>[NIF/CIF]</Placeholder>, domicilio en <Placeholder>[DIRECCIÓN SOCIAL]</Placeholder> y
                    correo electrónico de contacto para asuntos de protección de datos{' '}
                    <Placeholder>[EMAIL DE PROTECCIÓN DE DATOS]</Placeholder>.
                </p>
            </section>

            <section>
                <h2>2. Datos que tratamos y finalidad</h2>
                <p>Tratamos, entre otros, los siguientes datos según el uso que hagas del Sitio Web:</p>
                <ul>
                    <li>Datos de identificación y contacto (nombre, email, teléfono, dirección) al registrarte, comprar o contactarnos.</li>
                    <li>Datos de pedidos y facturación necesarios para gestionar tus compras y emitir facturas.</li>
                    <li>Datos de navegación y cookies, conforme a nuestra <a href="/politica-de-cookies">Política de Cookies</a>.</li>
                </ul>
                <p>
                    La finalidad es gestionar tu cuenta, tramitar pedidos y pagos, emitir facturas, gestionar el
                    programa de puntos/fidelización, atender consultas y, cuando lo consientas, enviarte
                    comunicaciones comerciales.
                </p>
            </section>

            <section>
                <h2>3. Base legal</h2>
                <p>
                    La base legal para el tratamiento es la ejecución de un contrato (compra, cuenta de usuario), el
                    cumplimiento de obligaciones legales (facturación fiscal) y, para comunicaciones comerciales o
                    cookies no necesarias, tu consentimiento explícito.
                </p>
            </section>

            <section>
                <h2>4. Conservación de los datos</h2>
                <p>
                    Los datos se conservarán durante el tiempo necesario para cumplir la finalidad para la que se
                    recabaron y, en su caso, durante los plazos de prescripción legal aplicables (
                    <Placeholder>[PLAZOS DE CONSERVACIÓN A CONFIRMAR]</Placeholder>).
                </p>
            </section>

            <section>
                <h2>5. Destinatarios</h2>
                <p>
                    Tus datos podrán comunicarse a proveedores necesarios para prestar el servicio (pasarela de pago,
                    transporte, hosting) con las garantías exigidas por el RGPD. No se ceden datos a terceros para
                    fines distintos salvo obligación legal.
                </p>
            </section>

            <section>
                <h2>6. Tus derechos</h2>
                <p>
                    Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
                    portabilidad escribiendo a <Placeholder>[EMAIL DE PROTECCIÓN DE DATOS]</Placeholder>, así como
                    presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
                </p>
            </section>
        </LegalPageShell>
    );
}
