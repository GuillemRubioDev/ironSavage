export interface RedsysConfig {
    merchantCode: string;
    terminal: string;
    secretKey: string;
    environment: 'test' | 'production';
    notificationUrl: string;
    storefrontUrl: string;
}

/**
 * Los campos DS_MERCHANT_* que enviamos al construir el formulario de redirección.
 *
 * Los parámetros de petición de Redsys van TODO EN MAYÚSCULAS: no es una errata.
 * Comprobado con el ejemplo de la documentación oficial de Redsys, que no coincide
 * con el formato de respuesta de abajo (`Ds_*` en mayúsculas y minúsculas).
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
 * Los campos Ds_* que leemos de una notificación o redirección. A diferencia de la
 * petición de arriba, los campos de respuesta de Redsys mezclan mayúsculas y minúsculas.
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
