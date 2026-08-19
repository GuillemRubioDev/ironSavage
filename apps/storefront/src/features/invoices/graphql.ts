import {graphql} from '@/platform/vendure/graphql';

export const GetMyInvoicesQuery = graphql(`
    query GetMyInvoices($options: InvoiceListOptions) {
        myInvoices(options: $options) {
            totalItems
            items {
                id
                formattedNumber
                issueDate
                total
                currencyCode
                hasPdf
            }
        }
    }
`);
