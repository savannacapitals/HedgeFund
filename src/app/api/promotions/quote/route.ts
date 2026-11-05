import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockPrice } from "@/lib/community/access";
import { PromoError, normaliseCode, quotePurchase, type PurchaseTarget } from "@/lib/promotions/server";

export const dynamic = "force-dynamic";

/**
 * What would this purchase cost right now? Used by the course page to show the price and to check a promo code.
 * The price is read from the database; the browser only says which product and which code.
 * Typing a code needs a signed-in account, because limits are per customer.
 */
export async function POST(request: Request) {
    let body: any = {};
    try {
        body = await request.json();
    } catch {
        // an empty body means "no code, course unknown": handled below
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const code = normaliseCode(body.code);

    let target: PurchaseTarget;
    let subtotal: number;
    let currency: string;

    if (body.kind === "community") {
        target = { kind: "community" };
        subtotal = unlockPrice();
        currency = "USD";
    } else {
        if (!body.courseId || typeof body.courseId !== "string") {
            return NextResponse.json({ error: "Missing course." }, { status: 400 });
        }
        const { data: course } = await admin
            .from("courses")
            .select("id, price, currency, is_published")
            .eq("id", body.courseId)
            .maybeSingle();
        if (!course || !course.is_published) return NextResponse.json({ error: "Course not found." }, { status: 404 });
        target = { kind: "course", courseId: course.id };
        subtotal = Number(course.price);
        currency = course.currency ?? "USD";
    }

    if (!(subtotal > 0)) {
        return NextResponse.json({ quote: { subtotal, discount: 0, total: subtotal, currency, promotion: null } });
    }

    if (code && !user) {
        return NextResponse.json({ error: "Please sign in to apply a promo code." }, { status: 401 });
    }

    try {
        const quote = await quotePurchase({ admin, userId: user?.id ?? null, target, subtotal, currency, code });
        return NextResponse.json({ quote }, { headers: { "Cache-Control": "no-store" } });
    } catch (err: any) {
        if (err instanceof PromoError) {
            // Still return the standard price, so the page has something to show next to the error
            const quote = await quotePurchase({ admin, userId: user?.id ?? null, target, subtotal, currency });
            return NextResponse.json({ quote, codeError: err.message }, { headers: { "Cache-Control": "no-store" } });
        }
        console.error("Quote failed:", err);
        return NextResponse.json({ error: "Could not work out the price." }, { status: 500 });
    }
}
