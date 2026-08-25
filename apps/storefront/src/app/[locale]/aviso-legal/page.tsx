import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LegalPageShell, Placeholder} from '@/site/legal/legal-page';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    const url = buildCanonicalUrl(localizedPath(locale, '/aviso-legal'));
    return {
        title: `${t('legalNotice')} | ${SITE_NAME}`,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/aviso-legal'))])),
        },
    };
}

export default async function LegalNoticePage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('legalNotice')}>
            <section>
                <h2>1. Datos identificativos del titular</h2>
                <p>
                    En cumplimiento del deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de
                    julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se
                    facilitan a continuación los siguientes datos: el presente sitio web es titularidad de{' '}
                    <Placeholder>[RAZÓN SOCIAL DE LA EMPRESA]</Placeholder>, con NIF/CIF{' '}
                    <Placeholder>[NIF/CIF]</Placeholder>, domicilio social en{' '}
                    <Placeholder>[DIRECCIÓN SOCIAL COMPLETA]</Placeholder>, inscrita en{' '}
                    <Placeholder>[DATOS REGISTRALES — Registro Mercantil, tomo, folio, hoja]</Placeholder>, y con
                    dirección de correo electrónico de contacto <Placeholder>[EMAIL LEGAL DE CONTACTO]</Placeholder>.
                </p>
            </section>

            <section>
                <h2>2. Objeto</h2>
                <p>
                    El presente aviso legal regula el uso del sitio web {SITE_NAME} (en adelante, el &quot;Sitio
                    Web&quot;), que {SITE_NAME} pone a disposición de los usuarios para dar a conocer sus productos
                    de suplementación deportiva y permitir su adquisición online.
                </p>
            </section>

            <section>
                <h2>3. Condiciones de uso</h2>
                <p>
                    El acceso y/o uso de este Sitio Web atribuye la condición de usuario, que acepta, desde dicho
                    acceso y/o uso, las condiciones generales de uso aquí reflejadas. Las citadas condiciones serán
                    de aplicación independientemente de las condiciones generales de contratación que en su caso
                    resulten de obligado cumplimiento — ver{' '}
                    <a href="/terminos-y-condiciones">Términos y Condiciones</a>.
                </p>
            </section>

            <section>
                <h2>4. Propiedad intelectual e industrial</h2>
                <p>
                    Todos los contenidos del Sitio Web, incluyendo a título enunciativo textos, fotografías, gráficos,
                    imágenes, iconos, tecnología, software, marcas, nombres comerciales y demás signos distintivos
                    son propiedad de {SITE_NAME} o de terceros que han autorizado su uso, y están protegidos por los
                    correspondientes derechos de propiedad intelectual e industrial.
                </p>
            </section>

            <section>
                <h2>5. Responsabilidad</h2>
                <p>
                    {SITE_NAME} no se hace responsable de los daños y perjuicios que pudieran derivarse de
                    interferencias, interrupciones, virus informáticos, averías telefónicas o desconexiones en el
                    funcionamiento operativo de este sistema electrónico, motivadas por causas ajenas a {SITE_NAME}.
                </p>
            </section>

            <section>
                <h2>6. Legislación aplicable y jurisdicción</h2>
                <p>
                    Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier
                    controversia, las partes se someten a los juzgados y tribunales de{' '}
                    <Placeholder>[JURISDICCIÓN COMPETENTE A CONFIRMAR]</Placeholder>, sin perjuicio de los fueros
                    legalmente establecidos para consumidores.
                </p>
            </section>
        </LegalPageShell>
    );
}
