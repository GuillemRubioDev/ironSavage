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

// Panel de atleta: solo devuelve los datos del propio cliente con sesión iniciada
// (limitado a Owner en el servidor) y nunca quién compró detrás de cada recompensa.
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
