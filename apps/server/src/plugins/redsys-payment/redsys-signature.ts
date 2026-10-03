import crypto from 'node:crypto';

/**
 * Esquema de firma de Redsys (HMAC_SHA256_V1) que usa la integración «Conexión por
 * Redirección»:
 *
 * 1. Derivar una clave propia de la operación cifrando Ds_Merchant_Order con 3DES
 *    (des-ede3-cbc, IV a cero) con la clave secreta del comercio.
 * 2. Calcular el HMAC-SHA256 del texto base64 Ds_MerchantParameters con esa clave
 *    derivada.
 *
 * Está implementado directamente con el módulo `crypto` de Node (en vez de añadir
 * una dependencia) para que la única pieza crítica de seguridad de este plugin se
 * pueda auditar entera en un archivo pequeño. El algoritmo se contrastó con la
 * implementación de referencia `redsys-easy`, mantenida activamente.
 */

function zeroPad(buf: Buffer, blockSize: number): Buffer {
    const padLength = (blockSize - (buf.length % blockSize)) % blockSize;
    return Buffer.concat([buf, Buffer.alloc(padLength, 0)]);
}

/** Deriva la clave 3DES de la operación cifrando `order` con la clave secreta del comercio. */
function deriveOperationKey(secretKeyBase64: string, order: string): Buffer {
    const keyBuf = Buffer.from(secretKeyBase64, 'base64');
    const iv = Buffer.alloc(8, 0);
    const messageBuf = Buffer.from(order, 'utf8');
    const paddedMessageBuf = zeroPad(messageBuf, 8);

    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBuf, iv);
    cipher.setAutoPadding(false);
    const encrypted = Buffer.concat([cipher.update(paddedMessageBuf), cipher.final()]);

    // Las implementaciones de referencia de Redsys recortan el resultado cifrado a la
    // longitud del mensaje (sin relleno) redondeada al tamaño de bloque.
    const maxLength = Math.ceil(messageBuf.length / 8) * 8;
    return encrypted.subarray(0, maxLength);
}

/**
 * Codifica en base64 el objeto de parámetros Ds_Merchant_* para obtener Ds_MerchantParameters.
 * Los valores undefined (campos opcionales sin definir) se omiten en vez de enviarse como null.
 */
export function encodeMerchantParameters(params: Record<string, string | undefined>): string {
    const defined = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
    return Buffer.from(JSON.stringify(defined), 'utf8').toString('base64');
}

/**
 * Decodifica un texto Ds_MerchantParameters a su objeto de parámetros.
 * Lanza un error si no es un JSON válido codificado en base64.
 */
export function decodeMerchantParameters(merchantParameters: string): Record<string, string> {
    const json = Buffer.from(merchantParameters, 'base64').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Ds_MerchantParameters did not decode to a JSON object');
    }
    return parsed as Record<string, string>;
}

/**
 * Firma un Ds_MerchantParameters en base64 para un pedido y devuelve el
 * Ds_Signature en base64 que se envía a Redsys.
 */
export function signMerchantParameters(secretKeyBase64: string, order: string, merchantParameters: string): string {
    const operationKey = deriveOperationKey(secretKeyBase64, order);
    return crypto.createHmac('sha256', operationKey).update(merchantParameters).digest('base64');
}

/**
 * Verifica un Ds_Signature recibido de Redsys (en una notificación o en la
 * redirección UrlOK/UrlKO) contra el Ds_MerchantParameters que lo acompaña.
 *
 * Se comparan los bytes decodificados de la firma (no el texto base64) porque las
 * firmas de Redsys usan el alfabeto base64 seguro para URL y las nuestras el
 * estándar; el decodificador base64 de Node acepta ambos, así que decodificar los
 * dos lados antes de comparar evita falsos desajustes. La comparación es de tiempo
 * constante para no filtrar información por tiempos de respuesta.
 */
export function verifyMerchantParametersSignature(
    secretKeyBase64: string,
    order: string,
    merchantParameters: string,
    receivedSignatureBase64: string,
): boolean {
    const expectedSignature = signMerchantParameters(secretKeyBase64, order, merchantParameters);

    let expectedBuf: Buffer;
    let receivedBuf: Buffer;
    try {
        expectedBuf = Buffer.from(expectedSignature, 'base64');
        receivedBuf = Buffer.from(receivedSignatureBase64, 'base64');
    } catch {
        return false;
    }

    if (expectedBuf.length !== receivedBuf.length || expectedBuf.length === 0) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
