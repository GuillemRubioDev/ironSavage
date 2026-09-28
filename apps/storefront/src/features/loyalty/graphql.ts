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

// Athlete panel — only ever returns the signed-in customer's own data
// (Owner-scoped on the server) and never the buyers behind each reward.
export const GetMyAthleteProfileQuery = graphql(`
    query GetMyAthleteProfile {
        myAthleteProfile {
            enabled
            codes {
                code
                enabled
                discountType
                discountValue
                rewardType
                rewardValue
            }
            totalRewardPoints
            revertedRewardPoints
            netRewardPoints
            rewardedOrders
        }
    }
`);

export const GetMyAthleteRewardsQuery = graphql(`
    query GetMyAthleteRewards($options: AthleteListOptions) {
        myAthleteRewards(options: $options) {
            totalItems
            items {
                id
                createdAt
                code
                orderCode
                baseAmount
                currencyCode
                points
                revertedPoints
                status
            }
        }
    }
`);
