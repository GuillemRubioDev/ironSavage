'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Truck, CreditCard, Edit, Mail, Lock } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { placeOrder as placeOrderAction, getRedsysPaymentForm, type RedsysPaymentForm } from '../actions';
import { Price } from '@/features/pricing/price';
import {useLocale, useTranslations} from 'next-intl';
import {toIntlLocale} from '@/platform/i18n/locale-utils';
import {toast} from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from '@/platform/i18n/navigation';
import { localizedPath } from '@/config/metadata';
import { cn } from '@/lib/utils';

/**
 * Descarga el texto legal en PDF sin salir del checkout (abrir la página, aunque sea en
 * otra pestaña, saca al cliente del pago en el móvil). El href se mantiene para
 * accesibilidad y como alternativa: si la descarga falla, se abre la página en una
 * pestaña nueva como antes.
 */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const locale = useLocale();
  const [downloading, setDownloading] = useState(false);

  const onClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd+clic o clic central: el usuario pide la página en otra pestaña.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (downloading) return;
    setDownloading(true);
    const path = localizedPath(locale, href);
    try {
      const {downloadLegalPdf} = await import('@/lib/legal-pdf');
      await downloadLegalPdf(path);
    } catch (error) {
      console.error('Error downloading legal PDF:', error);
      window.open(path, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      onClick={onClick}
      aria-busy={downloading}
      className={cn('underline underline-offset-2 hover:text-primary', downloading && 'cursor-progress opacity-60')}
    >
      {children}
    </Link>
  );
}

interface ReviewStepProps {
  onEditStep: (step: 'contact' | 'shipping' | 'delivery' | 'payment') => void;
}

// Coincide con el `code` del método de pago creado en el dashboard para el handler de
// RedsysPlugin. Solo este código lanza la redirección a Redsys; cualquier otro método
// válido (p. ej. el handler de prueba de desarrollo) usa el flujo normal de placeOrder.
const REDSYS_PAYMENT_METHOD_CODE = 'redsys';

/** La «Conexión por Redirección» de Redsys exige una navegación POST real del navegador. */
function submitRedsysRedirect(form: RedsysPaymentForm) {
  const formEl = document.createElement('form');
  formEl.method = 'POST';
  formEl.action = form.url;
  const fields: Record<string, string> = {
    Ds_SignatureVersion: form.signatureVersion,
    Ds_MerchantParameters: form.merchantParameters,
    Ds_Signature: form.signature,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    formEl.appendChild(input);
  }
  document.body.appendChild(formEl);

  // Sin Origin ni Referer hacia Redsys: su cortafuegos rechaza («Your request has not
  // been processed… support ID») los pagos cuyo Origin es un dominio *.sslip.io como
  // el del servidor de desarrollo, y Redsys no necesita ninguna de las dos cabeceras.
  // Con la política no-referrer el navegador envía «Origin: null». La política se toma
  // en el momento de submit(), así que se quita en el acto: si el cliente vuelve atrás
  // desde Redsys, las Server Actions (que comprueban el Origin) siguen funcionando.
  const referrerPolicy = document.createElement('meta');
  referrerPolicy.name = 'referrer';
  referrerPolicy.content = 'no-referrer';
  document.head.appendChild(referrerPolicy);
  formEl.submit();
  referrerPolicy.remove();
}

export default function ReviewStep({ onEditStep }: ReviewStepProps) {
  const t = useTranslations('Checkout');
  const { order, paymentMethods, selectedPaymentMethodCode, isGuest } = useCheckout();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.code === selectedPaymentMethodCode
  );

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethodCode || !termsAccepted) return;

    setLoading(true);
    try {
      if (selectedPaymentMethodCode === REDSYS_PAYMENT_METHOD_CODE) {
        const result = await getRedsysPaymentForm(termsAccepted);
        if (!result.success) {
          toast.error(t('unexpectedError'), { description: result.error });
          setLoading(false);
          return;
        }
        submitRedsysRedirect(result.form);
        // El navegador se va ahora a Redsys: se mantiene el estado de carga.
        return;
      }

      await placeOrderAction(selectedPaymentMethodCode, termsAccepted);
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      console.error('Error placing order:', error);
      toast.error(t('unexpectedError'), {
        description: error instanceof Error ? error.message : undefined,
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">{t('reviewYourOrder')}</h3>

      <div className={`grid grid-cols-1 gap-6 ${isGuest ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
        {isGuest && order.customer && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">{t('contact')}</h4>
            </div>
            <div className="text-sm space-y-3">
              <div>
                <p className="font-medium">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="text-muted-foreground">{order.customer.emailAddress}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStep('contact')}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            </div>
          </div>
        )}

        {/* Dirección de envío */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">{t('shippingAddress')}</h4>
          </div>
          {order.shippingAddress ? (
            <div className="text-sm space-y-3">
              <div>
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.streetLine1}
                  {order.shippingAddress.streetLine2 && `, ${order.shippingAddress.streetLine2}`}
                </p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
                <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                <p className="text-muted-foreground">{order.shippingAddress.phoneNumber}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStep('shipping')}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noShippingAddress')}</p>
          )}
        </div>

        {/* Método de envío */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">{t('deliveryMethod')}</h4>
          </div>
          {order.shippingLines && order.shippingLines.length > 0 ? (
            <div className="text-sm space-y-3">
              <div>
                <p className="font-medium">{order.shippingLines[0].shippingMethod.name}</p>
                <p className="text-muted-foreground">
                  {order.shippingLines[0].priceWithTax === 0
                    ? t('free')
                    : <Price value={order.shippingLines[0].priceWithTax} currencyCode={order.currencyCode} />}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStep('delivery')}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noDeliveryMethod')}</p>
          )}
        </div>

        {/* Método de pago */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">{t('paymentMethod')}</h4>
          </div>
          {selectedPaymentMethod ? (
            <div className="text-sm space-y-3">
              <div>
                <p className="font-medium">{selectedPaymentMethod.name}</p>
                {selectedPaymentMethod.description && (
                  <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: selectedPaymentMethod.description }} />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStep('payment')}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noPaymentMethod')}</p>
          )}
        </div>
      </div>

      {/* LSSI-CE art. 27 / TRLGDCU art. 98: las condiciones generales deben estar disponibles y aceptarse antes de pagar. */}
      <div className="flex items-start gap-2">
        <Checkbox
          id="checkout-terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          disabled={loading}
        />
        <Label htmlFor="checkout-terms" className="block font-normal leading-snug">
          {t.rich('termsAcceptance', {
            terms: (chunks) => <LegalLink href="/terminos-y-condiciones">{chunks}</LegalLink>,
            returns: (chunks) => <LegalLink href="/envios-y-devoluciones">{chunks}</LegalLink>,
            privacy: (chunks) => <LegalLink href="/politica-de-privacidad">{chunks}</LegalLink>,
          })}
        </Label>
      </div>

      <Button
        onClick={handlePlaceOrder}
        disabled={loading || !termsAccepted || !order.shippingAddress || !order.shippingLines?.length || !selectedPaymentMethodCode}
        size="xl"
        // El importe puede ser largo: en móviles estrechos el texto pasa a dos líneas.
        className="w-full h-auto min-h-12 whitespace-normal py-3 text-balance"
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
        {t('payAmount', {amount: new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: order.currencyCode}).format(order.totalWithTax / 100)})}
      </Button>

      {(!order.shippingAddress || !order.shippingLines?.length || !selectedPaymentMethodCode) ? (
        <p className="text-sm text-destructive text-center">
          {t('completeAllSteps')}
        </p>
      ) : !termsAccepted && (
        <p className="text-sm text-muted-foreground text-center">
          {t('termsRequired')}
        </p>
      )}
    </div>
  );
}
