export interface RedsysConfig {
    merchantCode: string;
    terminal: string;
    secretKey: string;
    environment: 'test' | 'production';
    notificationUrl: string;
    storefrontUrl: string;
}

/**
 * The subset of DS_MERCHANT_* fields we send when building the redirect form.
 *
 * Redsys' outgoing request parameters are ALL UPPERCASE — this is not a typo.
 * Confirmed against Redsys' own official documentation example, which is
 * asymmetric with the response format below (mixed-case `Ds_*`).
 */
export interface RedsysMerchantParameters {
    DS_MERCHANT_AMOUNT: string;
    DS_MERCHANT_ORDER: string;
    DS_MERCHANT_MERCHANTCODE: string;
    DS_MERCHANT_CURRENCY: string;
    DS_MERCHANT_TRANSACTIONTYPE: string;
    DS_MERCHANT_TERMINAL: string;
    DS_MERCHANT_MERCHANTURL: string;
    DS_MERCHANT_URLOK: string;
    DS_MERCHANT_URLKO: string;
    [key: string]: string | undefined;
}

/**
 * The subset of Ds_* fields we read back from a notification/redirect.
 * Unlike the request above, Redsys' response fields are mixed-case.
 */
export interface RedsysResponseParameters {
    Ds_Order: string;
    Ds_Response: string;
    Ds_Amount?: string;
    Ds_Currency?: string;
    Ds_AuthorisationCode?: string;
    Ds_TransactionType?: string;
    Ds_SecurePayment?: string;
    [key: string]: string | undefined;
}

export interface RedsysNotificationBody {
    Ds_SignatureVersion?: string;
    Ds_MerchantParameters?: string;
    Ds_Signature?: string;
}
