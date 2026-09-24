import { gql } from 'graphql-tag';

const commonTypes = gql`
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
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    input AdminInvoiceListOptions {
        skip: Int
        take: Int
        "Matches against the order code or the formatted invoice number (e.g. A-000123)."
        search: String
    }

    extend type Query {
        invoices(options: AdminInvoiceListOptions): InvoiceList!
        invoice(id: ID!): Invoice
        invoiceForOrder(orderId: ID!): Invoice
    }

    extend type Mutation {
        "Re-sends an already-generated invoice by email — to any address, not necessarily the customer's own."
        resendInvoice(invoiceId: ID!, emailAddress: String!): Boolean!
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    extend type Query {
        "The active customer's own invoices. Never accepts a customer id from the client — always scoped to the signed-in session."
        myInvoices(options: InvoiceListOptions): InvoiceList!
        "The invoice for one of the active customer's own orders (null before the order is paid, or if it belongs to someone else)."
        myInvoiceForOrder(orderId: ID!): Invoice
    }
`;
