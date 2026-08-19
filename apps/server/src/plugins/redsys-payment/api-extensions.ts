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

    extend type Mutation {
        "Builds a signed Redsys redirect form for the active order's current total."
        createRedsysPaymentForm: RedsysPaymentFormResult!
    }
`;
