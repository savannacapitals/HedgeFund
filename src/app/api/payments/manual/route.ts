import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    ManualPaymentError,
    POCHI_MAX_KES,
    getBankConfig,
    getPochiConfig,
    orderReference,
    quoteManual,
    type ManualMethod,
} from "@/lib/payments/manual/config";
import { loadPayableOrder } from "@/lib/payments/manual/order";
import { buildManualView } from "@/lib/payments/manual/view";

function fail(err: any) {
    if (err instanceof ManualPaymentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Manual payment error:", err?.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Safe quote: returns null instead of throwing, so one unavailable method never hides the other */
function safeQuote(order: any, target: "KES" | "USD", whole: boolean) {
    try {
        return quoteManual(Number(order.total_amount), order.currency, target, whole);
    } catch {
        return null;
    }
}

// Which methods are on, what each would cost, and whether this order already has an open payment
export async function GET(request: Request) {
    try {
        const { order } = await loadPayableOrder(new URL(request.url).searchParams.get("orderId"));

        const pochi = getPochiConfig();
        const bank = getBankConfig();
        const pochiQuote = pochi ? safeQuote(order, "KES", true) : null;
        const bankQuote = bank ? safeQuote(order, bank.currency, false) : null;

        const { data: open } = await createAdminClient()
            .from("manual_payments")
            .select("*")
            .eq("order_id", order.id)
            .in("status", ["awaiting", "submitted"])
            .maybeSingle();

        return NextResponse.json({
            pochi: {
                available: !!pochiQuote && pochiQuote.amount <= POCHI_MAX_KES,
                tooLarge: !!pochiQuote && pochiQuote.amount > POCHI_MAX_KES,
                approxAmount: pochiQuote ? `${pochiQuote.amount.toFixed(0)} KES` : null,
            },
            bank: {
                available: !!bankQuote,
                approxAmount: bankQuote ? `${bankQuote.amount.toFixed(2)} ${bankQuote.currency}` : null,
            },
            payment: open ? buildManualView(open) : null,
        });
    } catch (err) {
        return fail(err);
    }
}

// Gives the order its payment instructions (or returns the ones it already has)
export async function POST(request: Request) {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // handled below
        }
        const method = body.method as ManualMethod;
        if (method !== "pochi" && method !== "bank") throw new ManualPaymentError("Unknown payment method.");

        const { user, order } = await loadPayableOrder(body.orderId);
        const admin = createAdminClient();

        const { data: open } = await admin
            .from("manual_payments")
            .select("*")
            .eq("order_id", order.id)
            .in("status", ["awaiting", "submitted"])
            .maybeSingle();

        if (open) {
            if (open.method === method) return NextResponse.json({ payment: buildManualView(open) });
            if (open.status === "submitted") {
                const name = open.method === "pochi" ? "Pochi la Biashara" : "bank transfer";
                throw new ManualPaymentError(
                    `You already sent a ${name} payment for this order and it is being checked. Please wait for it to be confirmed.`,
                    409
                );
            }
            // Customer changed their mind before paying: close the unused one
            await admin
                .from("manual_payments")
                .update({ status: "expired", updated_at: new Date().toISOString() })
                .eq("id", open.id)
                .eq("status", "awaiting");
        }

        let amount: number, currency: "KES" | "USD", rate: number | null;
        if (method === "pochi") {
            if (!getPochiConfig()) throw new ManualPaymentError("Pochi la Biashara is not available right now.", 503);
            ({ amount, currency, rate } = quoteManual(Number(order.total_amount), order.currency, "KES", true));
            if (amount > POCHI_MAX_KES) {
                throw new ManualPaymentError("This amount is above the M-Pesa limit per transaction. Please use bank transfer.");
            }
        } else {
            const bank = getBankConfig();
            if (!bank) throw new ManualPaymentError("Bank transfer is not available right now.", 503);
            ({ amount, currency, rate } = quoteManual(Number(order.total_amount), order.currency, bank.currency, false));
        }

        const { data: created, error } = await admin
            .from("manual_payments")
            .insert({
                order_id: order.id,
                user_id: user.id,
                method,
                reference: orderReference(order.id),
                amount,
                currency,
                fx_rate: rate,
            })
            .select("*")
            .single();

        if (error) {
            // A parallel click already created it: hand that one back
            if (error.code === "23505") {
                const { data: again } = await admin
                    .from("manual_payments")
                    .select("*")
                    .eq("order_id", order.id)
                    .in("status", ["awaiting", "submitted"])
                    .maybeSingle();
                if (again && again.method === method) return NextResponse.json({ payment: buildManualView(again) });
            }
            throw error;
        }
        return NextResponse.json({ payment: buildManualView(created) });
    } catch (err) {
        return fail(err);
    }
}
