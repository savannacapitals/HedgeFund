import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledChains, getNetworkMode, isUsdcConfigured } from "@/lib/payments/usdc/chains";
import { PaymentConfigError, formatUsdc, usdcDueUnits } from "@/lib/payments/usdc/quote";
import { createOrReuseUsdcPayment } from "@/lib/payments/usdc/create-payment";
import { buildPaymentView } from "@/lib/payments/usdc/view";

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

// What will this order cost, and is there already an address for it? Creates nothing.
export async function GET(request: Request) {
    const found = await loadOrder(new URL(request.url).searchParams.get("orderId"));
    if (found.error) return found.error;
    const { order } = found;

    if (!isUsdcConfigured()) return NextResponse.json({ available: false });

    try {
        const { units } = usdcDueUnits(Number(order.total_amount), order.currency);

        // An address may already exist from an earlier visit
        const { data: existing } = await createAdminClient()
            .from("payments")
            .select("*")
            .eq("order_id", order.id)
            .eq("status", "pending")
            .maybeSingle();

        return NextResponse.json({
            available: true,
            testMode: getNetworkMode() === "testnet",
            amountDue: formatUsdc(units),
            networks: getEnabledChains().map((c) => ({ id: c.id, name: c.name })),
            payment: existing ? buildPaymentView(existing, getEnabledChains()) : null,
        });
    } catch (err: any) {
        if (err instanceof PaymentConfigError) return NextResponse.json({ available: false });
        console.error("USDC quote failed:", err.message);
        return NextResponse.json({ available: false });
    }
}

// Gives the order its deposit address (or returns the one it already has)
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

    if (!isUsdcConfigured()) {
        return NextResponse.json({ error: "Payments are not available yet." }, { status: 503 });
    }

    try {
        const payment = await createOrReuseUsdcPayment(order, user.id);
        return NextResponse.json({ payment: buildPaymentView(payment, getEnabledChains()) });
    } catch (err: any) {
        if (err instanceof PaymentConfigError) {
            return NextResponse.json({ error: err.message }, { status: 503 });
        }
        console.error("Could not create USDC payment:", err.message);
        return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
    }
}
