import { NextResponse } from "next/server";
import { paymentAdapter } from "@/lib/payments/adapter";

export async function POST(request: Request) {
    try {
        const signature = request.headers.get("x-signature") || "";
        const rawBody = await request.text();

        // 1. Verify cryptographic signature using raw body
        const isValid = paymentAdapter.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
        }

        const event = JSON.parse(rawBody);
        const normalized = paymentAdapter.normalizePaymentEvent(event);

        // 2. Handle idempotent state transition & entitlement fulfillment in database
        console.log(`Processing verified payment event for order: ${normalized.orderId}`, normalized);

        return NextResponse.json({ received: true, status: normalized.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
    }
}