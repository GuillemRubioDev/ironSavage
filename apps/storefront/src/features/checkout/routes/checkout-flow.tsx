'use client';

import { useEffect, useState } from 'react';
import { toMajorUnits, trackEvent } from '@/platform/analytics/gtag';
import { Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ContactStep from './steps/contact-step';
import ShippingAddressStep from './steps/shipping-address-step';
import DeliveryStep from './steps/delivery-step';
import PaymentStep from './steps/payment-step';
import ReviewStep from './steps/review-step';
import OrderSummary from './order-summary';
import { useCheckout } from './checkout-provider';
import {useTranslations} from 'next-intl';
import { stepSummary } from '@/features/checkout/step-summary';

type CheckoutStep = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review';

export default function CheckoutFlow() {
  const t = useTranslations('Checkout');
  const { order, isGuest, paymentMethods, selectedPaymentMethodCode } = useCheckout();

  // begin_checkout de GA4: una vez por pedido, no en cada paso o recarga.
  const orderCode = order?.code;
  useEffect(() => {
    if (!order || !orderCode) return;
    const key = `ga-begin-checkout-${orderCode}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Almacenamiento no disponible: en el peor caso el evento se envía más de una vez.
    }
    trackEvent('begin_checkout', {
      currency: order.currencyCode,
      value: toMajorUnits(order.totalWithTax),
      coupon: order.couponCodes?.join(',') || undefined,
      items: order.lines.map((line) => ({
        item_id: line.productVariant.sku || line.productVariant.id,
        item_name: line.productVariant.product.name,
        item_variant: line.productVariant.name,
        price: toMajorUnits(line.discountedUnitPriceWithTax),
        quantity: line.quantity,
      })),
    });
    // Una vez por código de pedido: el objeto del pedido cambia en cada paso del checkout.
  }, [orderCode]);

  const getStepOrder = (): CheckoutStep[] => {
    if (isGuest) {
      return ['contact', 'shipping', 'delivery', 'payment', 'review'];
    }
    return ['shipping', 'delivery', 'payment', 'review'];
  };

  const stepOrder = getStepOrder();

  const getInitialState = () => {
    const completed = new Set<CheckoutStep>();
    let current: CheckoutStep = stepOrder[0];

    if (isGuest) {
      if (order.customer?.emailAddress) {
        completed.add('contact');
        current = 'shipping';
      }
    }

    if (order.shippingAddress?.streetLine1 && order.shippingAddress?.country) {
      if (!isGuest || completed.has('contact')) {
        completed.add('shipping');
        current = 'delivery';
      }
    }

    if (order.shippingLines && order.shippingLines.length > 0) {
      if (completed.has('shipping')) {
        completed.add('delivery');
        current = 'payment';
      }
    }

    return { completed, current };
  };

  const initialState = getInitialState();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(initialState.current);
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(initialState.completed);

  const handleStepComplete = (step: CheckoutStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const canAccessStep = (step: CheckoutStep): boolean => {
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex === 0) return true;

    const previousStep = stepOrder[stepIndex - 1];
    return completedSteps.has(previousStep);
  };

  const getStepNumber = (step: CheckoutStep): number => {
    return stepOrder.indexOf(step) + 1;
  };

  const stepLabels: Record<CheckoutStep, string> = {
    contact: t('steps.contact'),
    shipping: t('steps.address'),
    delivery: t('steps.delivery'),
    payment: t('steps.payment'),
    review: t('steps.review'),
  };

  const summaryData = {
    email: order.customer?.emailAddress,
    address: order.shippingAddress,
    shippingMethodName: order.shippingLines?.[0]?.shippingMethod.name,
    paymentMethodName: paymentMethods.find((m) => m.code === selectedPaymentMethodCode)?.name,
  };

  // Cabecera de cada panel: número (o check), título y, en los pasos ya hechos que no
  // están abiertos, lo elegido en una línea más "Cambiar" (el panel entero es pulsable).
  // Función de render (no un componente definido dentro de otro, que se remontaría en cada render).
  const stepTitle = (step: CheckoutStep, label: string) => {
    const done = completedSteps.has(step) && step !== 'review';
    const summary = stepSummary(step, summaryData);
    return (
      <span className="flex w-full min-w-0 items-center gap-3">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          done
            ? 'bg-success text-success-foreground'
            : currentStep === step
            ? 'bg-primary-solid text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}>
          {done ? <Check className="size-4" /> : getStepNumber(step)}
        </span>
        <span className="text-lg font-semibold">{label}</span>
        {done && currentStep !== step && (
          <>
            {/* Nombre accesible corto ("…, Cambiar"); lo visible lleva además el resumen. */}
            <span className="sr-only">{t('change')}</span>
            <span aria-hidden="true" className="ml-auto flex min-w-0 items-center gap-3 pr-2 text-sm font-normal normal-case not-italic">
              {summary && <span className="hidden truncate text-muted-foreground sm:inline">{summary}</span>}
              <span className="shrink-0 font-semibold text-primary">{t('change')}</span>
            </span>
          </>
        )}
      </span>
    );
  };

  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        {/* Indicador de progreso de pasos: compacto en móvil, con círculos desde sm. */}
        <div className="mb-8">
          <div className="sm:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('stepOf', {current: currentIndex + 1, total: stepOrder.length})} · {stepLabels[currentStep]}
            </p>
            <div aria-hidden="true" className="h-1 rounded-full bg-muted">
              <div className="h-1 rounded-full bg-primary-solid transition-[width] duration-[var(--dur-slow)]" style={{width: `${((currentIndex + 1) / stepOrder.length) * 100}%`}} />
            </div>
          </div>
          <div className="hidden items-center justify-between sm:flex">
            {stepOrder.map((step, index) => (
              <div key={step} className="flex items-center flex-1 last:flex-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-300 ${
                      completedSteps.has(step)
                        ? 'bg-primary-solid text-primary-foreground'
                        : currentStep === step
                        ? 'bg-primary-solid text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {completedSteps.has(step) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      getStepNumber(step)
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    completedSteps.has(step) || currentStep === step
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}>
                    {stepLabels[step]}
                  </span>
                </div>
                {index < stepOrder.length - 1 && (
                  <div className="flex-1 mx-2 mb-5">
                    <div className={`h-0.5 w-full transition-colors duration-300 ${
                      completedSteps.has(step) ? 'bg-primary' : 'bg-muted'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Accordion
          value={[currentStep]}
          onValueChange={(value) => {
            const step = value[0] as CheckoutStep | undefined;
            if (step && canAccessStep(step)) {
              setCurrentStep(step);
            }
          }}
          className="space-y-4"
        >
          {isGuest && (
            <AccordionItem value="contact" className="border rounded-lg px-6">
              <AccordionTrigger headingLevel={2} className="w-full hover:no-underline">
                {stepTitle('contact', t('contactInformation'))}
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <ContactStep
                  onComplete={() => handleStepComplete('contact')}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem
            value="shipping"
            className="border rounded-lg px-6"
            disabled={!canAccessStep('shipping')}
          >
            <AccordionTrigger headingLevel={2}
              className="w-full hover:no-underline"
              disabled={!canAccessStep('shipping')}
            >
                {stepTitle('shipping', t('shippingAddress'))}
              </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ShippingAddressStep
                onComplete={() => handleStepComplete('shipping')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="delivery"
            className="border rounded-lg px-6"
            disabled={!canAccessStep('delivery')}
          >
            <AccordionTrigger headingLevel={2}
              className="w-full hover:no-underline"
              disabled={!canAccessStep('delivery')}
            >
                {stepTitle('delivery', t('deliveryMethod'))}
              </AccordionTrigger>
            <AccordionContent className="pt-4">
              <DeliveryStep
                onComplete={() => handleStepComplete('delivery')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="payment"
            className="border rounded-lg px-6"
            disabled={!canAccessStep('payment')}
          >
            <AccordionTrigger headingLevel={2}
              className="w-full hover:no-underline"
              disabled={!canAccessStep('payment')}
            >
                {stepTitle('payment', t('paymentMethod'))}
              </AccordionTrigger>
            <AccordionContent className="pt-4">
              <PaymentStep
                onComplete={() => handleStepComplete('payment')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="review"
            className="border rounded-lg px-6"
            disabled={!canAccessStep('review')}
          >
            <AccordionTrigger headingLevel={2}
              className="w-full hover:no-underline"
              disabled={!canAccessStep('review')}
            >
                {stepTitle('review', t('reviewAndPlaceOrder'))}
              </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ReviewStep
                onEditStep={setCurrentStep}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="lg:col-span-1">
        <OrderSummary />
      </div>
    </div>
  );
}
