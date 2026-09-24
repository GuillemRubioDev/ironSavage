import { gql } from 'graphql-tag';

export const shopApiExtensions = gql`
    extend enum ErrorCode {
        REDSYS_PAYMENT_ERROR
    }

    type RedsysPaymentForm {
        """
        The Redsys "Conexión por Redirección" endpoint the storefront must POST the
        other three fields to, as an auto-submitting form.
        """
        url: String!
        signatureVersion: String!
        merchantParameters: String!
        signature: String!
    }

    type RedsysPaymentFormError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union RedsysPaymentFormResult = RedsysPaymentForm | RedsysPaymentFormError

    input ConfirmRedsysPaymentInput {
        signatureVersion: String
        merchantParameters: String!
        signature: String!
    }

    type RedsysConfirmation {
        orderCode: String!
        alreadyProcessed: Boolean!
    }

    type RedsysConfirmationError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union RedsysConfirmationResult = RedsysConfirmation | RedsysConfirmationError

    extend type Mutation {
        "Builds a signed Redsys redirect form for the active order's current total."
        createRedsysPaymentForm: RedsysPaymentFormResult!
        """
        Processes the signed Ds_SignatureVersion/Ds_MerchantParameters/Ds_Signature
        the customer's browser was redirected back with after paying on Redsys'
        hosted page — the same signed payload Redsys also sends server-to-server to
        the async notification endpoint, just delivered via the browser instead.
        Lets the order-confirmation page confirm payment immediately instead of
        only via polling while waiting for that separate notification to arrive.
        Safe to call with anything: an invalid/forged signature is rejected exactly
        like the notification endpoint rejects one, and a signature Redsys never
        actually issued (or a resubmit of one already processed) is a no-op.
        """
        confirmRedsysPayment(input: ConfirmRedsysPaymentInput!): RedsysConfirmationResult!
    }
`;
