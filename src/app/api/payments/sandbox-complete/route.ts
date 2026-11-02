import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fulfilOrder } from "@/lib/payments/fulfil";

/**
 * Sandbox only: pretends the payment went through so the full purchase flow can be tested.
 * Disabled in production unless ALLOW_SANDBOX_PAYMENTS=true is set on purpose.
 */
export async function POST(request: Request) {
    const sandboxEnabled =
        process.env.NODE_ENV !== "production" || process.env.ALLOW_SANDBOX_PAYMENTS === "true";
    if (!sandboxEnabled) {
        return NextResponse.json({ error: "Online payments are not enabled yet." }, { status: 404 });
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    let orderId: string | undefined;
    try {
        ({ orderId } = await request.json());
    } catch {
        // handled below
    }
    if (!orderId) {
        return NextResponse.json({ error: "Missing order." }, { status: 400 });
    }

    // Row-level security only returns orders that belong to the signed-in user
    const { data: order } = await supabase
        .from("orders")
        .select("id, total_amount")
        .eq("id", orderId)
        .maybeSingle();
    if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await fulfilOrder(order.id, Number(order.total_amount));
    if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 422 });
    }

    return NextResponse.json({
        success: true,
        redirectTo: result.redirectTo || (result.courseSlug ? `/learn/${result.courseSlug}/lessons` : "/dashboard"),
    });
}
