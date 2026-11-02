import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePochiSms } from "@/lib/payments/manual/sms";
import { trySettlePochi } from "@/lib/payments/manual/settle";

/**
 * Receives the M-Pesa "you have received" SMS from the phone that owns the Pochi number
 * (through an SMS-forwarding app, see docs/manual-payments.md), saves it, and confirms the matching order.
 *
 *   POST /api/webhooks/pochi
 *   Header  x-webhook-secret: <POCHI_WEBHOOK_SECRET>   (or Authorization: Bearer <secret>, or ?secret=<secret>)
 *   Body    JSON or form fields. The SMS text can be in "message", "text", "body" or "content".
 */

const sha = (s: string) => createHash("sha256").update(s).digest();

function secretMatches(given: string, expected: string): boolean {
    return timingSafeEqual(sha(given), sha(expected));
}

export async function POST(request: Request) {
    const expected = process.env.POCHI_WEBHOOK_SECRET;
    if (!expected || expected.length < 16) {
        return NextResponse.json({ error: "Not configured." }, { status: 503 });
    }

    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    // Some SMS-forwarder apps cannot set headers, so ?secret=... is accepted too (URLs can end up in logs: prefer the header)
    const given = request.headers.get("x-webhook-secret") || bearer || new URL(request.url).searchParams.get("secret") || "";
    if (!given || !secretMatches(given, expected)) {
        return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    let fields: Record<string, any> = {};
    try {
        const type = request.headers.get("content-type") || "";
        if (type.includes("application/json")) {
            fields = await request.json();
        } else if (type.includes("form")) {
            fields = Object.fromEntries((await request.formData()).entries());
        } else {
            fields = { message: await request.text() };
        }
    } catch {
        return NextResponse.json({ error: "Unreadable body." }, { status: 400 });
    }

    const message = String(fields.message ?? fields.text ?? fields.body ?? fields.content ?? fields.sms ?? "");
    const from = String(fields.from ?? fields.sender ?? fields.address ?? "");

    // If the forwarder tells us who sent the SMS, it must be M-Pesa
    if (from && !/m-?pesa/i.test(from)) return NextResponse.json({ received: true, ignored: "sender" });

    const parsed = parsePochiSms(message);
    // Return 200 for other SMS so the forwarder does not keep retrying them
    if (!parsed) return NextResponse.json({ received: true, ignored: "not_a_payment" });

    const admin = createAdminClient();
    const { error } = await admin
        .from("pochi_messages")
        .upsert(
            { mpesa_code: parsed.code, amount: parsed.amount, sender_name: parsed.sender, raw: message.slice(0, 600) },
            { onConflict: "mpesa_code", ignoreDuplicates: true }
        );
    if (error) {
        console.error("Pochi webhook: could not save SMS:", error.message);
        return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    // Is a customer already waiting on this code?
    const { data: waiting } = await admin
        .from("manual_payments")
        .select("id")
        .eq("method", "pochi")
        .eq("status", "submitted")
        .ilike("provider_ref", parsed.code)
        .maybeSingle();

    let settled = false;
    if (waiting) settled = (await trySettlePochi(waiting.id)) === "settled";

    return NextResponse.json({ received: true, matched: !!waiting, settled });
}
