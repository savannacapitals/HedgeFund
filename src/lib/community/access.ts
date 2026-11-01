import { createAdminClient } from "@/lib/supabase/admin";

export const KILLZONE_NAME = "The Killzone Journal";
export const KILLZONE_PAGE = "/community/killzone";

/** One-time fee (in USD) for students who did not buy a paid course. Set KILLZONE_UNLOCK_PRICE to change it. */
export function unlockPrice(): number {
    const n = Number(process.env.KILLZONE_UNLOCK_PRICE);
    return Number.isFinite(n) && n > 0 ? n : 15;
}

export type AccessReason = "paid_course" | "unlock_fee" | "manual" | null;

export interface KillzoneAccess {
    hasAccess: boolean;
    reason: AccessReason;
}

/**
 * Does this user hold a valid Killzone pass? SERVER ONLY (uses the service role key).
 *   1. Any active/completed enrolment that was created by a confirmed order = a paid course.
 *      (Free courses never have an order, so they never count.)
 *   2. A community_access row: manual grant, or an unlock fee whose order is still confirmed
 *      (a refunded order stops counting).
 */
export async function getKillzoneAccess(userId: string): Promise<KillzoneAccess> {
    const admin = createAdminClient();

    const { data: enrolments } = await admin
        .from("course_enrolments")
        .select("order_id")
        .eq("user_id", userId)
        .in("status", ["active", "completed"])
        .not("order_id", "is", null);

    const orderIds = (enrolments ?? []).map((e: any) => e.order_id as string);
    if (orderIds.length) {
        const { data: paid } = await admin
            .from("orders")
            .select("id")
            .in("id", orderIds)
            .eq("status", "confirmed")
            .limit(1);
        if (paid && paid.length) return { hasAccess: true, reason: "paid_course" };
    }

    const { data: pass } = await admin
        .from("community_access")
        .select("source, order_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (pass?.source === "manual") return { hasAccess: true, reason: "manual" };

    if (pass?.source === "unlock_fee" && pass.order_id) {
        const { data: order } = await admin.from("orders").select("status").eq("id", pass.order_id).maybeSingle();
        if (order?.status === "confirmed") return { hasAccess: true, reason: "unlock_fee" };
    }

    return { hasAccess: false, reason: null };
}
