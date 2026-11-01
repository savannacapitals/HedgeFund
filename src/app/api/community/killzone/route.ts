import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKillzoneAccess, unlockPrice } from "@/lib/community/access";

export const dynamic = "force-dynamic";

// Tells the page whether to show the active link or the "unlock" button. Never returns the Telegram link itself.
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const access = await getKillzoneAccess(user.id);
    return NextResponse.json({ ...access, price: unlockPrice(), currency: "USD" });
}
