import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {Link} from '@/platform/i18n/navigation';
import {LegalPageShell, legalPageMetadata} from '@/site/legal/legal-page';
import {Company} from '@/site/legal/company';

export function generateMetadata() {
    return legalPageMetadata('/envios-y-devoluciones', 'shippingReturns');
}

export default async function ShippingReturnsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});

    return (
        <LegalPageShell title={t('shippingReturns')}>
            <section>
                <h2>1. Envíos</h2>
                <p>
                    Los métodos y costes de envío disponibles para tu dirección se muestran en el proceso de compra
                    antes de pagar, incluidos en el importe total. Los envíos los realiza <Company field="carriers" />.
                    Plazo estimado de entrega: <Company field="deliveryTimes" />, desde la confirmación del pago. En
                    ningún caso superará los 30 días naturales. Si no pudiéramos cumplirlo, te avisaremos y podrás
                    cancelar el pedido con el reembolso íntegro.
                </p>
            </section>

            <section>
                <h2>2. Seguimiento del pedido</h2>
                <p>
                    Te enviaremos un correo electrónico cuando se confirme el pago. Si tienes cuenta, puedes consultar el
                    estado del pedido (en preparación, preparado, enviado, entregado) en todo momento en{' '}
                    <Link href="/mi-cuenta/pedidos">Mi cuenta &gt; Pedidos</Link>.
                </p>
                <p>
                    Al recibir el paquete, comprueba que está en buen estado. Si ves daños, indícalo al transportista y
                    avísanos cuanto antes con fotografías. Esto no limita tu derecho a la garantía legal.
                </p>
            </section>

            <section>
                <h2>3. Derecho de desistimiento</h2>
                <p>
                    Si eres consumidor, tienes derecho a desistir del contrato en un plazo de 14 días naturales sin
                    necesidad de justificación. El plazo empieza el día en que recibes los productos tú o la persona que
                    indiques (distinta del transportista). Si el pedido llega en varias entregas, empieza con la
                    última.
                </p>
                <p>
                    Para ejercerlo, comunícanoslo antes de que termine el plazo mediante una declaración inequívoca, por
                    ejemplo por correo electrónico a <Company field="contactEmail" /> o por correo postal a{' '}
                    <Company field="address" />. Puedes usar el formulario modelo del apartado 7, aunque no es
                    obligatorio. Te confirmaremos la recepción sin demora.
                </p>
                <h3>Excepciones</h3>
                <p>
                    Por razones de protección de la salud e higiene, no se admite el desistimiento de los productos
                    precintados cuyo precinto se haya abierto tras la entrega (art. 103.e del Real Decreto Legislativo
                    1/2007). Puedes desistir de los productos que conserven su precinto intacto.
                </p>
            </section>

            <section>
                <h2>4. Devolución de los productos</h2>
                <p>
                    Debes devolver los productos sin demora y, como máximo, en 14 días naturales desde que nos comuniques
                    tu desistimiento, a la dirección: <Company field="returnsAddress" />. Costes de devolución:{' '}
                    <Company field="returnCosts" />. Solo respondes de la disminución de valor de los productos si se
                    debe a una manipulación distinta de la necesaria para comprobar su naturaleza y características.
                </p>
            </section>

            <section>
                <h2>5. Reembolso</h2>
                <p>
                    Te devolveremos todos los pagos recibidos, incluidos los gastos de envío iniciales (salvo el
                    sobrecoste si elegiste un envío distinto del menos costoso que ofrecíamos), sin demora y, como
                    máximo, en 14 días naturales desde que nos comuniques el desistimiento. Usaremos el mismo medio de
                    pago que empleaste, salvo que acuerdes otro, sin coste para ti. Podemos retener el reembolso hasta
                    recibir los productos o hasta que acredites su devolución, lo que ocurra primero. Si se canjearon
                    puntos en el pedido, se te devolverán a tu saldo.
                </p>
            </section>

            <section>
                <h2>6. Productos defectuosos o erróneos</h2>
                <p>
                    Si recibes un producto defectuoso, en mal estado, dañado o distinto del pedido, escríbenos a{' '}
                    <Company field="contactEmail" /> con el número de pedido y fotografías. Te lo sustituiremos o
                    reembolsaremos sin ningún coste para ti, incluido el de la devolución, conforme a la garantía legal
                    de tres años descrita en los <Link href="/terminos-y-condiciones">Términos y condiciones</Link>.
                    Esta garantía es independiente del derecho de desistimiento y también se aplica a los productos
                    desprecintados.
                </p>
            </section>

            <section>
                <h2>7. Formulario de desistimiento</h2>
                <p>
                    (Solo debes cumplimentar y enviar este formulario si deseas desistir del contrato. Puedes imprimir
                    esta página o copiar el texto en un correo electrónico.)
                </p>
                <div className="rounded-md border p-4 space-y-3 print:break-inside-avoid">
                    <p>
                        A la atención de <Company field="legalName" />, <Company field="address" />,{' '}
                        <Company field="contactEmail" />:
                    </p>
                    <p>
                        Por la presente le comunico que desisto de mi contrato de venta de los siguientes bienes:
                        ____________________________________________
                    </p>
                    <p>Número de pedido: ____________________</p>
                    <p>Pedido el / recibido el: ____________________</p>
                    <p>Nombre del consumidor: ____________________________________________</p>
                    <p>Domicilio del consumidor: ____________________________________________</p>
                    <p>Firma del consumidor (solo si el formulario se presenta en papel): ____________________</p>
                    <p>Fecha: ____________________</p>
                </div>
            </section>
        </LegalPageShell>
    );
}
