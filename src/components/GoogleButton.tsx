"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Continue with Google" button plus an OR divider. Used on the sign-in and register pages.
// Colours come from the terminal-* theme tokens, so it follows Light / Dark / Device.
export default function GoogleButton({
    next = "/dashboard",
    onError,
}: {
    next?: string;
    onError?: (message: string) => void;
}) {
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        onError?.("");
        try {
            // Supabase only redirects back to a URL that matches its "Redirect URLs" list, and a URL
            // with a ?next=... tail does NOT match an entry for plain /auth/callback (it then falls back
            // to the Site URL and the sign-in never completes). So the default destination is sent
            // without a query string; only a custom `next` needs the wildcard entry described in
            // GOOGLE_SIGNIN_SETUP.md.
            const callback = `${window.location.origin}/auth/callback`;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: next === "/dashboard" ? callback : `${callback}?next=${encodeURIComponent(next)}`,
                    queryParams: { prompt: "select_account" }, // always let them pick which Google account
                },
            });
            // On success the browser is already leaving for Google, so there is nothing more to do
            if (error) throw error;
        } catch (err: any) {
            console.error("Google sign-in failed:", err);
            onError?.(err?.message || "Could not start Google sign-in. Please try again.");
            setLoading(false);
        }
    }

    return (
        <div className="mb-6">
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded border border-terminal-border bg-terminal-bg text-terminal-text text-sm font-semibold hover:border-terminal-gold/60 transition-colors disabled:opacity-50"
            >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                    <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.21-2.36H12v4.46h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.72Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3A7.2 7.2 0 0 1 12 19.2a7.2 7.2 0 0 1-6.76-4.97H1.24v3.1A12 12 0 0 0 12 24Z" />
                    <path fill="#FBBC05" d="M5.24 14.23a7.2 7.2 0 0 1 0-4.46v-3.1H1.24a12 12 0 0 0 0 10.66l4-3.1Z" />
                    <path fill="#EA4335" d="M12 4.8c1.76 0 3.34.61 4.58 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.24 6.67l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
                </svg>
                {loading ? "REDIRECTING TO GOOGLE..." : "CONTINUE WITH GOOGLE"}
            </button>

            <div className="flex items-center gap-3 mt-6 text-[10px] font-mono tracking-widest text-terminal-muted">
                <span className="h-px flex-1 bg-terminal-border" />
                OR
                <span className="h-px flex-1 bg-terminal-border" />
            </div>
        </div>
    );
}
