import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
    type InvoiceLine {
        id: ID!
        productName: String!
        sku: String!
        quantity: Int!
        unitPrice: Int!
        taxRate: Float!
        taxAmount: Int!
        lineTotal: Int!
    }

    type Invoice {
        id: ID!
        createdAt: DateTime!
        orderId: ID!
        orderCode: String!
        customerId: ID!
        series: String!
        number: Int!
        "Human-readable number, e.g. A-000123."
        formattedNumber: String!
        issueDate: DateTime!
        subtotal: Int!
        tax: Int!
        total: Int!
        currencyCode: String!
        status: String!
        "Whether a PDF has been generated for this invoice yet."
        hasPdf: Boolean!
        lines: [InvoiceLine!]!
    }

    type InvoiceList {
        items: [Invoice!]!
        totalItems: Int!
    }

    input InvoiceListOptions {
        skip: Int
        take: Int
        "Matches against the order code or the formatted invoice number (e.g. A-000123)."
        search: String
    }

    extend type Query {
        invoices(options: InvoiceListOptions): InvoiceList!
        invoice(id: ID!): Invoice
        invoiceForOrder(orderId: ID!): Invoice
    }
`;
