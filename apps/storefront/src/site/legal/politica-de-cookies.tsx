import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LegalPageShell, Placeholder} from '@/site/legal/legal-page';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    const url = buildCanonicalUrl(localizedPath(locale, '/politica-de-cookies'));
    return {
        title: `${t('cookiePolicy')} | ${SITE_NAME}`,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/politica-de-cookies'))])),
        },
    };
}

export default async function CookiePolicyPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('cookiePolicy')}>
            <section>
                <h2>1. ¿Qué son las cookies?</h2>
                <p>
                    Las cookies son pequeños archivos que se almacenan en tu dispositivo al visitar un sitio web.
                    Sirven, entre otras cosas, para recordar tus preferencias, mantener tu sesión iniciada o analizar
                    cómo se usa el sitio.
                </p>
            </section>

            <section>
                <h2>2. Cookies que utilizamos</h2>
                <p>Clasificamos las cookies del Sitio Web en tres categorías, gestionables desde el panel de preferencias:</p>
                <ul>
                    <li>
                        <strong>Necesarias:</strong> imprescindibles para el funcionamiento del sitio (carrito de la
                        compra, inicio de sesión, checkout, selección de idioma/moneda y tu propia preferencia de
                        cookies). No requieren consentimiento y no se pueden desactivar.
                    </li>
                    <li>
                        <strong>Analíticas:</strong> nos ayudarían a entender cómo se usa el sitio para mejorarlo. Se
                        cargan únicamente si las aceptas.
                    </li>
                    <li>
                        <strong>Marketing:</strong> se usarían para medir y personalizar publicidad. Se cargan
                        únicamente si las aceptas.
                    </li>
                </ul>
                <p>
                    <Placeholder>
                        [A completar: en la fecha de esta plantilla no hay cookies de analítica ni de marketing
                        activas en el sitio; si en el futuro se integra Google Analytics, Meta Pixel u otra
                        herramienta similar, deberá documentarse aquí con su nombre, finalidad y duración exactos.]
                    </Placeholder>
                </p>
            </section>

            <section>
                <h2>3. Cómo gestionar tus preferencias</h2>
                <p>
                    Puedes aceptar, rechazar o personalizar las cookies no necesarias en cualquier momento desde el
                    enlace &quot;Configurar cookies&quot; en el pie de página de {SITE_NAME}. También puedes eliminar
                    o bloquear las cookies desde la configuración de tu navegador.
                </p>
            </section>
        </LegalPageShell>
    );
}
