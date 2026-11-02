import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyProviderError } from "@/lib/auth/oauth-errors";

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

    // Google or Supabase reported a problem. Only a real "access_denied" means the visitor pressed
    // Cancel; anything else (for example "Database error saving new user") used to be shown as
    // "cancelled", which hid the real cause. The details go to the server log.
    const providerError = searchParams.get("error");
    if (providerError) {
        console.error(
            "Google sign-in was rejected:",
            providerError,
            searchParams.get("error_code"),
            searchParams.get("error_description")
        );
        const key = classifyProviderError(providerError, searchParams.get("error_description"));
        return NextResponse.redirect(`${origin}/login?error=${key}`);
    }

    if (code) {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                // Behind a proxy / load balancer the real public host arrives in x-forwarded-host
                const forwardedHost = request.headers.get("x-forwarded-host");
                const isLocal = process.env.NODE_ENV === "development";
                const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;
                return NextResponse.redirect(`${base}${next}`);
            }
            // Usually "PKCE code verifier not found": sign-in started on one address (www / no www,
            // localhost) and finished on another, or cookies were blocked
            console.error("Google sign-in code exchange failed:", error.message);
            return NextResponse.redirect(`${origin}/login?error=oauth_session`);
        } catch (err: any) {
            // For example Supabase unreachable or its settings missing: show the login page, not a crash
            console.error("Google sign-in crashed:", err?.message || err);
            return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
        }
    }

    console.error("Google sign-in callback was opened without a code or an error");
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
