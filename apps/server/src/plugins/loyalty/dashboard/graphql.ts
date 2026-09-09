import { graphql } from '@/gql';

export const searchCustomersDocument = graphql(`
    query LoyaltySearchCustomers($term: String!) {
        customers(options: { filter: { _or: [{ emailAddress: { contains: $term } }, { lastName: { contains: $term } }, { firstName: { contains: $term } }] }, take: 10 }) {
            totalItems
            items {
                id
                firstName
                lastName
                emailAddress
            }
        }
    }
`);

export const customerLoyaltyDocument = graphql(`
    query CustomerLoyaltyDetail($customerId: ID!, $options: LoyaltyHistoryOptions) {
        customerLoyaltyAccount(customerId: $customerId) {
            id
            balance
            lifetimeEarned
            lifetimeSpent
        }
        customerLoyaltyHistory(customerId: $customerId, options: $options) {
            totalItems
            items {
                id
                createdAt
                type
                points
                orderId
                description
            }
        }
    }
`);

export const adjustLoyaltyPointsDocument = graphql(`
    mutation AdjustLoyaltyPoints($input: AdjustLoyaltyPointsInput!) {
        adjustLoyaltyPoints(input: $input) {
            id
            points
            type
            description
        }
    }
`);
