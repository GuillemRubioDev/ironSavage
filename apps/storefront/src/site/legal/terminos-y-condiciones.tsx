import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {Link} from '@/platform/i18n/navigation';
import {LegalPageShell, legalPageMetadata} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/terminos-y-condiciones', 'termsAndConditions');
}

/**
 * Condiciones generales de uso y de contratación. Accepted with a checkbox
 * when creating an account and again before paying at checkout — both link
 * here. Customers can print/save them as PDF from the page itself.
 */
export default async function TermsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('termsAndConditions')}>
            <section>
                <h2>1. Quiénes somos</h2>
                <p>
                    {SITE_NAME} es una tienda online de suplementación deportiva titularidad de{' '}
                    <Company field="legalName" />, con NIF/CIF <Company field="taxId" /> y domicilio en{' '}
                    <Company field="address" /> (el &quot;Vendedor&quot;). Puedes contactarnos en{' '}
                    <Company field="contactEmail" /> o en el teléfono <Company field="phone" />. El resto de datos
                    identificativos figuran en el <Link href="/aviso-legal">Aviso legal</Link>.
                </p>
            </section>

            <section>
                <h2>2. Ámbito y aceptación</h2>
                <p>
                    Estas condiciones generales regulan (a) el uso de la cuenta de cliente y (b) la compra de productos a
                    través de {SITE_NAME}. Debes aceptarlas expresamente al crear una cuenta y, de nuevo, antes de
                    pagar cada pedido. A cada pedido se le aplica la versión vigente en el momento de realizarlo: la
                    fecha de la última actualización figura al principio de esta página.
                </p>
                <p>
                    Puedes leer, imprimir o guardar estas condiciones en PDF en cualquier momento con el botón
                    &quot;Imprimir o guardar en PDF&quot;. El contrato se celebra en español.
                </p>
                <p>
                    Los productos se venden a consumidores finales. Si compras como empresa o profesional, no te son
                    aplicables las disposiciones de estas condiciones que la ley reserva a los consumidores (por
                    ejemplo, el derecho de desistimiento).
                </p>
            </section>

            <section>
                <h2>3. Cuenta de cliente</h2>
                <ul>
                    <li>Para crear una cuenta debes ser mayor de 18 años y facilitar datos veraces. La cuenta se activa
                        tras verificar tu correo electrónico.</li>
                    <li>Eres responsable de custodiar tu contraseña y de las operaciones realizadas con tu cuenta. Si
                        sospechas de un uso no autorizado, cambia tu contraseña y avísanos.</li>
                    <li>Desde <Link href="/mi-cuenta/profile">Mi cuenta</Link> puedes consultar y modificar tus datos,
                        direcciones, pedidos, facturas y puntos.</li>
                    <li>Puedes solicitar la baja de tu cuenta en cualquier momento escribiendo a{' '}
                        <Company field="contactEmail" />. Conservaremos únicamente los datos que la ley nos obligue a
                        guardar (por ejemplo, las facturas).</li>
                    <li>Podremos suspender o cerrar una cuenta que se use de forma fraudulenta o contraria a estas
                        condiciones, informándote del motivo.</li>
                </ul>
                <p>También puedes comprar sin crear una cuenta (compra como invitado).</p>
            </section>

            <section>
                <h2>4. Productos</h2>
                <p>
                    Los productos se describen con la mayor exactitud posible. Antes de comprar tienes a tu disposición
                    en la ficha de cada producto su información alimentaria obligatoria (denominación, ingredientes,
                    alérgenos, cantidad neta, modo de empleo, dosis diaria recomendada y advertencias), salvo la fecha de
                    consumo preferente, que figura en el envase. Las imágenes son orientativas; prevalece la información
                    del etiquetado.
                </p>
                <p>
                    Los complementos alimenticios no son medicamentos y no deben utilizarse como sustituto de una dieta
                    equilibrada y variada ni de un modo de vida sano. No superes la dosis diaria expresamente
                    recomendada y mantén los productos fuera del alcance de los niños. Si estás embarazada o en periodo de
                    lactancia, tomas medicación o tienes alguna patología, consulta con un profesional sanitario antes
                    de consumirlos.
                </p>
                <p>
                    Todos los pedidos están sujetos a disponibilidad. Si tras el pago un producto no estuviera
                    disponible, te avisaremos y te devolveremos el importe correspondiente sin demora y, como máximo, en
                    14 días naturales.
                </p>
            </section>

            <section>
                <h2>5. Precios</h2>
                <p>
                    Los precios incluyen el IVA y se muestran en euros o en la moneda que selecciones en la tienda. Los gastos de envío dependen del método de envío
                    y de la dirección de entrega, y se muestran, junto con el importe total, antes de que confirmes el
                    pedido. Si un precio fuera manifiestamente erróneo por un fallo técnico, te informaremos y podrás
                    confirmar el pedido al precio correcto o cancelarlo con el reembolso íntegro de lo pagado.
                </p>
            </section>

            <section>
                <h2>6. Cómo se realiza un pedido</h2>
                <ol>
                    <li>Añade los productos al carrito.</li>
                    <li>En el proceso de compra indica tus datos de contacto, la dirección de entrega y el método de
                        envío.</li>
                    <li>Elige el método de pago.</li>
                    <li>Revisa el resumen: productos, dirección, envío, pago e importe total. Antes de confirmar puedes
                        corregir cualquier dato con los botones &quot;Editar&quot; de cada paso, o volver al carrito.</li>
                    <li>Acepta estas condiciones y pulsa &quot;Pagar pedido&quot;. Ese botón implica una obligación de
                        pago. Si pagas con tarjeta, se te redirigirá a la pasarela segura del banco para completar el
                        pago.</li>
                </ol>
                <p>
                    El contrato queda celebrado cuando se confirma el pago. Recibirás un correo electrónico de
                    confirmación con el detalle del pedido. El pedido queda archivado y puedes consultarlo, junto con
                    su factura, en <Link href="/mi-cuenta/pedidos">Mi cuenta &gt; Pedidos</Link> si tienes cuenta, o
                    solicitárnoslo por correo electrónico.
                </p>
            </section>

            <section>
                <h2>7. Pago y factura</h2>
                <p>
                    El pago se realiza con tarjeta a través de Redsys, la pasarela de pago segura de la entidad
                    bancaria. {SITE_NAME} no conoce ni almacena los datos de tu tarjeta. El cargo se realiza en el
                    momento de confirmar el pedido.
                </p>
                <p>
                    Por cada pedido pagado se emite una factura, que puedes descargar en{' '}
                    <Link href="/mi-cuenta/facturas">Mi cuenta &gt; Facturas</Link>. Al aceptar estas condiciones
                    consientes recibir la factura en formato electrónico. Si prefieres recibirla en papel, pídenosla en{' '}
                    <Company field="contactEmail" />.
                </p>
            </section>

            <section>
                <h2>8. Envío y entrega</h2>
                <p>
                    Los plazos, zonas y costes de envío se detallan en{' '}
                    <Link href="/envios-y-devoluciones">Envíos y devoluciones</Link>. Salvo que se indique otro plazo,
                    entregaremos el pedido como máximo en 30 días naturales desde su celebración. Si no pudiéramos
                    hacerlo, te informaremos y podrás cancelar el pedido con el reembolso íntegro de lo pagado. El riesgo
                    de pérdida o daño de los productos pasa a ti cuando los recibes tú o la persona que designes.
                </p>
            </section>

            <section>
                <h2>9. Derecho de desistimiento</h2>
                <p>
                    Si eres consumidor, dispones de 14 días naturales desde que recibes el pedido para desistir de la
                    compra sin necesidad de justificación. Cómo ejercerlo, los costes, los reembolsos y el formulario
                    modelo se explican en <Link href="/envios-y-devoluciones">Envíos y devoluciones</Link>.
                </p>
                <p>
                    Conforme al artículo 103 del Real Decreto Legislativo 1/2007, no procede el desistimiento para los
                    productos precintados que, por razones de protección de la salud o de higiene, no son aptos para ser
                    devueltos una vez desprecintados tras la entrega. En la práctica, los envases de suplementos cuyo
                    precinto de seguridad se haya abierto no se pueden devolver por desistimiento. Esto no afecta a tu
                    derecho a la garantía si el producto es defectuoso.
                </p>
            </section>

            <section>
                <h2>10. Garantía legal</h2>
                <p>
                    Respondemos de las faltas de conformidad (por ejemplo, un producto defectuoso, en mal estado,
                    distinto del pedido o dañado en el transporte) que se manifiesten en los tres años siguientes a la
                    entrega, conforme a los artículos 114 y siguientes del Real Decreto Legislativo 1/2007. Para los
                    productos con fecha de consumo preferente, se tiene en cuenta dicha fecha al valorar la conformidad.
                    Puedes elegir entre la sustitución del producto o, cuando proceda, una rebaja del precio o la
                    resolución del contrato, sin coste para ti. Para ello, escríbenos a <Company field="contactEmail" />{' '}
                    indicando el número de pedido y, si es posible, con fotografías del producto.
                </p>
            </section>

            <section>
                <h2>11. Programa de puntos</h2>
                <ul>
                    <li>Los clientes con cuenta acumulan puntos por sus compras pagadas, según la equivalencia vigente
                        que se muestra en <Link href="/mi-cuenta/puntos">Mi cuenta &gt; Mis puntos</Link>, donde también
                        puedes consultar tu saldo y tus movimientos.</li>
                    <li>Los puntos pueden canjearse por descuentos en compras futuras. No tienen valor monetario, no son
                        canjeables por dinero y no se pueden transferir a otra cuenta.</li>
                    <li>Si un pedido se cancela, se restan los puntos obtenidos con él y se devuelven los que se canjearon
                        en él. Si se reembolsa solo en parte, se restan los puntos en proporción al importe
                        reembolsado.</li>
                    <li>Podremos modificar o finalizar el programa avisando con antelación razonable. Los puntos
                        acumulados hasta ese momento se respetarán durante el plazo que se indique en el aviso.</li>
                </ul>
            </section>

            <section>
                <h2>12. Códigos de atleta</h2>
                <ul>
                    <li>Algunos deportistas colaboradores (&quot;atletas&quot;) disponen de un código promocional
                        personal. Al usarlo en tu compra obtienes el descuento que se indica en cada caso.</li>
                    <li>El atleta obtiene puntos cuando otros clientes compran con su código. No los obtiene por sus
                        propias compras. Si el pedido se cancela o se reembolsa, esos puntos se retiran total o
                        proporcionalmente.</li>
                    <li>El atleta no recibe tus datos de identificación ni de contacto: de cada compra hecha con su código
                        solo ve la fecha, la referencia del pedido, el importe y los puntos que ha generado.</li>
                    <li>Los atletas que difundan su código deben identificar esa comunicación como publicidad (por
                        ejemplo, con la indicación &quot;publicidad&quot; o &quot;#publi&quot;) e indicar su relación
                        comercial con {SITE_NAME}. Los códigos no pueden publicarse en webs de cupones ni usarse de forma
                        engañosa. El uso indebido puede suponer la retirada del código y de los puntos obtenidos
                        indebidamente.</li>
                </ul>
            </section>

            <section>
                <h2>13. Opiniones de clientes</h2>
                <p>
                    Solo pueden publicar opiniones los clientes con cuenta que han comprado y pagado el producto, una
                    opinión por producto y pedido: lo comprobamos automáticamente contra nuestros pedidos. Todas las
                    opiniones se revisan antes de publicarse. Publicamos las positivas y las negativas, y solo retiramos
                    las que incumplen el apartado 2 del <Link href="/aviso-legal">Aviso legal</Link> (contenido falso,
                    ofensivo, publicitario o que vulnere derechos de terceros). No pagamos ni damos compensación alguna a
                    cambio de opiniones.
                </p>
            </section>

            <section>
                <h2>14. Responsabilidad</h2>
                <p>
                    El Vendedor responde del cumplimiento del contrato conforme a la ley. No responde del uso de los
                    productos en contra de las indicaciones de su etiquetado ni de los daños causados por causas de
                    fuerza mayor. Nada de lo previsto en estas condiciones limita los derechos que la normativa de
                    consumo reconoce a los consumidores.
                </p>
            </section>

            <section>
                <h2>15. Atención al cliente y reclamaciones</h2>
                <p>
                    Puedes dirigir tus consultas, quejas y reclamaciones a <Company field="contactEmail" />, al teléfono{' '}
                    <Company field="phone" /> o por correo postal a <Company field="address" />. Te responderemos en el
                    menor tiempo posible y, como máximo, en un mes. Tienes a tu disposición hojas oficiales de queja y
                    reclamación: solicítalas en esas mismas direcciones.
                </p>
                <p>
                    Entidad de resolución alternativa de litigios: <Company field="adrEntity" />. También puedes acudir a
                    los servicios de consumo de tu comunidad autónoma o ayuntamiento.
                </p>
            </section>

            <section>
                <h2>16. Accesibilidad</h2>
                <p>
                    Cómo cumple {SITE_NAME} los requisitos de accesibilidad de la Ley 11/2023, sus limitaciones conocidas
                    y cómo comunicarnos cualquier barrera se explica en la{' '}
                    <Link href="/accesibilidad">Declaración de accesibilidad</Link>. Si no puedes completar una compra por
                    un problema de accesibilidad, te ayudaremos a tramitarla por correo electrónico o por teléfono.
                </p>
            </section>

            <section>
                <h2>17. Modificación de las condiciones</h2>
                <p>
                    Podemos modificar estas condiciones para adaptarlas a cambios legales o del servicio. Los cambios no
                    afectan a los pedidos ya realizados. Si afectan a tu cuenta o al programa de puntos, te avisaremos
                    antes de que entren en vigor.
                </p>
            </section>

            <section>
                <h2>18. Legislación aplicable y jurisdicción</h2>
                <p>
                    Estas condiciones se rigen por la legislación española, en particular por el Real Decreto Legislativo
                    1/2007 (Ley General para la Defensa de los Consumidores y Usuarios), la Ley 34/2002 (LSSI-CE) y la
                    Ley 7/1998 de Condiciones Generales de la Contratación. Si eres consumidor, son competentes los
                    juzgados y tribunales de tu domicilio, y conservas la protección de las normas imperativas del país
                    en el que resides.
                </p>
            </section>
        </LegalPageShell>
    );
}
