import { createAdminClient } from "@/lib/supabase/admin";
import { membershipDays } from "@/lib/ai/config";

export interface AiMembership {
    active: boolean;
    expiresAt: string | null; // the latest end date, even if already past (so the page can say "expired on ...")
    daysLeft: number;
}

/**
 * SERVER ONLY. Does this user hold a valid AI Opportunities membership?
 *  - a paid period counts only while its order is still "confirmed" (a refund ends it)
 *  - a manual grant counts until its end date unless an administrator revoked it
 */
export async function getAiMembership(userId: string): Promise<AiMembership> {
    const admin = createAdminClient();
    const now = Date.now();
    let latest = 0;
    let activeEnd = 0;

    const { data: periods } = await admin
        .from("ai_membership_periods")
        .select("ends_at, orders!inner(status)")
        .eq("user_id", userId);
    for (const p of periods ?? []) {
        const order: any = Array.isArray((p as any).orders) ? (p as any).orders[0] : (p as any).orders;
        if (order?.status !== "confirmed") continue;
        const end = new Date((p as any).ends_at).getTime();
        latest = Math.max(latest, end);
        if (end > now) activeEnd = Math.max(activeEnd, end);
    }

    const { data: grants } = await admin
        .from("ai_membership_grants")
        .select("ends_at")
        .eq("user_id", userId)
        .eq("revoked", false);
    for (const g of grants ?? []) {
        const end = new Date((g as any).ends_at).getTime();
        latest = Math.max(latest, end);
        if (end > now) activeEnd = Math.max(activeEnd, end);
    }

    return {
        active: activeEnd > now,
        expiresAt: latest ? new Date(latest).toISOString() : null,
        daysLeft: activeEnd > now ? Math.ceil((activeEnd - now) / 86_400_000) : 0,
    };
}

/**
 * SERVER ONLY. Records the paid period for a confirmed membership order. Safe to call more than once:
 * order_id is the primary key, so the same order can never add time twice.
 * Renewing early adds the new period after the current one ends, so no paid days are lost.
 */
export async function recordMembershipPeriod(orderId: string, userId: string): Promise<{ ok: boolean; message?: string }> {
    const admin = createAdminClient();

    const { data: existing } = await admin.from("ai_membership_periods").select("order_id").eq("order_id", orderId).maybeSingle();
    if (existing) return { ok: true };

    const current = await getAiMembership(userId);
    const base = current.active && current.expiresAt ? new Date(current.expiresAt).getTime() : Date.now();
    const starts = new Date(base);
    const ends = new Date(base + membershipDays() * 86_400_000);

    const { error } = await admin
        .from("ai_membership_periods")
        .insert({ order_id: orderId, user_id: userId, starts_at: starts.toISOString(), ends_at: ends.toISOString(), source: "payment" });
    // 23505 = a parallel call already recorded it
    if (error && error.code !== "23505") return { ok: false, message: error.message };
    return { ok: true };
}
