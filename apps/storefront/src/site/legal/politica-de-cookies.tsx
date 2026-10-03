import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {Link} from '@/platform/i18n/navigation';
import {LegalPageShell, LegalTable, legalPageMetadata} from '@/site/legal/legal-page';
import {GA_MEASUREMENT_ID} from '@/platform/analytics/gtag';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/politica-de-cookies', 'cookiePolicy');
}

/**
 * La tabla recoge lo que la tienda guarda de verdad hoy; mantenla al día con el
 * código cuando se añada o renombre una cookie o clave de localStorage:
 *   vendure-auth-token  platform/vendure/auth-token.ts
 *   vendure-currency    features/currency/currency.ts
 *   NEXT_LOCALE         next-intl (selector de idioma)
 *   theme               next-themes (site/providers/theme-provider.tsx)
 *   iron-savage-cookie-consent  site/cookie-consent/consent-context.tsx
 *   _ga, _ga_<id>       Google Analytics, solo con NEXT_PUBLIC_GA_ID + consentimiento (site/analytics)
 */
export default async function CookiePolicyPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('cookiePolicy')}>
            <section>
                <h2>1. Qué son las cookies</h2>
                <p>
                    Las cookies y tecnologías similares (como el almacenamiento local del navegador) guardan pequeños
                    datos en tu dispositivo al visitar un sitio web. Sirven, entre otras cosas, para mantener tu sesión
                    iniciada, recordar tu carrito y tus preferencias o analizar cómo se usa el sitio. Esta política
                    cumple el artículo 22.2 de la LSSI-CE. El responsable es <Company field="legalName" />.
                </p>
            </section>

            <section>
                <h2>2. Cookies que utilizamos</h2>
                {GA_MEASUREMENT_ID ? (
                    <p>
                        {SITE_NAME} utiliza cookies y almacenamiento <strong>técnicos</strong>, propios y necesarios para
                        prestar el servicio que solicitas, que están exentos de consentimiento, y cookies{' '}
                        <strong>analíticas</strong> de Google Analytics, que <strong>solo se instalan si las
                        aceptas</strong>. No usamos cookies publicitarias.
                    </p>
                ) : (
                    <p>
                        Actualmente {SITE_NAME} solo utiliza cookies y almacenamiento <strong>técnicos</strong>, propios
                        y necesarios para prestar el servicio que solicitas. Están exentos de consentimiento y no se usan
                        para analizarte ni para mostrarte publicidad.
                    </p>
                )}
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Finalidad</th>
                            <th>Duración</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>vendure-auth-token</td>
                            <td>Cookie propia, técnica</td>
                            <td>Mantener tu sesión iniciada y tu carrito.</td>
                            <td>1 año, o hasta cerrar sesión</td>
                        </tr>
                        <tr>
                            <td>vendure-currency</td>
                            <td>Cookie propia, técnica</td>
                            <td>Recordar la moneda que has elegido.</td>
                            <td>1 año</td>
                        </tr>
                        <tr>
                            <td>NEXT_LOCALE</td>
                            <td>Cookie propia, técnica</td>
                            <td>Recordar el idioma que has elegido.</td>
                            <td>Sesión</td>
                        </tr>
                        <tr>
                            <td>theme</td>
                            <td>Almacenamiento local propio, técnico</td>
                            <td>Recordar si prefieres el tema claro u oscuro.</td>
                            <td>Hasta que lo borres</td>
                        </tr>
                        <tr>
                            <td>iron-savage-cookie-consent</td>
                            <td>Almacenamiento local propio, técnico</td>
                            <td>Recordar tus preferencias de cookies.</td>
                            <td>Hasta que lo borres</td>
                        </tr>
                        {GA_MEASUREMENT_ID && (
                            <>
                                <tr>
                                    <td>_ga</td>
                                    <td>Cookie analítica de Google Analytics (requiere consentimiento)</td>
                                    <td>Distinguir visitantes de forma anónima para obtener estadísticas de uso.</td>
                                    <td>2 años</td>
                                </tr>
                                <tr>
                                    <td>_ga_{GA_MEASUREMENT_ID.replace(/^G-/, '')}</td>
                                    <td>Cookie analítica de Google Analytics (requiere consentimiento)</td>
                                    <td>Mantener el estado de la visita (sesión) para las estadísticas.</td>
                                    <td>2 años</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </LegalTable>
                <p>
                    Al pagar con tarjeta se te redirige a la pasarela de Redsys, que puede usar sus propias cookies
                    técnicas en su dominio para procesar el pago de forma segura. Se rigen por la política de Redsys.
                </p>
                {GA_MEASUREMENT_ID ? (
                    <>
                        <h3>Google Analytics</h3>
                        <p>
                            Si aceptas las cookies analíticas, usamos Google Analytics 4, un servicio de Google Ireland
                            Limited (Gordon House, Barrow Street, Dublín 4, Irlanda), para saber cuántas personas visitan la
                            tienda, qué páginas ven y cómo llegan hasta la compra. Solo recibimos estadísticas agregadas,
                            nunca tu nombre ni tu email. Google Analytics 4 no registra ni almacena tu dirección IP.
                            Tenemos desactivadas las funciones publicitarias (Consent Mode: publicidad
                            &quot;denegada&quot;).
                        </p>
                        <p>
                            Google puede tratar datos en Estados Unidos. Esa transferencia se ampara en el Marco de
                            Privacidad de Datos UE-EE. UU., al que está adherida Google LLC. Más información en la
                            política de privacidad de Google (policies.google.com/privacy). Si retiras tu consentimiento,
                            Google Analytics se desactiva y borramos sus cookies de tu navegador.
                        </p>
                        <p>
                            La categoría &quot;marketing&quot; del panel de preferencias no carga hoy ninguna cookie.
                        </p>
                    </>
                ) : (
                    <p>
                        El panel de preferencias ya contempla las categorías &quot;analíticas&quot; y
                        &quot;marketing&quot;, que están desactivadas por defecto y solo se activarían con tu
                        consentimiento. Hoy no cargan ninguna cookie.
                    </p>
                )}
            </section>

            <section>
                <h2>3. Cómo gestionar tus preferencias</h2>
                <p>
                    Puedes aceptar, rechazar o configurar las cookies no necesarias en cualquier momento desde el enlace
                    &quot;Configurar cookies&quot; del pie de página. Retirar el consentimiento es tan fácil como darlo.
                    También puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las
                    técnicas, no podrás iniciar sesión ni comprar.
                </p>
                <p>
                    Más información sobre el tratamiento de tus datos en la{' '}
                    <Link href="/politica-de-privacidad">Política de privacidad</Link>.
                </p>
            </section>
        </LegalPageShell>
    );
}
