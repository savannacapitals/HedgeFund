import { NextResponse } from "next/server";
import { paymentAdapter } from "@/lib/payments/adapter";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Please sign in." }, { status: 401 });
        }

        const { orderId } = await request.json();
        if (!orderId) {
            return NextResponse.json({ error: "Missing order." }, { status: 400 });
        }

        // Amount, currency and title come from the saved order, never from the request body.
        // Row-level security only returns orders that belong to the signed-in user.
        const { data: order } = await supabase
            .from("orders")
            .select("id, user_id, total_amount, currency, status, courses(title)")
            .eq("id", orderId)
            .maybeSingle();

        if (!order) {
            return NextResponse.json({ error: "Order not found." }, { status: 404 });
        }
        if (order.status !== "pending") {
            return NextResponse.json({ error: "This order is not awaiting payment." }, { status: 409 });
        }

        const course: any = Array.isArray(order.courses) ? order.courses[0] : order.courses;

        const paymentResult = await paymentAdapter.createPayment({
            orderId: order.id,
            userId: order.user_id,
            amount: Number(order.total_amount),
            currency: order.currency,
            productTitle: course?.title || "Savanna Education Product",
        });

        return NextResponse.json({ success: true, payment: paymentResult });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
