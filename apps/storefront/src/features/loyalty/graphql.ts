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

// Reglas públicas del programa de puntos (las mismas que aplica el servidor).
export const GetLoyaltyProgramConfigQuery = graphql(`
    query GetLoyaltyProgramConfig {
        loyaltyProgramConfig {
            pointsPerEuro
            pointValueInCents
            minRedeemablePoints
            maxDiscountPerOrderCents
        }
    }
`);

// Canje de puntos sobre el pedido activo (el servidor valida mínimo, tope, total y saldo).
export const RedeemLoyaltyPointsMutation = graphql(`
    mutation RedeemLoyaltyPoints($points: Int!) {
        redeemLoyaltyPoints(points: $points) {
            __typename
            ... on LoyaltyRedemption {
                discountCents
                balance
            }
            ... on LoyaltyRedemptionError {
                errorCode
                message
            }
        }
    }
`);

export const CancelLoyaltyRedemptionMutation = graphql(`
    mutation CancelLoyaltyRedemption {
        cancelLoyaltyPointsRedemption
    }
`);
