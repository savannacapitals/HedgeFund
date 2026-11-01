import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { refreshPayments } from "@/lib/payments/stablecoin/refresh";

export const maxDuration = 60;

/**
 * Scheduled safety net: finishes orders for customers who paid and then closed the page.
 * Call it every few minutes with:  Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron adds that header by itself when CRON_SECRET is set in the project.)
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });

    const given = Buffer.from(request.headers.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    try {
        const result = await refreshPayments({ force: true });
        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Scheduled payment check failed:", err.message);
        return NextResponse.json({ error: "Check failed." }, { status: 500 });
    }
}
