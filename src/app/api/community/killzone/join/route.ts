import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKillzoneAccess } from "@/lib/community/access";

export const dynamic = "force-dynamic";

// Asks Telegram for a one-person invite link that expires in 24 hours.
// Returns null if the bot is not configured or Telegram refuses (the caller then uses the shared link).
async function createSingleUseLink(userId: string): Promise<string | null> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return null;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                member_limit: 1,
                expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                name: `user-${userId.slice(0, 8)}`,
            }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
            console.error("Telegram createChatInviteLink failed:", json.description);
            return null;
        }
        return json.result.invite_link as string;
    } catch (err: any) {
        console.error("Telegram request failed:", err.message);
        return null;
    }
}

// The ONLY place invite links are produced. The browser opens this URL; the server checks the pass,
// then redirects, so no Telegram link or bot token ever ships in page code.
export async function GET(request: Request) {
    const origin = new URL(request.url).origin;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);

    const access = await getKillzoneAccess(user.id);
    if (!access.hasAccess) return NextResponse.redirect(`${origin}/community/killzone`);

    // 1. Preferred: a fresh single-use link for this student. 2. Fallback: the shared KILLZONE_TELEGRAM_URL.
    const invite = (await createSingleUseLink(user.id)) ?? process.env.KILLZONE_TELEGRAM_URL;

    if (!invite || !/^https:\/\/t\.me\//.test(invite)) {
        console.error("No usable Telegram invite link (check the bot variables or KILLZONE_TELEGRAM_URL).");
        return NextResponse.json({ error: "The community link is not set up yet. Please contact support." }, { status: 503 });
    }

    const res = NextResponse.redirect(invite);
    res.headers.set("Cache-Control", "no-store");
    return res;
}
