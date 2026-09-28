import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
    type CustomerAccountStatus {
        customerId: ID!
        emailAddress: String!
        "False for guest customers: they have no login yet."
        hasUser: Boolean!
        verified: Boolean!
        "False for accounts created without a password (they choose it from the activation email)."
        hasPassword: Boolean!
        lastLogin: DateTime
        "Set by verifyCustomerAccountManually when the customer was emailed a link to create their password."
        passwordSetupEmailSent: Boolean
    }

    type CustomerAccountError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union CustomerAccountResult = CustomerAccountStatus | CustomerAccountError

    extend type Query {
        customerAccountStatus(customerId: ID!): CustomerAccountStatus
    }

    extend type Mutation {
        "Sends a new activation email (new token). Creates the login first for guest customers."
        sendCustomerVerificationEmail(customerId: ID!): CustomerAccountResult!
        """
        Verifies the account directly (creates the login for guest customers). Optionally sets its password;
        if none is given and the account has none, the customer is emailed a link to create it.
        """
        verifyCustomerAccountManually(customerId: ID!, password: String): CustomerAccountResult!
        "Sets/changes the customer's password (e.g. a temporary one). Signs them out of all sessions."
        setCustomerPassword(customerId: ID!, password: String!): CustomerAccountResult!
        "Sends the standard password reset email (also verifies the account once completed)."
        sendCustomerPasswordResetEmail(customerId: ID!): CustomerAccountResult!
    }
`;
