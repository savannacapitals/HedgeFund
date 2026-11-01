import { createAdminClient } from "@/lib/supabase/admin";
import { completeOrder } from "@/lib/payments/fulfil";
import { getEnabledChains } from "@/lib/payments/usdc/chains";
import { getConfirmedUsdc, createChainReader, type ChainReader } from "@/lib/payments/usdc/chain-client";
import type { ResolvedUsdcChain } from "@/lib/payments/usdc/chains";

export type PaymentState = "pending" | "succeeded" | "failed";

/**
 * The single place where a USDC payment becomes "paid".
 * It reads the real USDC balance of the order's deposit address from the blockchain (only counting
 * blocks that already have enough confirmations), and when that covers the amount due it confirms
 * the order and enrols the learner. Nothing the browser sends is trusted.
 * Safe to run any number of times, from the status page and from the scheduled check.
 */
export async function reconcileUsdcPayment(
    paymentId: string,
    readerFor: (chain: ResolvedUsdcChain) => ChainReader = createChainReader
): Promise<PaymentState> {
    const admin = createAdminClient();

    const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
    if (!payment) throw new Error("Payment not found.");

    if (payment.status === "failed") return "failed";

    // Already marked paid earlier: make sure the order and enrolment really got finished
    if (payment.status === "succeeded") {
        const repaired = await completeOrder(payment.order_id);
        if (!repaired.ok) throw new Error(repaired.message || "Could not finish the order.");
        return "succeeded";
    }

    const chains = getEnabledChains();
    if (chains.length === 0) throw new Error("No blockchain network is configured.");

    await admin
        .from("payments")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", payment.id);

    // Throws if no network could be reached, so an outage is never mistaken for "not paid"
    const { total } = await getConfirmedUsdc(payment.deposit_address, chains, readerFor);
    const received = Number(total);

    if (received < Number(payment.amount_units)) {
        if (received !== Number(payment.received_units)) {
            await admin
                .from("payments")
                .update({ received_units: received, updated_at: new Date().toISOString() })
                .eq("id", payment.id);
        }
        return "pending";
    }

    await admin
        .from("payments")
        .update({
            status: "succeeded",
            received_units: received,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending");

    const completed = await completeOrder(payment.order_id);
    if (!completed.ok) {
        // The payment is saved as paid; the next check repairs the order
        throw new Error(completed.message || "Could not finish the order.");
    }
    return "succeeded";
}
