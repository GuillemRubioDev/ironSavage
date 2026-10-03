import { graphql } from '@/gql';

export const athleteListDocument = graphql(`
    query AthleteList($options: AthleteSearchOptions) {
        athletes(options: $options) {
            totalItems
            items {
                id
                enabled
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                }
                codes {
                    id
                    code
                    enabled
                }
                stats {
                    netRewardPoints
                    rewardedOrders
                }
            }
        }
    }
`);

export const athleteDetailDocument = graphql(`
    query AthleteDetail($id: ID!) {
        athlete(id: $id) {
            id
            createdAt
            enabled
            notes
            customerId
            customer {
                id
                firstName
                lastName
                emailAddress
                phoneNumber
            }
            codes {
                id
                code
                enabled
                discountType
                discountValue
                rewardType
                rewardValue
                promotionId
            }
            stats {
                totalRewardPoints
                revertedRewardPoints
                netRewardPoints
                rewardedOrders
            }
        }
    }
`);

export const athleteLoyaltyDocument = graphql(`
    query AthleteLoyaltyAccount($customerId: ID!) {
        customerLoyaltyAccount(customerId: $customerId) {
            id
            balance
            lifetimeEarned
            lifetimeSpent
        }
    }
`);

export const athleteRewardsDocument = graphql(`
    query AthleteRewards($athleteId: ID!, $options: AthleteListOptions) {
        athleteRewards(athleteId: $athleteId, options: $options) {
            totalItems
            items {
                id
                createdAt
                code
                orderId
                orderCode
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                }
                baseAmount
                customerDiscountAmount
                currencyCode
                rewardType
                rewardValue
                pointValueInCents
                points
                revertedPoints
                unrecoveredPoints
                status
                reversals {
                    id
                    createdAt
                    reason
                    points
                    debitedPoints
                    note
                }
            }
        }
    }
`);

export const athleteCodeOrdersDocument = graphql(`
    query AthleteCodeOrders($codeId: ID!, $options: AthleteListOptions) {
        athleteCodeOrders(codeId: $codeId, options: $options) {
            totalItems
            items {
                id
                code
                state
                orderPlacedAt
                createdAt
                totalWithTax
                currencyCode
                customer {
                    id
                    firstName
                    lastName
                }
            }
        }
    }
`);

export const athleteCustomerSearchDocument = graphql(`
    query AthleteCustomerSearch($term: String!) {
        customers(options: { filter: { _or: [{ emailAddress: { contains: $term } }, { lastName: { contains: $term } }, { firstName: { contains: $term } }] }, take: 10 }) {
            items {
                id
                firstName
                lastName
                emailAddress
            }
        }
    }
`);

export const createAthleteDocument = graphql(`
    mutation CreateAthlete($input: CreateAthleteInput!) {
        createAthlete(input: $input) {
            __typename
            ... on Athlete {
                id
            }
            ... on AthleteError {
                message
            }
        }
    }
`);

export const updateAthleteDocument = graphql(`
    mutation UpdateAthlete($id: ID!, $input: UpdateAthleteInput!) {
        updateAthlete(id: $id, input: $input) {
            __typename
            ... on Athlete {
                id
                enabled
                notes
            }
            ... on AthleteError {
                message
            }
        }
    }
`);

export const createAthleteCodeDocument = graphql(`
    mutation CreateAthleteCode($athleteId: ID!, $input: AthleteCodeInput!) {
        createAthleteCode(athleteId: $athleteId, input: $input) {
            __typename
            ... on AthleteCode {
                id
            }
            ... on AthleteError {
                message
            }
        }
    }
`);

export const updateAthleteCodeDocument = graphql(`
    mutation UpdateAthleteCode($id: ID!, $input: UpdateAthleteCodeInput!) {
        updateAthleteCode(id: $id, input: $input) {
            __typename
            ... on AthleteCode {
                id
            }
            ... on AthleteError {
                message
            }
        }
    }
`);

export const revertAthleteRewardDocument = graphql(`
    mutation RevertAthleteReward($id: ID!, $note: String!) {
        revertAthleteReward(id: $id, note: $note) {
            __typename
            ... on AthleteReward {
                id
                status
            }
            ... on AthleteError {
                message
            }
        }
    }
`);

// Reutiliza la mutación de ajuste manual de LoyaltyPlugin en vez de crear una propia
// de atletas: los puntos de los atletas están en el mismo libro de movimientos.
export const adjustAthletePointsDocument = graphql(`
    mutation AdjustAthletePoints($input: AdjustLoyaltyPointsInput!) {
        adjustLoyaltyPoints(input: $input) {
            id
        }
    }
`);

export const removeAthleteRoleDocument = graphql(`
    mutation RemoveAthleteRole($id: ID!) {
        removeAthleteRole(id: $id)
    }
`);

export const athleteByCustomerDocument = graphql(`
    query AthleteByCustomer($customerId: ID!) {
        athleteByCustomer(customerId: $customerId) {
            id
            enabled
            codes {
                id
                code
                enabled
            }
            stats {
                netRewardPoints
                rewardedOrders
            }
        }
    }
`);

export const athleteCustomerByIdDocument = graphql(`
    query AthleteCustomerById($id: ID!) {
        customer(id: $id) {
            id
            firstName
            lastName
            emailAddress
        }
    }
`);
