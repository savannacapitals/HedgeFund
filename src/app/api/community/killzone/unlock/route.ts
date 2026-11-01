import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KILLZONE_PAGE, getKillzoneAccess, unlockPrice } from "@/lib/community/access";

export const dynamic = "force-dynamic";

// Starts the one-time unlock purchase. The price comes from the server, never from the browser.
// The order then goes through the normal /checkout/<orderId> page.
export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const { hasAccess } = await getKillzoneAccess(user.id);
    if (hasAccess) return NextResponse.json({ redirectTo: KILLZONE_PAGE });

    const admin = createAdminClient();
    const price = unlockPrice();

    // Reuse an open unlock order at the current price instead of piling up new ones
    const { data: openOrder } = await admin
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", "community")
        .eq("status", "pending")
        .eq("total_amount", price)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (openOrder) return NextResponse.json({ redirectTo: `/checkout/${openOrder.id}` });

    const { data: order, error } = await admin
        .from("orders")
        .insert({ user_id: user.id, kind: "community", total_amount: price, currency: "USD", status: "pending" })
        .select("id")
        .single();

    if (error || !order) {
        return NextResponse.json({ error: error?.message || "Could not create the order." }, { status: 500 });
    }
    return NextResponse.json({ redirectTo: `/checkout/${order.id}` });
}
