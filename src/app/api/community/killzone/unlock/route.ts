import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KILLZONE_PAGE, getKillzoneAccess, unlockPrice } from "@/lib/community/access";
import { PromoError, openPurchaseOrder } from "@/lib/promotions/server";

export const dynamic = "force-dynamic";

// Starts the one-time unlock purchase. The price comes from the server, never from the browser.
// The order then goes through the normal /checkout/<orderId> page.
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const { hasAccess } = await getKillzoneAccess(user.id);
    if (hasAccess) return NextResponse.json({ redirectTo: KILLZONE_PAGE });

    let promoCode: string | undefined;
    try {
        ({ promoCode } = await request.json());
    } catch {
        // no body is fine: automatic offers still apply
    }

    // Any automatic offer or typed code is applied on the server, on top of the server-side price
    try {
        const { orderId, notice } = await openPurchaseOrder({
            admin: createAdminClient(),
            userId: user.id,
            target: { kind: "community" },
            subtotal: unlockPrice(),
            currency: "USD",
            code: promoCode,
        });
        return NextResponse.json({ redirectTo: `/checkout/${orderId}`, notice });
    } catch (err: any) {
        if (err instanceof PromoError) return NextResponse.json({ error: err.message }, { status: err.status });
        return NextResponse.json({ error: err?.message || "Could not create the order." }, { status: 500 });
    }
}
