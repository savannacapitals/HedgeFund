import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileUsdcPayment } from "@/lib/payments/usdc/reconcile";

const MAX_PER_RUN = 40;
const LOOKBACK_DAYS = 14;
const PARALLEL = 5;

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

    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: pending, error } = await admin
        .from("payments")
        .select("id")
        .eq("status", "pending")
        .eq("provider", "usdc")
        .gte("created_at", cutoff)
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(MAX_PER_RUN);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let succeeded = 0;
    let errors = 0;
    const ids = (pending ?? []).map((p: any) => p.id as string);

    for (let i = 0; i < ids.length; i += PARALLEL) {
        const batch = ids.slice(i, i + PARALLEL);
        const results = await Promise.allSettled(batch.map((id) => reconcileUsdcPayment(id)));
        for (const r of results) {
            if (r.status === "fulfilled" && r.value === "succeeded") succeeded++;
            if (r.status === "rejected") {
                errors++;
                console.error("Scheduled check failed:", r.reason?.message);
            }
        }
    }

    return NextResponse.json({ checked: ids.length, succeeded, errors });
}
