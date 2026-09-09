import { graphql } from '@/gql';

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
