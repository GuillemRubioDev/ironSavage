import { gql } from 'graphql-tag';

const commonTypes = gql`
    enum AthleteDiscountType {
        PERCENTAGE
        FIXED_AMOUNT
    }

    enum AthleteRewardType {
        PERCENTAGE
        FIXED_POINTS
    }

    enum AthleteRewardStatus {
        ACTIVE
        PARTIALLY_REVERTED
        REVERTED
    }

    input AthleteListOptions {
        skip: Int
        take: Int
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    "The terms of one of the signed-in athlete's own codes."
    type MyAthleteCode {
        code: String!
        enabled: Boolean!
        discountType: AthleteDiscountType!
        "Percentage, or an amount in minor units for FIXED_AMOUNT."
        discountValue: Float!
        rewardType: AthleteRewardType!
        "Percentage, or a number of points for FIXED_POINTS."
        rewardValue: Float!
    }

    type MyAthleteProfile {
        enabled: Boolean!
        codes: [MyAthleteCode!]!
        totalRewardPoints: Int!
        revertedRewardPoints: Int!
        netRewardPoints: Int!
        rewardedOrders: Int!
    }

    "A reward seen by the athlete: deliberately carries no data about the customer who placed the order."
    type MyAthleteReward {
        id: ID!
        createdAt: DateTime!
        code: String!
        orderCode: String!
        baseAmount: Money!
        currencyCode: CurrencyCode!
        points: Int!
        revertedPoints: Int!
        status: AthleteRewardStatus!
    }

    type MyAthleteRewardList {
        items: [MyAthleteReward!]!
        totalItems: Int!
    }

    extend type Query {
        "The signed-in customer's athlete profile, or null if they aren't an athlete."
        myAthleteProfile: MyAthleteProfile
        "Rewards the signed-in athlete earned from orders placed with their codes."
        myAthleteRewards(options: AthleteListOptions): MyAthleteRewardList!
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    type AthleteCode {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        code: String!
        enabled: Boolean!
        discountType: AthleteDiscountType!
        discountValue: Float!
        rewardType: AthleteRewardType!
        rewardValue: Float!
        "The Vendure Promotion that applies this code's discount at checkout."
        promotionId: ID
    }

    type AthleteStats {
        totalRewardPoints: Int!
        revertedRewardPoints: Int!
        netRewardPoints: Int!
        rewardedOrders: Int!
    }

    type Athlete {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        customerId: ID!
        customer: Customer!
        enabled: Boolean!
        notes: String
        codes: [AthleteCode!]!
        stats: AthleteStats!
    }

    type AthleteList {
        items: [Athlete!]!
        totalItems: Int!
    }

    type AthleteRewardReversal {
        id: ID!
        createdAt: DateTime!
        reason: String!
        refundId: ID
        points: Int!
        debitedPoints: Int!
        note: String
    }

    type AthleteReward {
        id: ID!
        createdAt: DateTime!
        athleteId: ID!
        athleteCodeId: ID
        code: String!
        orderId: ID!
        orderCode: String!
        customerId: ID
        customer: Customer
        baseAmount: Money!
        customerDiscountAmount: Money!
        currencyCode: CurrencyCode!
        discountType: AthleteDiscountType!
        discountValue: Float!
        rewardType: AthleteRewardType!
        rewardValue: Float!
        pointValueInCents: Int!
        points: Int!
        revertedPoints: Int!
        unrecoveredPoints: Int!
        status: AthleteRewardStatus!
        loyaltyTransactionId: ID
        reversals: [AthleteRewardReversal!]!
    }

    type AthleteRewardList {
        items: [AthleteReward!]!
        totalItems: Int!
    }

    type AthleteError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union AthleteResult = Athlete | AthleteError
    union AthleteCodeResult = AthleteCode | AthleteError
    union AthleteRewardResult = AthleteReward | AthleteError

    input AthleteSearchOptions {
        skip: Int
        take: Int
        "Matches first/last name, email or code."
        term: String
    }

    input AthleteCodeInput {
        code: String!
        enabled: Boolean
        discountType: AthleteDiscountType!
        discountValue: Float!
        rewardType: AthleteRewardType!
        rewardValue: Float!
    }

    input UpdateAthleteCodeInput {
        code: String
        enabled: Boolean
        discountType: AthleteDiscountType
        discountValue: Float
        rewardType: AthleteRewardType
        rewardValue: Float
    }

    input NewAthleteCustomerInput {
        firstName: String!
        lastName: String!
        emailAddress: String!
        phoneNumber: String
    }

    input CreateAthleteInput {
        "Convert an existing customer into an athlete..."
        customerId: ID
        "...or create a new customer for them."
        customer: NewAthleteCustomerInput
        enabled: Boolean
        notes: String
        code: AthleteCodeInput
    }

    input UpdateAthleteInput {
        enabled: Boolean
        notes: String
    }

    extend type Query {
        athletes(options: AthleteSearchOptions): AthleteList!
        athlete(id: ID!): Athlete
        athleteByCustomer(customerId: ID!): Athlete
        athleteRewards(athleteId: ID!, options: AthleteListOptions): AthleteRewardList!
        "Every order an athlete code was applied to, whether or not it produced a reward."
        athleteCodeOrders(codeId: ID!, options: AthleteListOptions): OrderList!
    }

    extend type Mutation {
        createAthlete(input: CreateAthleteInput!): AthleteResult!
        updateAthlete(id: ID!, input: UpdateAthleteInput!): AthleteResult!
        createAthleteCode(athleteId: ID!, input: AthleteCodeInput!): AthleteCodeResult!
        "Changes only affect future orders; rewards already granted keep their snapshot."
        updateAthleteCode(id: ID!, input: UpdateAthleteCodeInput!): AthleteCodeResult!
        "Annuls whatever part of a reward hasn't been reverted yet, debiting the athlete's points."
        revertAthleteReward(id: ID!, note: String!): AthleteRewardResult!
        "Removes the athlete role (the customer stays a regular customer; points and reward history are kept). Its codes stop working."
        removeAthleteRole(id: ID!): Boolean!
    }
`;
