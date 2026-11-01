import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Google (via Supabase) sends the visitor back after they approve sign-in.
// Swaps the one-time ?code for a real login session, then forwards them on.

// Only allow redirects to pages on this site (blocks ?next=https://evil.com and //evil.com).
function safeNext(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
        return "/dashboard";
    }
    return value;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = safeNext(searchParams.get("next"));

    // Google or Supabase reported a problem (for example the visitor pressed Cancel)
    if (searchParams.get("error")) {
        return NextResponse.redirect(`${origin}/login?error=oauth_cancelled`);
    }

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Behind a proxy / load balancer the real public host arrives in x-forwarded-host
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocal = process.env.NODE_ENV === "development";
            const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;
            return NextResponse.redirect(`${base}${next}`);
        }
        console.error("Google sign-in code exchange failed:", error.message);
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
