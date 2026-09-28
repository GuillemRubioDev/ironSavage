import { graphql } from '@/gql';

export const customerAccountStatusDocument = graphql(`
    query CustomerAccountStatus($customerId: ID!) {
        customerAccountStatus(customerId: $customerId) {
            customerId
            emailAddress
            hasUser
            verified
            hasPassword
            lastLogin
        }
    }
`);

export const sendCustomerVerificationEmailDocument = graphql(`
    mutation SendCustomerVerificationEmail($customerId: ID!) {
        sendCustomerVerificationEmail(customerId: $customerId) {
            __typename
            ... on CustomerAccountError {
                message
            }
        }
    }
`);

export const verifyCustomerAccountManuallyDocument = graphql(`
    mutation VerifyCustomerAccountManually($customerId: ID!, $password: String) {
        verifyCustomerAccountManually(customerId: $customerId, password: $password) {
            __typename
            ... on CustomerAccountStatus {
                passwordSetupEmailSent
            }
            ... on CustomerAccountError {
                message
            }
        }
    }
`);

export const setCustomerPasswordDocument = graphql(`
    mutation SetCustomerPassword($customerId: ID!, $password: String!) {
        setCustomerPassword(customerId: $customerId, password: $password) {
            __typename
            ... on CustomerAccountError {
                message
            }
        }
    }
`);

export const sendCustomerPasswordResetEmailDocument = graphql(`
    mutation SendCustomerPasswordResetEmail($customerId: ID!) {
        sendCustomerPasswordResetEmail(customerId: $customerId) {
            __typename
            ... on CustomerAccountError {
                message
            }
        }
    }
`);
