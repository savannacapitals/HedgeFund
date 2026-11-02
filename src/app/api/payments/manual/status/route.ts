import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirectForOrder, trySettlePochi } from "@/lib/payments/manual/settle";

// The checkout page asks this every few seconds while it waits for the payment to be confirmed
export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });

    const admin = createAdminClient();
    const lookup = () =>
        admin.from("manual_payments").select("id, order_id, method, status").eq("id", paymentId).eq("user_id", user.id).maybeSingle();

    let { data: payment } = await lookup();
    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

    // Covers the case where the SMS arrived but the webhook could not settle it at the time
    if (payment.status === "submitted" && payment.method === "pochi") {
        try {
            await trySettlePochi(payment.id);
            ({ data: payment } = await lookup());
        } catch (err: any) {
            console.error("Pochi status check failed:", err.message);
        }
    }

    const body: Record<string, unknown> = { status: payment!.status };
    if (payment!.status === "succeeded") body.redirectTo = await redirectForOrder(payment!.order_id);
    return NextResponse.json(body);
}
