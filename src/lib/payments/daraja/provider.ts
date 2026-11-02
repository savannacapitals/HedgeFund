/**
 * M-PESA DARAJA (STK PUSH) INTEGRATION POINT, NOT ACTIVE.
 *
 * Today M-Pesa is collected through Pochi la Biashara: the customer pays, the M-Pesa SMS reaches
 * /api/webhooks/pochi, and the order is confirmed only when the code and amount match
 * (see src/lib/payments/manual/*). That is the verified path and AI Opportunities uses it.
 *
 * To add STK Push later, implement MpesaCollectionProvider below, return it from getDarajaProvider(),
 * and add a "mpesa" method to the checkout page. The rules to keep:
 *   1. Never call completeOrder() from the browser or from an unsigned request.
 *   2. Confirm only from the Daraja callback (validate source + ResultCode === 0 + CheckoutRequestID
 *      you stored) or from a server-side transaction status query, and check Amount >= order total.
 *   3. Keep consumer key/secret and passkey in server-only environment variables.
 *   4. Make the callback idempotent: completeOrder() already is.
 * Until it is implemented, getDarajaProvider() returns null and nothing here can mark an order paid.
 */
export interface StkPushRequest {
    orderId: string;
    phone: string; // 2547XXXXXXXX
    amountKes: number; // whole shillings
    reference: string; // e.g. SC-1A2B3C4D
}
export interface StkPushResult {
    checkoutRequestId: string;
    merchantRequestId: string;
}
export interface DarajaCallbackResult {
    checkoutRequestId: string;
    resultCode: number;
    mpesaReceipt?: string;
    amountPaid?: number;
}
export interface MpesaCollectionProvider {
    initiateStkPush(req: StkPushRequest): Promise<StkPushResult>;
    /** Must verify the callback really came from Safaricom before returning. Throw if it did not. */
    parseCallback(rawBody: string, headers: Headers): Promise<DarajaCallbackResult>;
    queryStatus(checkoutRequestId: string): Promise<DarajaCallbackResult>;
}

export function getDarajaProvider(): MpesaCollectionProvider | null {
    return null; // not configured on purpose
}
