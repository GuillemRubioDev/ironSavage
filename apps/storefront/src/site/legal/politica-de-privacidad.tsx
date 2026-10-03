import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {Link} from '@/platform/i18n/navigation';
import {LegalPageShell, LegalTable, legalPageMetadata} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';
import {GA_MEASUREMENT_ID} from '@/platform/analytics/gtag';

export function generateMetadata() {
    return legalPageMetadata('/politica-de-privacidad', 'privacyPolicy');
}

/**
 * Información completa (segunda capa) exigida por los arts. 13 y 14 del RGPD.
 * La primera capa (información básica, art. 11 LOPDGDD) se muestra bajo el
 * formulario de registro y enlaza aquí.
 */
export default async function PrivacyPolicyPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('privacyPolicy')}>
            <section>
                <h2>1. Responsable del tratamiento</h2>
                <ul>
                    <li>Responsable: <Company field="legalName" /></li>
                    <li>NIF/CIF: <Company field="taxId" /></li>
                    <li>Domicilio: <Company field="address" /></li>
                    <li>Contacto para protección de datos: <Company field="privacyEmail" /></li>
                    <li>Delegado de protección de datos: <Company field="dpo" /></li>
                </ul>
            </section>

            <section>
                <h2>2. Qué datos tratamos, para qué y con qué base legal</h2>
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Tratamiento y datos</th>
                            <th>Base legal (RGPD)</th>
                            <th>Conservación</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Cuenta de cliente</strong>: nombre, apellidos, email, teléfono, direcciones y
                                contraseña (guardada cifrada, nunca en claro). Sirve para registrarte, verificar tu email,
                                iniciar sesión y gestionar tu perfil.</td>
                            <td>Ejecución del contrato (art. 6.1.b).</td>
                            <td>Mientras la cuenta esté activa. Tras la baja, bloqueados durante los plazos legales de
                                prescripción.</td>
                        </tr>
                        <tr>
                            <td><strong>Pedidos</strong>, también como invitado: datos de contacto y entrega, productos,
                                importes, envío y estado del pago (nunca los datos de la tarjeta). Sirven para tramitar,
                                cobrar y entregar el pedido, enviarte los emails del pedido y atender devoluciones y
                                garantías.</td>
                            <td>Ejecución del contrato (art. 6.1.b).</td>
                            <td>Durante la relación y después, bloqueados, mientras puedan exigirse responsabilidades
                                (garantía legal de 3 años y plazos de prescripción).</td>
                        </tr>
                        <tr>
                            <td><strong>Facturación y contabilidad</strong>: datos fiscales y de las facturas.</td>
                            <td>Obligación legal (art. 6.1.c): normativa fiscal y mercantil.</td>
                            <td>6 años (art. 30 del Código de Comercio).</td>
                        </tr>
                        <tr>
                            <td><strong>Programa de puntos</strong>: saldo, movimientos y pedidos que los generan.</td>
                            <td>Ejecución del contrato (art. 6.1.b): condiciones del programa.</td>
                            <td>Mientras la cuenta esté activa.</td>
                        </tr>
                        <tr>
                            <td><strong>Atletas colaboradores</strong>: código promocional, pedidos realizados con él y
                                puntos generados.</td>
                            <td>Ejecución del contrato de colaboración (art. 6.1.b).</td>
                            <td>Mientras dure la colaboración y, después, los plazos de prescripción.</td>
                        </tr>
                        <tr>
                            <td><strong>Opiniones de productos</strong>: valoración, título y comentario, vinculados a tu
                                cuenta y pedido para comprobar la compra. Se publican sin tu nombre ni tus datos de
                                contacto.</td>
                            <td>Tu consentimiento al publicarla (art. 6.1.a).</td>
                            <td>Mientras esté publicada o hasta que pidas su retirada.</td>
                        </tr>
                        <tr>
                            <td><strong>Atención al cliente</strong>: los datos y mensajes que nos envíes.</td>
                            <td>Ejecución del contrato (art. 6.1.b) o, si no eres cliente, interés legítimo en responderte
                                (art. 6.1.f).</td>
                            <td>Hasta resolver tu consulta y, después, los plazos de prescripción.</td>
                        </tr>
                        <tr>
                            <td><strong>Seguridad y prevención del fraude</strong>: registros técnicos (dirección IP,
                                fecha y hora) e intentos de inicio de sesión, para proteger las cuentas y el servicio.</td>
                            <td>Interés legítimo (art. 6.1.f).</td>
                            <td>El tiempo imprescindible para esa finalidad.</td>
                        </tr>
                        {GA_MEASUREMENT_ID && (
                            <tr>
                                <td><strong>Estadísticas de uso</strong> (Google Analytics), solo si aceptas las cookies
                                    analíticas: páginas vistas, dispositivo, origen de la visita y pasos de la compra,
                                    asociados a un identificador aleatorio, no a tu nombre ni a tu email.</td>
                                <td>Tu consentimiento (art. 6.1.a), que puedes retirar en &quot;Configurar
                                    cookies&quot;.</td>
                                <td>El plazo de conservación configurado en Google Analytics (2 meses por defecto, 14 como máximo). Las cookies, 2 años como máximo.</td>
                            </tr>
                        )}
                        <tr>
                            <td><strong>Comunicaciones comerciales</strong> (ofertas y novedades).</td>
                            <td>Tu consentimiento (art. 6.1.a) o, si eres cliente, el art. 21.2 LSSI-CE para productos
                                similares a los que compraste.</td>
                            <td>Hasta que te des de baja, lo que puedes hacer en cualquier momento y en cada
                                comunicación.</td>
                        </tr>
                    </tbody>
                </LegalTable>
                <p>
                    Las cookies y el almacenamiento local se explican en la{' '}
                    <Link href="/politica-de-cookies">Política de cookies</Link>.
                </p>
                <p>
                    Los campos obligatorios de cada formulario están indicados. Sin ellos no podemos crear tu cuenta ni
                    tramitar tu pedido. Si nos facilitas datos de terceros (por ejemplo, la persona que recibe el pedido),
                    garantizas que les has informado. No elaboramos perfiles ni tomamos decisiones automatizadas con
                    efectos jurídicos sobre ti. Los servicios de {SITE_NAME} están dirigidos a mayores de 18 años.
                </p>
            </section>

            <section>
                <h2>3. Destinatarios</h2>
                <p>No vendemos ni cedemos tus datos. Solo acceden a ellos, en lo imprescindible:</p>
                <ul>
                    <li>Redsys y la entidad bancaria que procesa el pago con tarjeta.</li>
                    <li>Las empresas de transporte que entregan el pedido: <Company field="carriers" />.</li>
                    <li>El proveedor de alojamiento web: <Company field="hostingProvider" />.</li>
                    <li>El proveedor de envío de correos electrónicos: <Company field="emailProvider" />.</li>
                    {GA_MEASUREMENT_ID && (
                        <li>Google Ireland Limited, para las estadísticas de Google Analytics, solo si aceptas las cookies
                            analíticas. Google LLC puede tratarlos en EE. UU. al amparo del Marco de Privacidad de Datos
                            UE-EE. UU.</li>
                    )}
                    <li>Asesores fiscales o contables, y las Administraciones Públicas, jueces y tribunales cuando exista
                        una obligación legal.</li>
                </ul>
                <p>
                    Los proveedores que tratan datos por nuestra cuenta han firmado el correspondiente contrato de
                    encargo de tratamiento (art. 28 RGPD). Si alguno está situado fuera del Espacio Económico Europeo, la
                    transferencia se ampara en una decisión de adecuación de la Comisión Europea o en cláusulas
                    contractuales tipo.
                </p>
            </section>

            <section>
                <h2>4. Tus derechos</h2>
                <p>
                    Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento
                    y portabilidad, así como retirar en cualquier momento el consentimiento prestado (sin que ello afecte
                    a los tratamientos anteriores), escribiendo a <Company field="privacyEmail" /> o por correo postal a{' '}
                    <Company field="address" />. Indica qué derecho ejerces. Si no podemos identificarte con los datos de
                    tu cuenta, te pediremos que acredites tu identidad. Te responderemos en el plazo de un mes.
                </p>
                <p>
                    Muchos de tus datos puedes consultarlos y corregirlos directamente en{' '}
                    <Link href="/mi-cuenta/profile">Mi cuenta</Link>.
                </p>
                <p>
                    Si consideras que no hemos atendido correctamente tus derechos, puedes presentar una reclamación ante
                    la Agencia Española de Protección de Datos (www.aepd.es, C/ Jorge Juan 6, 28001 Madrid).
                </p>
            </section>

            <section>
                <h2>5. Seguridad</h2>
                <p>
                    Aplicamos medidas técnicas y organizativas adecuadas al riesgo: conexión cifrada (HTTPS), contraseñas
                    almacenadas cifradas, limitación de intentos de inicio de sesión y acceso restringido a los datos. Los
                    datos de la tarjeta se introducen directamente en la pasarela del banco y nunca llegan a nuestros
                    sistemas.
                </p>
            </section>

            <section>
                <h2>6. Cambios en esta política</h2>
                <p>
                    Podemos actualizar esta política para adaptarla a cambios legales o del servicio. La fecha de la
                    última actualización figura al principio de la página. Si el cambio es relevante, te lo
                    comunicaremos.
                </p>
            </section>
        </LegalPageShell>
    );
}
