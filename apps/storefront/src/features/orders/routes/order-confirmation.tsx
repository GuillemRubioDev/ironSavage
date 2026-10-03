import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Check, Loader2, ShoppingBag, ClipboardList} from 'lucide-react';
import { Link } from '@/platform/i18n/navigation';
import Image from 'next/image';
import {Separator} from '@/components/ui/separator';
import {Price} from '@/features/pricing/price';
import {notFound} from 'next/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {mutate, query} from '@/platform/vendure/api';
import {graphql} from '@/platform/vendure/graphql';
import {toMajorUnits} from '@/platform/analytics/gtag';
import {PurchaseTracker} from '@/features/orders/purchase-tracker';

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

const GetOrderByCodeQuery = graphql(`
    query GetOrderByCode($code: String!) {
        orderByCode(code: $code) {
            id
            code
            state
            totalWithTax
            shippingWithTax
            currencyCode
            lines {
                id
                productVariant {
                    id
                    name
                    sku
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            id
                            preview
                        }
                    }
                }
                quantity
                linePriceWithTax
            }
            shippingAddress {
                fullName
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
            }
        }
    }
`);

const ConfirmRedsysPaymentMutation = graphql(`
    mutation ConfirmRedsysPayment($input: ConfirmRedsysPaymentInput!) {
        confirmRedsysPayment(input: $input) {
            __typename
            ... on RedsysConfirmation {
                orderCode
                alreadyProcessed
            }
            ... on RedsysConfirmationError {
                errorCode
                message
            }
        }
    }
`);

interface OrderConfirmationProps {
    paramsPromise: Promise<{ locale: string; code: string }>;
    searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}

export async function OrderConfirmation({paramsPromise, searchParamsPromise}: OrderConfirmationProps) {
    const {code} = await paramsPromise;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'OrderConfirmation'});

    // Redsys' redirect back to DS_MERCHANT_URLOK carries the same signed
    // Ds_SignatureVersion/Ds_MerchantParameters/Ds_Signature it also sends
    // server-to-server to the async notification endpoint. Processing it here
    // too (best-effort — a missing/invalid/already-processed payload is a safe
    // no-op, see confirmRedsysPayment) lets this page confirm payment on the
    // very first render instead of only via the polling fallback below, which
    // depended entirely on that separate notification having already arrived
    // — something REDSYS_NOTIFICATION_URL being unreachable (e.g. plain
    // localhost testing, no public tunnel) meant could never happen at all,
    // leaving the customer stuck on "Confirmando tu pago..." indefinitely even
    // though the card had genuinely been charged.
    const searchParams = await searchParamsPromise;
    const merchantParameters = firstValue(searchParams.Ds_MerchantParameters);
    const signature = firstValue(searchParams.Ds_Signature);
    if (merchantParameters && signature) {
        try {
            const confirmResult = await mutate(ConfirmRedsysPaymentMutation, {
                input: {
                    signatureVersion: firstValue(searchParams.Ds_SignatureVersion),
                    merchantParameters,
                    signature,
                },
            });
            const outcome = confirmResult.data.confirmRedsysPayment;
            if (outcome.__typename === 'RedsysConfirmationError') {
                // Logged (not thrown) — the polling fallback below still covers
                // this: a genuine failure/delay here just means the async
                // notification has to win the race instead. But silently
                // dropping this made a real invalid-payload/mismatch bug here
                // indistinguishable from Redsys simply not having sent these
                // params at all — see the `else` branch below.
                console.error(`[Redsys] confirmRedsysPayment for order ${code} returned an error: ${outcome.message}`);
            }
        } catch (err) {
            console.error(`[Redsys] confirmRedsysPayment request failed for order ${code}:`, err);
        }
    } else {
        // Expected on a plain "view my order" visit (no Redsys params at all).
        // But if this order is still ArrangingPayment and the customer *did*
        // just come back from Redsys, this line is the signal that Redsys'
        // redirect didn't carry Ds_MerchantParameters/Ds_Signature this time —
        // a Redsys/environment-side behaviour, not something this page can fix
        // — confirmation then depends entirely on the separate async
        // notification (REDSYS_NOTIFICATION_URL) actually being reachable.
        console.log(`[Redsys] order-confirmation for ${code} had no Ds_MerchantParameters/Ds_Signature in the URL.`);
    }

    const {data} = await query(GetOrderByCodeQuery, {code}, {useAuthToken: true});
    const order = data.orderByCode;

    if (!order) {
        notFound();
    }

    // Redirect-based gateways (Redsys) send the browser here as soon as the
    // customer finishes paying, but the order is only actually marked as paid
    // once the separate, asynchronous server-to-server notification has been
    // verified and processed — which can lose this race by a second or two.
    // Rather than claim success prematurely, show a "confirming" state and
    // auto-refresh until the order has moved out of ArrangingPayment.
    const paymentPending = order.state === 'ArrangingPayment';

    return (
        <div className="container mx-auto px-4 py-16">
            {paymentPending && <meta httpEquiv="refresh" content="3" />}
            {!paymentPending && order.state !== 'Cancelled' && (
                <PurchaseTracker
                    orderCode={order.code}
                    currency={order.currencyCode}
                    value={toMajorUnits(order.totalWithTax)}
                    shipping={toMajorUnits(order.shippingWithTax)}
                    items={order.lines.map((line) => ({
                        item_id: line.productVariant.sku || line.productVariant.id,
                        item_name: line.productVariant.product.name,
                        item_variant: line.productVariant.name,
                        price: toMajorUnits(line.linePriceWithTax / Math.max(1, line.quantity)),
                        quantity: line.quantity,
                    }))}
                />
            )}
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <div className="rounded-full bg-primary p-5 shadow-lg shadow-primary/25">
                            {paymentPending ? (
                                <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" strokeWidth={3} />
                            ) : (
                                <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
                            )}
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        {paymentPending ? t('confirmingPayment') : t('orderConfirmed')}
                    </h1>
                    <p className="text-muted-foreground">
                        {paymentPending ? t('confirmingPaymentMessage') : t('thankYou')}{' '}
                        <span className="font-semibold text-foreground">{order.code}</span>
                    </p>
                    {!paymentPending && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('emailConfirmation')}
                        </p>
                    )}
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{t('orderSummary')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {order.lines.map((line) => (
                            <div key={line.id} className="flex gap-4 items-center">
                                {line.productVariant.product.featuredAsset && (
                                    <div className="flex-shrink-0">
                                        <Image
                                            src={line.productVariant.product.featuredAsset.preview}
                                            alt={line.productVariant.name}
                                            width={80}
                                            height={80}
                                            className="rounded-lg object-cover h-20 w-20 object-center"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium">{line.productVariant.product.name}</p>
                                    {line.productVariant.name !== line.productVariant.product.name && (
                                        <p className="text-sm text-muted-foreground">
                                            {line.productVariant.name}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('qty', {quantity: line.quantity})}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">
                                        <Price value={line.linePriceWithTax} currencyCode={order.currencyCode}/>
                                    </p>
                                </div>
                            </div>
                        ))}

                        <Separator/>

                        <div className="flex justify-between items-baseline font-bold text-lg">
                            <span>{t('total')}</span>
                            <span className="text-xl">
                                <Price value={order.totalWithTax} currencyCode={order.currencyCode}/>
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {order.shippingAddress && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>{t('shippingAddress')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium">{order.shippingAddress.fullName}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {order.shippingAddress.streetLine1}
                                {order.shippingAddress.streetLine2 && `, ${order.shippingAddress.streetLine2}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                                {order.shippingAddress.postalCode}
                            </p>
                            <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button nativeButton={false} render={<Link href="/" />} className="flex-1" size="lg">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {t('continueShopping')}
                    </Button>
                    <Button nativeButton={false} render={<Link href="/mi-cuenta/pedidos" />} variant="outline" className="flex-1" size="lg">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        {t('viewOrders')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
