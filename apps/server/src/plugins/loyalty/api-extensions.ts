import { gql } from 'graphql-tag';

const commonTypes = gql`
    type LoyaltyAccount {
        id: ID!
        balance: Int!
        lifetimeEarned: Int!
        lifetimeSpent: Int!
    }

    type LoyaltyTransaction {
        id: ID!
        createdAt: DateTime!
        type: String!
        points: Int!
        orderId: ID
        description: String!
    }

    type LoyaltyTransactionList {
        items: [LoyaltyTransaction!]!
        totalItems: Int!
    }

    input LoyaltyHistoryOptions {
        skip: Int
        take: Int
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    type LoyaltyProgramConfig {
        "Points earned per whole euro spent."
        pointsPerEuro: Float!
        "Monetary value of a single point, in cents, when redeemed."
        pointValueInCents: Int!
        "Minimum number of points that can be redeemed in one go."
        minRedeemablePoints: Int!
        "Maximum discount (in cents) that points can apply to a single order."
        maxDiscountPerOrderCents: Int!
    }

    type LoyaltyRedemption {
        discountCents: Int!
        balance: Int!
    }

    type LoyaltyRedemptionError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union RedeemLoyaltyPointsResult = LoyaltyRedemption | LoyaltyRedemptionError

    extend type Query {
        "The active customer's own loyalty points balance. Null if not signed in or no account yet."
        loyaltyAccount: LoyaltyAccount
        "The active customer's own points history."
        loyaltyHistory(options: LoyaltyHistoryOptions): LoyaltyTransactionList!
        "Store-configured loyalty program rules, for displaying redemption options at checkout."
        loyaltyProgramConfig: LoyaltyProgramConfig!
    }

    extend type Mutation {
        "Redeems points as a discount on the active order. The discount is never applied automatically — this must be called explicitly."
        redeemLoyaltyPoints(points: Int!): RedeemLoyaltyPointsResult!
        "Reverses an active (not yet paid) redemption on the active order, restoring the points."
        cancelLoyaltyPointsRedemption: Boolean!
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    extend type Query {
        customerLoyaltyAccount(customerId: ID!): LoyaltyAccount
        customerLoyaltyHistory(customerId: ID!, options: LoyaltyHistoryOptions): LoyaltyTransactionList!
    }

    input AdjustLoyaltyPointsInput {
        customerId: ID!
        "Positive to credit points, negative to debit."
        points: Int!
        description: String!
    }

    extend type Mutation {
        "Manual admin correction of a customer's points balance."
        adjustLoyaltyPoints(input: AdjustLoyaltyPointsInput!): LoyaltyTransaction!
    }
`;
