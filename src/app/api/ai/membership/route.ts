import { createAdminClient, handle, json, requireUser } from "@/lib/ai/server";
import { membershipPriceKes } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

// Starts (or renews) the membership purchase. The price comes from the server, never from the browser.
// Access is NOT granted here: it is granted only when the order is confirmed by a verified payment
// (Pochi SMS match, on-chain payment or an administrator reconciling it in /admin/orders).
export async function POST() {
    try {
        const user = await requireUser();
        const admin = createAdminClient();
        const price = membershipPriceKes();

        // Reuse an open order at the current price instead of piling up new ones
        const { data: open } = await admin
            .from("orders")
            .select("id")
            .eq("user_id", user.id)
            .eq("kind", "ai_membership")
            .eq("status", "pending")
            .eq("total_amount", price)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (open) return json({ redirectTo: `/checkout/${open.id}` });

        const { data: order, error } = await admin
            .from("orders")
            .insert({ user_id: user.id, kind: "ai_membership", total_amount: price, currency: "KES", status: "pending" })
            .select("id")
            .single();
        if (error || !order) throw new Error(error?.message || "Could not create the order.");
        return json({ redirectTo: `/checkout/${order.id}` });
    } catch (err) {
        return handle(err);
    }
}
