import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {Link} from '@/platform/i18n/navigation';
import {LegalPageShell, legalPageMetadata} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/aviso-legal', 'legalNotice');
}

export default async function LegalNoticePage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('legalNotice')}>
            <section>
                <h2>1. Datos identificativos del titular</h2>
                <p>
                    En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
                    Información y de Comercio Electrónico (LSSI-CE), se informa de que este sitio web ({SITE_NAME}) es
                    titularidad de:
                </p>
                <ul>
                    <li>Titular: <Company field="legalName" /></li>
                    <li>NIF/CIF: <Company field="taxId" /></li>
                    <li>Domicilio: <Company field="address" /></li>
                    <li>Datos registrales: <Company field="registry" /></li>
                    <li>Correo electrónico: <Company field="contactEmail" /></li>
                    <li>Teléfono: <Company field="phone" /></li>
                    <li>Registro sanitario: <Company field="healthRegistry" /></li>
                </ul>
            </section>

            <section>
                <h2>2. Objeto y condiciones de uso</h2>
                <p>
                    Este aviso legal regula el acceso y uso del sitio web {SITE_NAME} (el &quot;Sitio Web&quot;), dedicado
                    a la información y venta online de suplementación deportiva. Acceder al Sitio Web o usarlo te
                    atribuye la condición de usuario e implica que aceptas este aviso legal. La compra de productos se
                    rige además por los <Link href="/terminos-y-condiciones">Términos y condiciones</Link>, y el
                    tratamiento de tus datos por la <Link href="/politica-de-privacidad">Política de privacidad</Link> y
                    la <Link href="/politica-de-cookies">Política de cookies</Link>.
                </p>
                <p>Como usuario te comprometes a:</p>
                <ul>
                    <li>Usar el Sitio Web conforme a la ley, la buena fe, el orden público y este aviso legal.</li>
                    <li>No introducir virus ni código dañino, ni intentar acceder a áreas restringidas, a cuentas de
                        otros usuarios o a los sistemas del titular.</li>
                    <li>No usar el Sitio Web para fines fraudulentos, ni publicar contenidos (por ejemplo, opiniones) que
                        sean falsos, ofensivos, discriminatorios, que vulneren derechos de terceros o que tengan carácter
                        publicitario.</li>
                </ul>
            </section>

            <section>
                <h2>3. Propiedad intelectual e industrial</h2>
                <p>
                    Los contenidos del Sitio Web (textos, fotografías, gráficos, logotipos, iconos, diseño, software,
                    marcas y nombres comerciales) pertenecen al titular o a terceros que han autorizado su uso, y están
                    protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción,
                    distribución, comunicación pública o transformación sin autorización expresa, salvo para el uso
                    personal y privado necesario para navegar y comprar. Las marcas de los productos de terceros que se
                    comercializan pertenecen a sus respectivos titulares.
                </p>
            </section>

            <section>
                <h2>4. Enlaces</h2>
                <p>
                    El Sitio Web puede contener enlaces a sitios de terceros (por ejemplo, la pasarela de pago o el
                    seguimiento del transportista). El titular no controla esos sitios ni responde de sus contenidos,
                    aunque retirará cualquier enlace en cuanto tenga conocimiento efectivo de que remite a contenidos
                    ilícitos.
                </p>
            </section>

            <section>
                <h2>5. Responsabilidad</h2>
                <p>
                    El titular procura que la información del Sitio Web sea exacta y esté actualizada, y que el servicio
                    funcione sin interrupciones, pero no puede garantizarlo en todo momento. No responde de los daños
                    causados por interrupciones, virus o fallos técnicos ajenos a su control, ni del uso del Sitio Web
                    contrario a este aviso legal. Nada de lo anterior limita los derechos que la ley reconoce a los
                    consumidores.
                </p>
                <p>
                    La información sobre productos y los contenidos divulgativos (por ejemplo, las noticias) tienen
                    carácter informativo y no sustituyen el consejo de un médico, dietista-nutricionista u otro
                    profesional sanitario.
                </p>
            </section>

            <section>
                <h2>6. Uso de inteligencia artificial</h2>
                <p>
                    En el desarrollo de este Sitio Web se han utilizado herramientas de inteligencia artificial. Puedes
                    consultar cómo y para qué en{' '}
                    <Link href="/uso-de-inteligencia-artificial">Uso de inteligencia artificial</Link>.
                </p>
            </section>

            <section>
                <h2>7. Legislación aplicable y jurisdicción</h2>
                <p>
                    Este aviso legal se rige por la legislación española. Si eres consumidor, las controversias se
                    resolverán en los juzgados y tribunales de tu domicilio. En los demás casos, en los juzgados y
                    tribunales del domicilio del titular.
                </p>
            </section>
        </LegalPageShell>
    );
}
