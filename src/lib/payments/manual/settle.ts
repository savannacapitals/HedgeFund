import { createAdminClient } from "@/lib/supabase/admin";
import { completeOrder } from "@/lib/payments/fulfil";

export type SettleResult = "settled" | "no_message" | "underpaid" | "not_eligible" | "failed";

/**
 * Confirms a submitted Pochi payment if the forwarded M-Pesa SMS for its code has arrived and the amount covers the price.
 * Safe to call any number of times, from the customer's page, the webhook or both at once:
 * the SMS is "claimed" with a conditional update, so it can pay for exactly one order.
 */
export async function trySettlePochi(paymentId: string): Promise<SettleResult> {
    const admin = createAdminClient();

    const { data: payment } = await admin
        .from("manual_payments")
        .select("id, order_id, method, status, amount, currency, provider_ref")
        .eq("id", paymentId)
        .maybeSingle();
    if (!payment || payment.method !== "pochi" || payment.status !== "submitted" || !payment.provider_ref) {
        return "not_eligible";
    }

    const { data: message } = await admin
        .from("pochi_messages")
        .select("id, amount, claimed_by")
        .eq("mpesa_code", String(payment.provider_ref).toUpperCase())
        .maybeSingle();
    if (!message || message.claimed_by) return "no_message";

    // The customer pays in KES; an SMS for less than the price never confirms anything by itself
    if (!(Number(message.amount) >= Number(payment.amount))) return "underpaid";

    // Claim the SMS. If another request got there first, this returns no row.
    const { data: claimed } = await admin
        .from("pochi_messages")
        .update({ claimed_by: payment.id })
        .eq("id", message.id)
        .is("claimed_by", null)
        .select("id")
        .maybeSingle();
    if (!claimed) return "no_message";

    const result = await completeOrder(payment.order_id);
    if (!result.ok) {
        // Order cannot be paid (e.g. it was closed): give the SMS back so an admin can sort it out
        await admin.from("pochi_messages").update({ claimed_by: null }).eq("id", message.id);
        console.error("Pochi settle: could not complete order", payment.order_id, result.message);
        return "failed";
    }

    const now = new Date().toISOString();
    await admin
        .from("manual_payments")
        .update({ status: "succeeded", paid_at: now, updated_at: now })
        .eq("id", payment.id)
        .eq("status", "submitted");
    return "settled";
}

/** Where to send the customer once an order is paid */
export async function redirectForOrder(orderId: string): Promise<string> {
    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("course_id, kind").eq("id", orderId).maybeSingle();
    if (order?.kind === "community") return "/community/killzone";
    if (order?.kind === "ai_membership") return "/ai-opportunities/dashboard";
    if (order?.kind === "ai_assistance") return "/ai-opportunities/dashboard#assistance";
    if (order?.course_id) {
        const { data: course } = await admin.from("courses").select("slug").eq("id", order.course_id).maybeSingle();
        if (course?.slug) return `/learn/${course.slug}/lessons`;
    }
    return "/dashboard";
}
