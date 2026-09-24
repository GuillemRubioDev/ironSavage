import { graphql } from '@/gql';

export const adminInvoiceForOrderDocument = graphql(`
    query AdminInvoiceForOrder($orderId: ID!) {
        invoiceForOrder(orderId: $orderId) {
            id
            formattedNumber
            issueDate
            hasPdf
        }
    }
`);

export const resendInvoiceDocument = graphql(`
    mutation ResendInvoice($invoiceId: ID!, $emailAddress: String!) {
        resendInvoice(invoiceId: $invoiceId, emailAddress: $emailAddress)
    }
`);

export const adminInvoiceListDocument = graphql(`
    query AdminInvoiceList($options: AdminInvoiceListOptions) {
        invoices(options: $options) {
            items {
                id
                formattedNumber
                orderId
                orderCode
                issueDate
                total
                currencyCode
                hasPdf
            }
            totalItems
        }
    }
`);
