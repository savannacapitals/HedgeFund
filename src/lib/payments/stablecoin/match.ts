import { createAdminClient } from "@/lib/supabase/admin";
import { completeOrder } from "@/lib/payments/fulfil";

/** Chain clocks and our clock are not perfectly in step */
const CLOCK_SKEW_MS = 2 * 60_000;

/**
 * Pairs open payments with incoming transfers, and ONLY when:
 *   - the amount is exactly the amount this order was given (including the identifying last digits),
 *   - the transfer happened after the payment was created (so an old transfer can never be replayed), and
 *   - that transfer has not already paid something else.
 * The scanners only ever return confirmed transfers of the official tokens to our own addresses.
 */
export async function matchPendingPayments(now: () => number = Date.now): Promise<{ matched: number }> {
    const admin = createAdminClient();

    const { data: pending } = await admin.from("payments").select("*").eq("status", "pending").limit(200);
    if (!pending || pending.length === 0) return { matched: 0 };

    const oldest = Math.min(...pending.map((p: any) => Date.parse(p.created_at))) - CLOCK_SKEW_MS;
    const { data: transfers } = await admin
        .from("chain_transfers")
        .select("*")
        .is("payment_id", null)
        .gte("occurred_at", new Date(oldest).toISOString())
        .limit(1000);

    const claimed = new Set<string>();
    let matched = 0;

    for (const payment of pending) {
        const earliestAllowed = Date.parse(payment.created_at) - CLOCK_SKEW_MS;

        const candidates = (transfers ?? [])
            .filter(
                (t: any) =>
                    !claimed.has(t.id) &&
                    Number(t.amount_units) === Number(payment.amount_units) &&
                    Date.parse(t.occurred_at) >= earliestAllowed
            )
            .sort((a: any, b: any) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));

        const transfer = candidates[0];
        if (!transfer) continue;

        // The unique index on matched_transfer_id guarantees one transfer can only ever pay one payment
        const { data: won, error } = await admin
            .from("payments")
            .update({
                status: "succeeded",
                matched_transfer_id: transfer.id,
                paid_network: transfer.network,
                paid_token: transfer.token,
                paid_at: new Date(now()).toISOString(),
                updated_at: new Date(now()).toISOString(),
            })
            .eq("id", payment.id)
            .eq("status", "pending")
            .select("id");

        if (error || !won || won.length === 0) continue;

        claimed.add(transfer.id);
        matched++;
        await admin.from("chain_transfers").update({ payment_id: payment.id }).eq("id", transfer.id).is("payment_id", null);

        const done = await completeOrder(payment.order_id);
        if (!done.ok) console.error("Payment matched but the order step failed (will be retried):", done.message);
    }

    return { matched };
}

/** Frees the exact amounts of payments nobody paid in time */
export async function expireOldPayments(now: () => number = Date.now): Promise<void> {
    const admin = createAdminClient();
    await admin
        .from("payments")
        .update({ status: "expired", updated_at: new Date(now()).toISOString() })
        .eq("status", "pending")
        .lt("expires_at", new Date(now()).toISOString());
}

/** A payment can be saved as paid while its order step failed: finish those */
export async function repairSucceededPayments(): Promise<{ repaired: number }> {
    const admin = createAdminClient();
    const { data: paid } = await admin.from("payments").select("order_id").eq("status", "succeeded").limit(100);
    const orderIds = (paid ?? []).map((p: any) => p.order_id);
    if (!orderIds.length) return { repaired: 0 };

    const { data: orders } = await admin.from("orders").select("id, status").in("id", orderIds);
    let repaired = 0;
    for (const o of orders ?? []) {
        if (o.status !== "pending") continue;
        const res = await completeOrder(o.id);
        if (res.ok) repaired++;
    }
    return { repaired };
}
