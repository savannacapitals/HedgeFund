import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledNetworks } from "@/lib/payments/stablecoin/networks";
import { PaymentConfigError, priceInUnits, randomTag } from "@/lib/payments/stablecoin/quote";

export const PAYMENT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_OPEN_PAYMENTS_PER_USER = 3;
const MAX_TAG_ATTEMPTS = 25;

export interface PaymentRow {
    id: string;
    order_id: string;
    user_id: string;
    amount_units: number;
    status: "pending" | "succeeded" | "failed" | "expired";
    paid_network: string | null;
    paid_token: string | null;
    expires_at: string;
    created_at: string;
}

async function findOpen(admin: any, orderId: string): Promise<PaymentRow | null> {
    const { data } = await admin.from("payments").select("*").eq("order_id", orderId).eq("status", "pending").maybeSingle();
    return data ?? null;
}

/**
 * Gives an order its own exact amount to pay.
 * The amount is the price from the saved order plus a few extra millionths (under one cent) that nobody
 * else has open at the same time. Asking again for the same order returns the same payment.
 */
export async function createOrReusePayment(
    order: { id: string; total_amount: number | string; currency: string },
    userId: string
): Promise<PaymentRow> {
    if (getEnabledNetworks().length === 0) throw new PaymentConfigError("Payments are not set up yet.");

    const admin = createAdminClient();

    const existing = await findOpen(admin, order.id);
    if (existing) return existing;

    const { data: mine } = await admin.from("payments").select("id").eq("user_id", userId).eq("status", "pending");
    if ((mine?.length ?? 0) >= MAX_OPEN_PAYMENTS_PER_USER) {
        throw new PaymentConfigError("You already have several unpaid orders. Please pay or wait for them to expire first.");
    }

    const { units: base, rate } = priceInUnits(Number(order.total_amount), order.currency);

    for (let attempt = 0; attempt < MAX_TAG_ATTEMPTS; attempt++) {
        const amount = base + randomTag();
        const { data, error } = await admin
            .from("payments")
            .insert({
                order_id: order.id,
                user_id: userId,
                provider: "stablecoin",
                amount_units: Number(amount),
                fx_rate: order.currency === "USD" ? null : rate,
                status: "pending",
                expires_at: new Date(Date.now() + PAYMENT_LIFETIME_MS).toISOString(),
            })
            .select("*")
            .single();

        if (!error && data) return data;

        if (error?.code === "23505") {
            // Either this order just got a payment from a parallel request, or that exact amount is taken: try another
            const raced = await findOpen(admin, order.id);
            if (raced) return raced;
            continue;
        }
        throw new Error(error?.message || "Could not create the payment.");
    }
    throw new Error("Could not find a free payment amount. Please try again.");
}
