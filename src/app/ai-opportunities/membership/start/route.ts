import { NextResponse } from "next/server";
import { getSignedInUser } from "@/lib/ai/data";
import { openMembershipOrder } from "@/lib/ai/membership-order";
import { MEMBERSHIP_START_PATH } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

// Where a visitor lands after signing up or signing in from an "Unlock" button.
// Signed in  -> open (or reuse) their membership order and go straight to its checkout.
// Signed out -> back to the sign-up page, which returns here once they are in.
export async function GET(request: Request) {
    const go = (path: string) => {
        const res = NextResponse.redirect(new URL(path, request.url));
        res.headers.set("Cache-Control", "no-store");
        return res;
    };

    const user = await getSignedInUser();
    if (!user) return go(`/register?next=${encodeURIComponent(MEMBERSHIP_START_PATH)}`);

    try {
        return go(`/checkout/${await openMembershipOrder(user.id)}`);
    } catch (err: any) {
        console.error("Could not open the membership checkout:", err?.message || err);
        return go("/ai-opportunities/membership");
    }
}
