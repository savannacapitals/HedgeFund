import { createAdminClient } from "@/lib/supabase/admin";

export type FulfilErrorCode =
    | "order_not_found"
    | "order_not_payable"
    | "amount_too_low"
    | "database_error";

// One flat shape (instead of a union) because this project has TypeScript "strict" turned off,
// which stops the compiler narrowing a union on `ok`.
export interface FulfilResult {
    ok: boolean;
    alreadyFulfilled?: boolean;
    courseSlug?: string | null;
    redirectTo?: string;
    code?: FulfilErrorCode;
    message?: string;
}

/**
 * Confirms the order and grants the course enrolment. Safe to call more than once.
 * It does NOT check any money: only call it after a payment has been verified
 * (reconcilePayment) or in the sandbox route.
 */
export async function completeOrder(orderId: string): Promise<FulfilResult> {
    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, course_id, status, kind")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) return { ok: false, code: "database_error", message: orderError.message };
    if (!order) return { ok: false, code: "order_not_found", message: "Order not found." };
    if (order.status === "failed" || order.status === "refunded") {
        return { ok: false, code: "order_not_payable", message: `Order is ${order.status}.` };
    }

    // The Killzone Journal unlock fee: confirms the order and grants the community pass (no course involved)
    if (order.kind === "community") return completeCommunityOrder(admin, order);

    if (!order.course_id) return { ok: false, code: "order_not_payable", message: "Order is not linked to a course." };

    const alreadyFulfilled = order.status === "confirmed";

    // pending -> confirmed, only once
    if (order.status === "pending") {
        const { error: updateError } = await admin
            .from("orders")
            .update({ status: "confirmed", updated_at: new Date().toISOString() })
            .eq("id", order.id)
            .eq("status", "pending");
        if (updateError) return { ok: false, code: "database_error", message: updateError.message };
    }

    // Grant access without disturbing an existing enrolment (e.g. one already completed)
    const { data: existing } = await admin
        .from("course_enrolments")
        .select("id, status")
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .maybeSingle();

    if (!existing) {
        const { error: insertError } = await admin.from("course_enrolments").insert({
            user_id: order.user_id,
            course_id: order.course_id,
            order_id: order.id,
            status: "active",
        });
        // 23505 = unique violation: a parallel retry already created it, which is fine
        if (insertError && insertError.code !== "23505") {
            return { ok: false, code: "database_error", message: insertError.message };
        }
    } else if (existing.status === "revoked") {
        const { error: reactivateError } = await admin
            .from("course_enrolments")
            .update({ status: "active", order_id: order.id })
            .eq("id", existing.id);
        if (reactivateError) return { ok: false, code: "database_error", message: reactivateError.message };
    }

    const { data: course } = await admin
        .from("courses")
        .select("slug")
        .eq("id", order.course_id)
        .maybeSingle();

    return { ok: true, alreadyFulfilled, courseSlug: course?.slug ?? null };
}

/** Confirms a community (Killzone Journal) order and records the pass. Safe to call more than once. */
async function completeCommunityOrder(admin: ReturnType<typeof createAdminClient>, order: any): Promise<FulfilResult> {
    const alreadyFulfilled = order.status === "confirmed";

    if (order.status === "pending") {
        const { error: updateError } = await admin
            .from("orders")
            .update({ status: "confirmed", updated_at: new Date().toISOString() })
            .eq("id", order.id)
            .eq("status", "pending");
        if (updateError) return { ok: false, code: "database_error", message: updateError.message };
    }

    const { error: passError } = await admin
        .from("community_access")
        .upsert({ user_id: order.user_id, source: "unlock_fee", order_id: order.id }, { onConflict: "user_id" });
    if (passError) return { ok: false, code: "database_error", message: passError.message };

    return { ok: true, alreadyFulfilled, courseSlug: null, redirectTo: "/community/killzone" };
}

/** Sandbox only: checks the amount against the order total, then completes the order */
export async function fulfilOrder(orderId: string, amountPaid: number): Promise<FulfilResult> {
    const admin = createAdminClient();

    const { data: order, error } = await admin
        .from("orders")
        .select("id, total_amount")
        .eq("id", orderId)
        .maybeSingle();

    if (error) return { ok: false, code: "database_error", message: error.message };
    if (!order) return { ok: false, code: "order_not_found", message: "Order not found." };
    if (!(Number(amountPaid) >= Number(order.total_amount))) {
        return { ok: false, code: "amount_too_low", message: "Amount paid is less than the order total." };
    }

    return completeOrder(orderId);
}
