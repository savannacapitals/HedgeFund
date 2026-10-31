import { NextResponse } from "next/server";
import { paymentAdapter } from "@/lib/payments/adapter";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilOrder } from "@/lib/payments/fulfil";

export async function POST(request: Request) {
    try {
        const signature = request.headers.get("x-signature") || "";
        const rawBody = await request.text();

        // 1. Verify the signature against the raw body
        if (!paymentAdapter.verifyWebhookSignature(rawBody, signature)) {
            return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
        }

        const normalized = paymentAdapter.normalizePaymentEvent(JSON.parse(rawBody));

        // 2. Idempotent state transition and enrolment
        if (normalized.status === "confirmed") {
            const result = await fulfilOrder(normalized.orderId, normalized.amountPaid);
            if (!result.ok) {
                const status = result.code === "order_not_found" ? 404 : 422;
                return NextResponse.json({ error: result.code }, { status });
            }
        } else if (normalized.status === "failed") {
            const admin = createAdminClient();
            await admin
                .from("orders")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("id", normalized.orderId)
                .eq("status", "pending");
        }

        return NextResponse.json({ received: true, status: normalized.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
    }
}
