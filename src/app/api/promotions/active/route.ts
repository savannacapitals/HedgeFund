import { NextResponse } from "next/server";
import { getPublicOffers } from "@/lib/promotions/server";

// Public. Only offers that are advertised or applied automatically are listed, and a hidden code is never included.
export async function GET() {
    try {
        const offers = await getPublicOffers();
        return NextResponse.json(
            { offers },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
        );
    } catch (err) {
        console.error("Promotion list failed:", err);
        return NextResponse.json({ offers: [] }, { headers: { "Cache-Control": "no-store" } });
    }
}
