'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Truck, CreditCard, Edit, Mail, Lock } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { placeOrder as placeOrderAction, getRedsysPaymentForm, type RedsysPaymentForm } from '../actions';
import { Price } from '@/features/pricing/price';
import {useFormatter, useTranslations} from 'next-intl';
import {toast} from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from '@/platform/i18n/navigation';

/** Abre un texto legal en una pestaña nueva para no perder el checkout en curso. */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-primary">
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
  formEl.submit();
}

export default function ReviewStep({ onEditStep }: ReviewStepProps) {
  const t = useTranslations('Checkout');
  const { order, paymentMethods, selectedPaymentMethodCode, isGuest } = useCheckout();
  const format = useFormatter();
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
        {t('payAmount', {amount: format.number(order.totalWithTax / 100, {style: 'currency', currency: order.currencyCode})})}
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
