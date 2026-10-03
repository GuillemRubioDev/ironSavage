'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Truck, CreditCard, Edit, Mail } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { placeOrder as placeOrderAction, getRedsysPaymentForm, type RedsysPaymentForm } from '../actions';
import { Price } from '@/features/pricing/price';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from '@/platform/i18n/navigation';

/** Opens a legal text in a new tab, so the checkout in progress isn't lost. */
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

// Matches the `code` of the PaymentMethod created in the Admin UI for RedsysPlugin's
// handler. Only this code triggers the redirect-to-Redsys flow; any other eligible
// method (e.g. the dev-only dummy handler) goes through the normal placeOrder flow.
const REDSYS_PAYMENT_METHOD_CODE = 'redsys';

/** Redsys' "Conexión por Redirección" requires a real browser POST navigation. */
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
        // Browser is navigating away to Redsys now — stay in the loading state.
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

        {/* Shipping Address */}
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

        {/* Delivery Method */}
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

        {/* Payment Method */}
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

      {/* LSSI-CE art. 27 / TRLGDCU art. 98: the general terms must be available and accepted before paying. */}
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
        size="lg"
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('placeOrder')}
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
