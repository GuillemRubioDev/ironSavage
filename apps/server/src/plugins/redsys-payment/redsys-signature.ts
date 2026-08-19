import crypto from 'node:crypto';

/**
 * Redsys' signature scheme (HMAC_SHA256_V1), used by the "Conexión por Redirección"
 * integration:
 *
 * 1. Derive an operation-specific key by encrypting Ds_Merchant_Order with 3DES
 *    (des-ede3-cbc, zero IV) using the merchant secret key.
 * 2. Compute HMAC-SHA256 of the base64 Ds_MerchantParameters string using that
 *    derived key.
 *
 * This is re-implemented directly against Node's `crypto` module (rather than
 * pulling in a dependency) so the one security-critical piece of this plugin is
 * fully auditable in one small file. The algorithm was cross-checked against the
 * actively maintained `redsys-easy` reference implementation.
 */

function zeroPad(buf: Buffer, blockSize: number): Buffer {
    const padLength = (blockSize - (buf.length % blockSize)) % blockSize;
    return Buffer.concat([buf, Buffer.alloc(padLength, 0)]);
}

/** Derives the per-operation 3DES key by encrypting `order` with the merchant secret key. */
function deriveOperationKey(secretKeyBase64: string, order: string): Buffer {
    const keyBuf = Buffer.from(secretKeyBase64, 'base64');
    const iv = Buffer.alloc(8, 0);
    const messageBuf = Buffer.from(order, 'utf8');
    const paddedMessageBuf = zeroPad(messageBuf, 8);

    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBuf, iv);
    cipher.setAutoPadding(false);
    const encrypted = Buffer.concat([cipher.update(paddedMessageBuf), cipher.final()]);

    // Redsys' own reference implementations truncate the encrypted output back
    // down to the (unpadded) message length rounded up to the block size.
    const maxLength = Math.ceil(messageBuf.length / 8) * 8;
    return encrypted.subarray(0, maxLength);
}

/**
 * Base64-encodes the Ds_Merchant_* parameters object into the Ds_MerchantParameters string.
 * Undefined values (unset optional fields) are omitted rather than serialized as null.
 */
export function encodeMerchantParameters(params: Record<string, string | undefined>): string {
    const defined = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
    return Buffer.from(JSON.stringify(defined), 'utf8').toString('base64');
}

/**
 * Decodes a Ds_MerchantParameters string back into its parameters object.
 * Throws if the value isn't valid base64-encoded JSON.
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
 * Signs a base64-encoded Ds_MerchantParameters string for a given order, returning
 * the base64 Ds_Signature to send to Redsys.
 */
export function signMerchantParameters(secretKeyBase64: string, order: string, merchantParameters: string): string {
    const operationKey = deriveOperationKey(secretKeyBase64, order);
    return crypto.createHmac('sha256', operationKey).update(merchantParameters).digest('base64');
}

/**
 * Verifies a Ds_Signature received from Redsys (in a notification, or on the
 * UrlOK/UrlKO redirect) against the accompanying Ds_MerchantParameters.
 *
 * Comparison is done on the decoded signature bytes (not the base64 text) because
 * Redsys' outbound signatures use a URL-safe base64 alphabet while ours are
 * computed as standard base64 — Node's base64 decoder accepts both alphabets
 * interchangeably, so decoding both sides before comparing avoids a false mismatch.
 * The comparison itself is constant-time to avoid leaking timing information.
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
