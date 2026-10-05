/**
 * Los errores de Vendure traen un `message` en inglés ("Verification token not
 * recognized"). La tienda no lo enseña: traduce el `errorCode` con estas claves del
 * espacio de mensajes ServerErrors. Un código sin clave cae en el mensaje genérico.
 */
const KEYS: Record<string, string> = {
    VERIFICATION_TOKEN_INVALID_ERROR: 'verificationTokenInvalid',
    VERIFICATION_TOKEN_EXPIRED_ERROR: 'verificationTokenExpired',
    PASSWORD_RESET_TOKEN_INVALID_ERROR: 'passwordResetTokenInvalid',
    PASSWORD_RESET_TOKEN_EXPIRED_ERROR: 'passwordResetTokenExpired',
    IDENTIFIER_CHANGE_TOKEN_INVALID_ERROR: 'emailChangeTokenInvalid',
    IDENTIFIER_CHANGE_TOKEN_EXPIRED_ERROR: 'emailChangeTokenExpired',
    PASSWORD_ALREADY_SET_ERROR: 'passwordAlreadySet',
    PASSWORD_VALIDATION_ERROR: 'passwordValidation',
    INVALID_CREDENTIALS_ERROR: 'invalidCredentials',
    NOT_VERIFIED_ERROR: 'notVerified',
    EMAIL_ADDRESS_CONFLICT_ERROR: 'emailAddressConflict',
    INSUFFICIENT_STOCK_ERROR: 'insufficientStock',
    NEGATIVE_QUANTITY_ERROR: 'negativeQuantity',
    ORDER_LIMIT_ERROR: 'orderLimit',
    ORDER_MODIFICATION_ERROR: 'orderModification',
    NO_ACTIVE_ORDER_ERROR: 'noActiveOrder',
    INELIGIBLE_SHIPPING_METHOD_ERROR: 'ineligibleShippingMethod',
    INELIGIBLE_PAYMENT_METHOD_ERROR: 'ineligiblePaymentMethod',
    PAYMENT_DECLINED_ERROR: 'paymentDeclined',
    PAYMENT_FAILED_ERROR: 'paymentFailed',
};

/** Clave de ServerErrors para un errorCode de Vendure ('generic' si no se conoce). */
export function serverErrorKey(errorCode: string | null | undefined): string {
    return (errorCode && KEYS[errorCode]) || 'generic';
}
