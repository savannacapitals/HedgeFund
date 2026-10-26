import { NextResponse } from "next/server";
import { paymentAdapter } from "@/lib/payments/adapter";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, userId, amount, currency, productTitle } = body;

        if (!orderId || !amount || !currency) {
            return NextResponse.json({ error: "Missing required order parameters." }, { status: 400 });
        }

        // Generate checkout via adapter
        const paymentResult = await paymentAdapter.createPayment({
            orderId,
            userId: userId || "anonymous",
            amount: Number(amount),
            currency,
            productTitle: productTitle || "Savanna Education Product",
        });

        return NextResponse.json({
            success: true,
            payment: paymentResult,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}