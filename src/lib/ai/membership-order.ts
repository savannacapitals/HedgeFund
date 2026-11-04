import { createAdminClient } from "@/lib/supabase/admin";
import { membershipPriceKes } from "@/lib/ai/config";

/**
 * SERVER ONLY. Opens (or reuses) the pending membership order for a signed-in user and returns its id.
 * Shared by POST /api/ai/membership and the post-sign-up redirect at /ai-opportunities/membership/start.
 * Access is NOT granted here: it is granted only when the order is confirmed by a verified payment.
 */
export async function openMembershipOrder(userId: string): Promise<string> {
    const admin = createAdminClient();
    const price = membershipPriceKes();

    // Reuse an open order at the current price instead of piling up new ones
    const { data: open } = await admin
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "ai_membership")
        .eq("status", "pending")
        .eq("total_amount", price)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (open) return open.id;

    const { data: order, error } = await admin
        .from("orders")
        .insert({ user_id: userId, kind: "ai_membership", total_amount: price, currency: "KES", status: "pending" })
        .select("id")
        .single();
    if (error || !order) throw new Error(error?.message || "Could not create the order.");
    return order.id;
}
