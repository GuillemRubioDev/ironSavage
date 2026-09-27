import type {Metadata} from 'next';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {GetActiveOrderForCheckoutQuery, GetEligiblePaymentMethodsQuery, GetEligibleShippingMethodsQuery} from '@/features/checkout/graphql';
import {GetCustomerAddressesQuery} from '@/features/account/graphql';
import {redirect} from '@/platform/i18n/navigation';
import CheckoutFlow from './checkout-flow';
import {CheckoutProvider} from './checkout-provider';
import {noIndexRobots} from '@/config/metadata';
import {getActiveCustomer} from '@/features/account/customer';
import {getAvailableCountriesCached} from '@/features/checkout/countries';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {AlertCircle} from 'lucide-react';
import {sanitizeRichText} from '@/platform/security/sanitize-html';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Checkout'});
    return {
        title: t('pageTitle'),
        robots: noIndexRobots(),
    };
}

export default async function CheckoutPage({searchParams}: PageProps<'/[locale]/checkout'>) {
    const resolvedSearchParams = await searchParams;
    const paymentDeclined = resolvedSearchParams.redsys === 'declined';
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Checkout'});
    const customer = await getActiveCustomer();
    const isGuest = !customer;

    const [orderRes, addressesRes, countries, shippingMethodsRes, paymentMethodsRes] =
        await Promise.all([
            query(GetActiveOrderForCheckoutQuery, {}, {useAuthToken: true, currencyCode}),
            isGuest
                ? Promise.resolve({ data: { activeCustomer: null } })
                : query(GetCustomerAddressesQuery, {}, {useAuthToken: true}),
            getAvailableCountriesCached(locale),
            query(GetEligibleShippingMethodsQuery, {}, {useAuthToken: true, currencyCode}),
            query(GetEligiblePaymentMethodsQuery, {}, {useAuthToken: true, currencyCode}),
        ]);

    const activeOrder = orderRes.data.activeOrder;

    if (!activeOrder || activeOrder.lines.length === 0) {
        return redirect({href: '/carrito', locale});
    }

    if (activeOrder.state !== 'AddingItems' && activeOrder.state !== 'ArrangingPayment') {
        return redirect({href: `/order-confirmation/${activeOrder.code}`, locale});
    }

    const addresses = addressesRes.data.activeCustomer?.addresses || [];
    const shippingMethods = shippingMethodsRes.data.eligibleShippingMethods || [];
    // description is admin-authored rich HTML rendered via dangerouslySetInnerHTML
    // in payment-step.tsx/review-step.tsx (both client components) — sanitize it
    // here, server-side, before it ever reaches those renders.
    const paymentMethods = (paymentMethodsRes.data.eligiblePaymentMethods?.filter((m) => m.isEligible) || [])
        .map((m) => ({...m, description: sanitizeRichText(m.description)}));

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
            {paymentDeclined && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t('redsysDeclined')}</AlertDescription>
                </Alert>
            )}
            <CheckoutProvider
                order={activeOrder}
                addresses={addresses}
                countries={countries}
                shippingMethods={shippingMethods}
                paymentMethods={paymentMethods}
                isGuest={isGuest}
            >
                <CheckoutFlow/>
            </CheckoutProvider>
        </div>
    );
}
