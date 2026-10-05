import {CartItems} from "@/features/cart/routes/cart-items";
import {OrderSummary} from "@/features/cart/routes/order-summary";
import {PromotionCode} from "@/features/cart/routes/promotion-code";
import {getRouteLocale} from "@/platform/i18n/server";
import {getActiveCurrencyCode} from "@/features/currency/currency-server";
import {cacheLife, cacheTag} from "next/cache";
import {query} from "@/platform/vendure/api";
import {GetActiveOrderQuery} from '@/features/cart/graphql';
import {getAuthToken} from '@/platform/vendure/auth-token';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getLoyaltyProgramConfig} from '@/features/loyalty/program-config';
import {maxRedeemablePoints} from '@/features/loyalty/redemption';
import {PointsRedemption} from '@/features/loyalty/points-redemption';
import {getFreeShippingThreshold} from '@/features/cart/free-shipping';
import {freeShippingProgress} from '@/features/cart/free-shipping-progress';

export async function Cart() {
    "use cache: private"
    cacheLife('minutes');
    cacheTag('cart');

    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    // El saldo de puntos (null para invitados) y la configuración del programa se leen a
    // la vez que el pedido; si fallan, el carrito se pinta igual, sin el canje.
    const token = await getAuthToken();
    const [{data}, loyalty, config, freeShippingThreshold] = await Promise.all([
        query(GetActiveOrderQuery, {}, {
            useAuthToken: true,
            languageCode: locale,
            currencyCode,
        }),
        // Sin token no hay sesión ni puntos: no se pregunta a Vendure (con token de
        // invitado la consulta devuelve null sin coste visible).
        token ? query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true}).catch(() => null) : null,
        getLoyaltyProgramConfig().catch(() => null),
        getFreeShippingThreshold(),
    ]);
    const loyaltyAccount = loyalty?.data.loyaltyAccount ?? null;

    const activeOrder = data.activeOrder;

    if (!activeOrder || activeOrder.lines.length === 0) {
        return <CartItems activeOrder={null}/>;
    }

    // Canje ya aplicado: el servidor lo guarda como recargo negativo con este sku.
    const appliedSurcharge = activeOrder.surcharges?.find(s => s.sku === 'LOYALTY_POINTS_DISCOUNT');
    const applied = appliedSurcharge && config
        ? {points: Math.round(-appliedSurcharge.priceWithTax / config.pointValueInCents), amount: appliedSurcharge.priceWithTax}
        : null;
    const maxPoints = loyaltyAccount && config ? maxRedeemablePoints({
        balance: loyaltyAccount.balance,
        pointValueInCents: config.pointValueInCents,
        maxDiscountPerOrderCents: config.maxDiscountPerOrderCents,
        orderTotalWithTax: activeOrder.totalWithTax,
    }) : 0;
    const redemption = loyaltyAccount && config ? (
        <PointsRedemption
            balance={loyaltyAccount.balance}
            minPoints={config.minRedeemablePoints}
            maxPoints={maxPoints}
            orderTooSmall={loyaltyAccount.balance >= config.minRedeemablePoints && maxPoints < config.minRedeemablePoints}
            pointValueInCents={config.pointValueInCents}
            currencyCode={activeOrder.currencyCode}
            applied={applied}
        />
    ) : null;

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <CartItems activeOrder={activeOrder}/>

            <div className="lg:col-span-1">
                <OrderSummary activeOrder={activeOrder} redemptionSlot={redemption} freeShipping={freeShippingProgress(freeShippingThreshold, activeOrder)}/>
                <PromotionCode activeOrder={activeOrder}/>
            </div>
        </div>
    )
}
