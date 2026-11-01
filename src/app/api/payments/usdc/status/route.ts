import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileUsdcPayment } from "@/lib/payments/usdc/reconcile";
import { formatUsdc } from "@/lib/payments/usdc/quote";

const MIN_RECHECK_MS = 4000;

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

    // Only the person who owns the payment can look at it
    const { data: payment } = await admin
        .from("payments")
        .select("id, order_id, status, amount_units, received_units, last_checked_at")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

    let status = payment.status as string;
    let checkFailed = false;

    const recentlyChecked =
        payment.last_checked_at && Date.now() - new Date(payment.last_checked_at).getTime() < MIN_RECHECK_MS;

    if (status === "pending" && !recentlyChecked) {
        try {
            status = await reconcileUsdcPayment(payment.id);
        } catch (err: any) {
            console.error("USDC status check failed:", err.message);
            checkFailed = true;
        }
    }

    // Read the numbers again in case the check just updated them
    const { data: fresh } = await admin
        .from("payments")
        .select("amount_units, received_units")
        .eq("id", payment.id)
        .maybeSingle();

    const body: Record<string, unknown> = {
        status,
        checkFailed,
        amountDue: formatUsdc(BigInt(fresh?.amount_units ?? payment.amount_units)),
        received: formatUsdc(BigInt(fresh?.received_units ?? payment.received_units ?? 0)),
        receivedUnits: Number(fresh?.received_units ?? payment.received_units ?? 0),
        amountDueUnits: Number(fresh?.amount_units ?? payment.amount_units),
    };

    if (status === "succeeded") {
        const { data: order } = await admin.from("orders").select("course_id, kind").eq("id", payment.order_id).maybeSingle();
        const { data: course } = order?.course_id
            ? await admin.from("courses").select("slug").eq("id", order.course_id).maybeSingle()
            : { data: null };
        body.redirectTo =
            order?.kind === "community" ? "/community/killzone" : course?.slug ? `/learn/${course.slug}/lessons` : "/dashboard";
    }

    return NextResponse.json(body);
}
