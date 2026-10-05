import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {CSSProperties} from 'react';
import {FileText, Loader2, Package, ShoppingBag, ClipboardList, Star, UserRound} from 'lucide-react';
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
import {getLoyaltyProgramConfig} from '@/features/loyalty/program-config';
import {getMyAthleteProfile} from '@/features/loyalty/athlete';

/** Confeti rojo y blanco una sola vez (solo CSS; con "reducir movimiento" no aparece). */
function Confetti() {
    const pieces = Array.from({length: 18}, (_, i) => i);
    return (
        <div aria-hidden="true" className="confetti pointer-events-none absolute inset-x-0 top-0 h-0">
            {pieces.map((i) => (
                <span
                    key={i}
                    className={i % 3 === 0 ? 'bg-white' : 'bg-primary-solid'}
                    style={{left: `${5 + ((i * 53) % 90)}%`, '--dx': `${((i * 37) % 80) - 40}px`, '--rot': `${180 + ((i * 61) % 360)}deg`, '--delay': `${(i * 45) % 400}ms`} as CSSProperties}
                />
            ))}
        </div>
    );
}

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

    // La redirección de Redsys a DS_MERCHANT_URLOK trae los mismos
    // Ds_SignatureVersion/Ds_MerchantParameters/Ds_Signature firmados que envía de
    // servidor a servidor a la notificación asíncrona. Procesarlos también aquí (lo
    // mejor posible: si faltan, no son válidos o ya se procesaron, no pasa nada; ver
    // confirmRedsysPayment) permite confirmar el pago en el primer render en vez de
    // solo con la consulta periódica de abajo, que dependía por completo de que esa
    // notificación ya hubiera llegado. Si REDSYS_NOTIFICATION_URL no es accesible
    // (p. ej. pruebas en localhost sin túnel público) eso nunca ocurre, y el cliente
    // se quedaba indefinidamente en «Confirmando tu pago...» aunque la tarjeta sí se
    // hubiera cobrado.
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
                // Se anota en el log (sin lanzar error): la consulta periódica de abajo
                // sigue cubriéndolo, y un fallo o retraso aquí solo significa que la
                // notificación asíncrona tiene que llegar antes. Pero descartarlo en
                // silencio hacía imposible distinguir un fallo real de datos inválidos de
                // que Redsys simplemente no enviara estos parámetros; ver la rama `else`.
                console.error(`[Redsys] confirmRedsysPayment for order ${code} returned an error: ${outcome.message}`);
            }
        } catch (err) {
            console.error(`[Redsys] confirmRedsysPayment request failed for order ${code}:`, err);
        }
    } else {
        // Es lo normal al entrar a «ver mi pedido» (sin parámetros de Redsys). Pero si
        // el pedido sigue en ArrangingPayment y el cliente *sí* vuelve de Redsys, esta
        // línea indica que la redirección de Redsys no trajo esta vez
        // Ds_MerchantParameters/Ds_Signature (cosa de Redsys o del entorno, no algo que
        // esta página pueda arreglar): la confirmación depende entonces por completo de
        // que la notificación asíncrona (REDSYS_NOTIFICATION_URL) sea accesible.
        console.log(`[Redsys] order-confirmation for ${code} had no Ds_MerchantParameters/Ds_Signature in the URL.`);
    }

    const {data} = await query(GetOrderByCodeQuery, {code}, {useAuthToken: true});
    const order = data.orderByCode;

    if (!order) {
        notFound();
    }

    // Las pasarelas por redirección (Redsys) mandan aquí al navegador en cuanto el
    // cliente termina de pagar, pero el pedido solo queda marcado como pagado cuando
    // se verifica y procesa la notificación asíncrona de servidor a servidor, que puede
    // llegar uno o dos segundos tarde. En vez de dar el pago por bueno antes de tiempo,
    // se muestra «confirmando» y se refresca solo hasta que el pedido sale de
    // ArrangingPayment.
    const paymentPending = order.state === 'ArrangingPayment';
    // Solo se celebra (confeti, puntos, tarjetas) con el pago confirmado y el pedido vivo.
    const celebrate = !paymentPending && order.state !== 'Cancelled';
    // Estimación con la fórmula del servidor (floor(total en euros × puntos por euro)).
    // Los atletas activos no suman puntos con sus compras (política del servidor,
    // athlete.service canEarnForOrder): a ellos no se les promete ninguno.
    const [loyalty, athlete] = celebrate
        ? await Promise.all([getLoyaltyProgramConfig().catch(() => null), getMyAthleteProfile().catch(() => null)])
        : [null, null];
    const points = loyalty && !athlete?.enabled ? Math.floor((order.totalWithTax / 100) * loyalty.pointsPerEuro) : 0;

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
                <section className="relative mb-8 overflow-hidden rounded-xl bg-brand px-6 py-12 text-center text-brand-fg">
                    {celebrate && <Confetti />}
                    <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-primary-solid">
                        {paymentPending ? (
                            <Loader2 className="size-10 animate-spin" strokeWidth={3} aria-hidden="true" />
                        ) : (
                            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path className="animate-check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                        )}
                    </div>
                    <h1 className="text-5xl md:text-6xl">{paymentPending ? t('confirmingPayment') : t('orderConfirmed')}</h1>
                    <p className="mt-3 text-brand-muted">
                        {paymentPending ? t('confirmingPaymentMessage') : t('thankYou')}{' '}
                        <span className="font-mono font-semibold text-brand-fg">{order.code}</span>
                    </p>
                    {celebrate && points > 0 && (
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-line px-4 py-1.5 text-sm">
                            <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
                            {t('pointsEarned', {points})}
                        </p>
                    )}
                </section>

                {celebrate && (
                    <div className="mb-8 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border border-border p-5">
                            <Package className="mb-3 size-6 text-primary-solid" aria-hidden="true" />
                            <h2 className="font-display text-xl font-extrabold uppercase italic">{t('nextTitle')}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('nextText')}</p>
                        </div>
                        <div className="rounded-lg border border-border p-5">
                            <FileText className="mb-3 size-6 text-primary-solid" aria-hidden="true" />
                            <h2 className="font-display text-xl font-extrabold uppercase italic">{t('invoiceTitle')}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('invoiceText')}</p>
                            <Link href={`/mi-cuenta/pedidos/${order.code}`} className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">{t('viewOrder')}</Link>
                        </div>
                        <div className="rounded-lg border border-border p-5">
                            <UserRound className="mb-3 size-6 text-primary-solid" aria-hidden="true" />
                            <h2 className="font-display text-xl font-extrabold uppercase italic">{t('accountTitle')}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('accountText')}</p>
                            <Link href="/mi-cuenta/puntos" className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">{t('accountTitle')}</Link>
                        </div>
                    </div>
                )}

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
                    <Button nativeButton={false} render={<Link href="/productos" />} className="flex-1" size="lg">
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
