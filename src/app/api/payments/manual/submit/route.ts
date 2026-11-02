import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MPESA_CODE, normaliseMpesaCode } from "@/lib/payments/manual/sms";
import { redirectForOrder, trySettlePochi } from "@/lib/payments/manual/settle";
import { buildManualView } from "@/lib/payments/manual/view";

const MAX_ATTEMPTS = 6;

// The customer tells us what they paid with: the M-Pesa code (Pochi) or the bank reference (bank)
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    let body: any = {};
    try {
        body = await request.json();
    } catch {
        // handled below
    }
    if (!body.paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });

    const admin = createAdminClient();
    const { data: payment } = await admin
        .from("manual_payments")
        .select("*")
        .eq("id", body.paymentId)
        .eq("user_id", user.id)
        .maybeSingle();
    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    if (payment.status !== "awaiting" && payment.status !== "submitted") {
        return NextResponse.json({ error: "This payment can no longer be changed." }, { status: 409 });
    }
    if (payment.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many attempts. Please contact support with your reference." }, { status: 429 });
    }

    // The order must still be open
    const { data: order } = await admin.from("orders").select("status").eq("id", payment.order_id).maybeSingle();
    if (!order || order.status !== "pending") {
        return NextResponse.json({ error: "This order is not awaiting payment." }, { status: 409 });
    }

    let providerRef: string;
    if (payment.method === "pochi") {
        providerRef = normaliseMpesaCode(body.providerRef);
        if (!MPESA_CODE.test(providerRef)) {
            return NextResponse.json(
                { error: "That does not look like an M-Pesa code. It has 10 letters and numbers, for example SGL4ABC12D." },
                { status: 400 }
            );
        }
    } else {
        providerRef = String(body.providerRef || "").trim();
        if (providerRef.length < 4 || providerRef.length > 64) {
            return NextResponse.json({ error: "Enter the transaction reference from your bank (4 to 64 characters)." }, { status: 400 });
        }
    }
    const payerName = String(body.payerName || "").trim().slice(0, 80) || null;

    const { data: updated, error } = await admin
        .from("manual_payments")
        .update({
            provider_ref: providerRef,
            payer_name: payerName,
            status: "submitted",
            attempts: payment.attempts + 1,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .in("status", ["awaiting", "submitted"])
        .select("*")
        .maybeSingle();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json({ error: "That code has already been used for another payment." }, { status: 409 });
        }
        console.error("Manual payment submit failed:", error.message);
        return NextResponse.json({ error: "Could not save your payment. Please try again." }, { status: 500 });
    }
    if (!updated) return NextResponse.json({ error: "This payment can no longer be changed." }, { status: 409 });

    // Pochi: the SMS may already be here
    let status = updated.status;
    let redirectTo: string | undefined;
    if (updated.method === "pochi") {
        const result = await trySettlePochi(updated.id);
        if (result === "settled") {
            status = "succeeded";
            redirectTo = await redirectForOrder(updated.order_id);
        }
    }

    return NextResponse.json({ payment: { ...buildManualView(updated), status }, redirectTo });
}
