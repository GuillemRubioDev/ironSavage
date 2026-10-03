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

    // Inicia la carga en la página (padre dinámico) y pasa la promesa al Suspense.
    const orderPromise = props.params.then(({code}) =>
        query(GetOrderDetailQuery, {code}, {useAuthToken: true, fetch: {}})
    );
    // La factura solo existe cuando el pedido está pagado: antes, myInvoiceForOrder()
    // ya devuelve null, así que aquí no hace falta comprobar el estado. Va encadenado
    // a orderPromise porque el id del pedido no se conoce hasta que se resuelve.
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
