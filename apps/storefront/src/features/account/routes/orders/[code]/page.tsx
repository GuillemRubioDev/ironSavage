import type {Metadata} from 'next';
import {Suspense} from 'react';
import {query} from '@/platform/vendure/api';
import {GetInvoiceForOrderQuery, GetOrderDetailQuery} from '@/features/account/graphql';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {OrderDetail} from './order-detail';

type OrderDetailPageProps = PageProps<'/[locale]/mi-cuenta/pedidos/[code]'>;

export async function generateMetadata({params}: OrderDetailPageProps): Promise<Metadata> {
    const {code} = await params;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {
        title: t('order', {code}),
    };
}

export default async function OrderDetailPage(props: OrderDetailPageProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Common'});

    // Start the fetch in the page (dynamic parent) and pass promise into Suspense.
    const orderPromise = props.params.then(({code}) =>
        query(GetOrderDetailQuery, {code}, {useAuthToken: true, fetch: {}})
    );
    // The invoice only exists once the order is paid — myInvoiceForOrder()
    // itself returns null before then, so no separate state check is needed
    // here. Chained off orderPromise since the order's id isn't known until
    // that resolves.
    const invoicePromise = orderPromise.then(({data}) =>
        data.orderByCode
            ? query(GetInvoiceForOrderQuery, {orderId: data.orderByCode.id}, {useAuthToken: true, fetch: {}})
            : null
    );

    return (
        <Suspense fallback={<div className="p-8 text-center">{t('loading')}</div>}>
            <OrderDetail orderPromise={orderPromise} invoicePromise={invoicePromise} />
        </Suspense>
    );
}
