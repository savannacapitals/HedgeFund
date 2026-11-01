import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledNetworks } from "@/lib/payments/stablecoin/networks";
import { PaymentConfigError, formatAmount, priceInUnits } from "@/lib/payments/stablecoin/quote";
import { createOrReusePayment } from "@/lib/payments/stablecoin/create-payment";
import { buildPaymentView } from "@/lib/payments/stablecoin/view";

// Finds the signed-in user's own pending order. Row-level security returns only their orders.
async function loadOrder(orderId: string | null) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
    if (!orderId) return { error: NextResponse.json({ error: "Missing order." }, { status: 400 }) };

    const { data: order } = await supabase
        .from("orders")
        .select("id, user_id, total_amount, currency, status")
        .eq("id", orderId)
        .maybeSingle();

    if (!order) return { error: NextResponse.json({ error: "Order not found." }, { status: 404 }) };
    if (order.status !== "pending") {
        return { error: NextResponse.json({ error: "This order is not awaiting payment." }, { status: 409 }) };
    }
    return { user, order };
}

// What will this order cost, and does it already have a payment? Creates nothing.
export async function GET(request: Request) {
    const found = await loadOrder(new URL(request.url).searchParams.get("orderId"));
    if (found.error) return found.error;
    const { order } = found;

    const networks = getEnabledNetworks();
    if (networks.length === 0) return NextResponse.json({ available: false });

    try {
        const { units } = priceInUnits(Number(order.total_amount), order.currency);
        const { data: existing } = await createAdminClient()
            .from("payments")
            .select("*")
            .eq("order_id", order.id)
            .eq("status", "pending")
            .maybeSingle();

        return NextResponse.json({
            available: true,
            approxAmount: formatAmount(units).slice(0, -4), // "40.00": the exact amount comes with the payment
            payment: existing ? buildPaymentView(existing, networks) : null,
        });
    } catch (err: any) {
        if (!(err instanceof PaymentConfigError)) console.error("Stablecoin quote failed:", err.message);
        return NextResponse.json({ available: false });
    }
}

// Gives the order its exact amount to pay (or returns the one it already has)
export async function POST(request: Request) {
    let orderId: string | null = null;
    try {
        ({ orderId } = await request.json());
    } catch {
        // handled by loadOrder
    }

    const found = await loadOrder(orderId);
    if (found.error) return found.error;
    const { user, order } = found;

    const networks = getEnabledNetworks();
    if (networks.length === 0) {
        return NextResponse.json({ error: "Payments are not available yet." }, { status: 503 });
    }

    try {
        const payment = await createOrReusePayment(order, user.id);
        return NextResponse.json({ payment: buildPaymentView(payment, networks) });
    } catch (err: any) {
        if (err instanceof PaymentConfigError) return NextResponse.json({ error: err.message }, { status: 503 });
        console.error("Could not create payment:", err.message);
        return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
    }
}
