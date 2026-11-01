import { createAdminClient } from "@/lib/supabase/admin";
import { deriveDepositAddress } from "@/lib/payments/usdc/derive";
import { PaymentConfigError, usdcDueUnits } from "@/lib/payments/usdc/quote";

export interface UsdcPaymentRow {
    id: string;
    order_id: string;
    user_id: string;
    deposit_index: number;
    deposit_address: string;
    amount_units: number;
    received_units: number;
    status: "pending" | "succeeded" | "failed";
    last_checked_at: string | null;
    created_at: string;
}

async function findPending(admin: any, orderId: string): Promise<UsdcPaymentRow | null> {
    const { data } = await admin
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .eq("status", "pending")
        .maybeSingle();
    return data ?? null;
}

/**
 * Gives an order its own deposit address.
 * Calling it again for the same order returns the same payment, so refreshing the page never
 * uses up another address. The amount comes from the saved order, never from the browser.
 */
export async function createOrReuseUsdcPayment(
    order: { id: string; total_amount: number | string; currency: string },
    userId: string
): Promise<UsdcPaymentRow> {
    const xpub = process.env.USDC_XPUB;
    if (!xpub) throw new PaymentConfigError("Payments are not set up yet.");

    const admin = createAdminClient();

    const existing = await findPending(admin, order.id);
    if (existing) return existing;

    const { units, rate } = usdcDueUnits(Number(order.total_amount), order.currency);

    // A fresh number every time, handed out by the database so two visitors can never get the same one
    const { data: index, error: indexError } = await admin.rpc("next_usdc_deposit_index");
    if (indexError || index === null || index === undefined) {
        throw new Error("Could not allocate a deposit address.");
    }
    const depositIndex = Number(index);
    const address = deriveDepositAddress(xpub, depositIndex);

    const { data, error } = await admin
        .from("payments")
        .insert({
            order_id: order.id,
            user_id: userId,
            provider: "usdc",
            deposit_index: depositIndex,
            deposit_address: address,
            amount_units: Number(units),
            fx_rate: order.currency === "USD" ? null : rate,
            status: "pending",
        })
        .select("*")
        .single();

    if (error) {
        // Two requests for the same order at once: the other one won, use its payment
        if (error.code === "23505") {
            const raced = await findPending(admin, order.id);
            if (raced) return raced;
        }
        throw new Error(error.message);
    }
    return data;
}
