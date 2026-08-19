import {graphql} from '@/platform/vendure/graphql';

export const GetMyLoyaltyQuery = graphql(`
    query GetMyLoyalty($options: LoyaltyHistoryOptions) {
        loyaltyAccount {
            balance
            lifetimeEarned
            lifetimeSpent
        }
        loyaltyHistory(options: $options) {
            totalItems
            items {
                id
                createdAt
                type
                points
                description
            }
        }
    }
`);
