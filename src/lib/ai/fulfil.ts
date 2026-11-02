import { recordMembershipPeriod } from "@/lib/ai/membership";

type Admin = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

async function confirmPending(admin: Admin, order: any) {
    if (order.status !== "pending") return null;
    const { error } = await admin
        .from("orders")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "pending");
    return error ?? null;
}

/** AI Opportunities membership order: confirm it, then add the paid period. Safe to call more than once. */
export async function completeAiMembershipOrder(admin: Admin, order: any) {
    const alreadyFulfilled = order.status === "confirmed";
    const updateError = await confirmPending(admin, order);
    if (updateError) return { ok: false, code: "database_error" as const, message: updateError.message };

    const period = await recordMembershipPeriod(order.id, order.user_id);
    if (!period.ok) return { ok: false, code: "database_error" as const, message: period.message };

    return { ok: true, alreadyFulfilled, courseSlug: null, redirectTo: "/ai-opportunities/dashboard" };
}

/** Account assistance order: confirm it and move the request from "Payment Pending" to "Request Received". */
export async function completeAiAssistanceOrder(admin: Admin, order: any) {
    const alreadyFulfilled = order.status === "confirmed";
    const updateError = await confirmPending(admin, order);
    if (updateError) return { ok: false, code: "database_error" as const, message: updateError.message };

    const { error } = await admin
        .from("ai_assistance_requests")
        .update({ status: "request_received", updated_at: new Date().toISOString() })
        .eq("order_id", order.id)
        .eq("status", "payment_pending");
    if (error) return { ok: false, code: "database_error" as const, message: error.message };

    return { ok: true, alreadyFulfilled, courseSlug: null, redirectTo: "/ai-opportunities/dashboard#assistance" };
}
