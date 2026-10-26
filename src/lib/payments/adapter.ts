export interface PaymentOrder {
    orderId: string;
    userId: string;
    amount: number; // Decimal-safe representation
    currency: string;
    productTitle: string;
}

export interface PaymentResult {
    providerPaymentId: string;
    checkoutUrl: string;
    payAddress: string;
    amountCrypto: string;
    asset: string;
    status: 'pending' | 'confirmed' | 'failed';
}

export interface ICryptoPaymentAdapter {
    createPayment(order: PaymentOrder): Promise<PaymentResult>;
    getPaymentStatus(providerPaymentId: string): Promise<string>;
    verifyWebhookSignature(rawBody: string, signature: string): boolean;
    normalizePaymentEvent(providerEvent: any): {
        providerPaymentId: string;
        orderId: string;
        status: 'confirmed' | 'failed' | 'refunded';
        amountPaid: number;
    };
}

/**
 * Sandbox / Mock Crypto Payment Adapter for MVP testing.
 * Prevents direct coupling to a specific vendor while simulating webhooks and checkouts.
 */
export class MockCryptoPaymentAdapter implements ICryptoPaymentAdapter {
    async createPayment(order: PaymentOrder): Promise<PaymentResult> {
        return {
            providerPaymentId: `pay_mock_${Math.random().toString(36).substring(7)}`,
            checkoutUrl: `https://sandbox.savannacapitals.com/pay/${order.orderId}`,
            payAddress: `0xMockCryptoWalletAddressForTestingOnly12345`,
            amountCrypto: (order.amount / 3500).toFixed(4), // Simulated exchange rate example
            asset: "USDT_POLYGON",
            status: "pending",
        };
    }

    async getPaymentStatus(providerPaymentId: string): Promise<string> {
        return "confirmed";
    }

    verifyWebhookSignature(rawBody: string, signature: string): boolean {
        // In sandbox, verify mock signature header
        return signature === "mock_secure_signature_hash";
    }

    normalizePaymentEvent(providerEvent: any) {
        return {
            providerPaymentId: providerEvent.payment_id,
            orderId: providerEvent.order_id,
            status: providerEvent.status === "SUCCESS" ? ("confirmed" as const) : ("failed" as const),
            amountPaid: providerEvent.amount,
        };
    }
}

export const paymentAdapter = new MockCryptoPaymentAdapter();