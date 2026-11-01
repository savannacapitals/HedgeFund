import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPayments } from "@/lib/payments/stablecoin/refresh";

export const maxDuration = 30;

// The checkout page asks this every few seconds while the customer is paying
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
        admin.from("payments").select("id, order_id, status, paid_network, paid_token").eq("id", paymentId).eq("user_id", user.id).maybeSingle();

    let { data: payment } = await lookup();
    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

    if (payment.status === "pending") {
        try {
            // Looks at the blockchains (at most once every few seconds, shared by everyone) and matches payments
            await refreshPayments();
            ({ data: payment } = await lookup());
        } catch (err: any) {
            console.error("Payment refresh failed:", err.message);
        }
    }

    const body: Record<string, unknown> = { status: payment!.status, paidNetwork: payment!.paid_network, paidToken: payment!.paid_token };

    if (payment!.status === "succeeded") {
        const { data: order } = await admin.from("orders").select("course_id, kind").eq("id", payment!.order_id).maybeSingle();
        const { data: course } = order?.course_id
            ? await admin.from("courses").select("slug").eq("id", order.course_id).maybeSingle()
            : { data: null };
        body.redirectTo =
            order?.kind === "community" ? "/community/killzone" : course?.slug ? `/learn/${course.slug}/lessons` : "/dashboard";
    }

    return NextResponse.json(body);
}
