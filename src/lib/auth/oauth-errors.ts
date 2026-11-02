// Pure data and logic, safe to import from both the server (/auth/callback) and the browser (login page).
// The callback sends people back to /login?error=<key>; the login page turns the key into a message.

export type OAuthErrorKey = "oauth_cancelled" | "oauth_account" | "oauth_session" | "oauth_failed";

export const OAUTH_ERROR_MESSAGES: Record<OAuthErrorKey, string> = {
    oauth_cancelled: "Google sign-in was cancelled.",
    oauth_account:
        "Google sign-in worked, but your account could not be created. Please contact support, or register with your email instead.",
    oauth_session:
        "Google sign-in could not be completed. Start and finish on the same web address (with or without www), allow cookies, and try again.",
    oauth_failed: "Google sign-in failed. Please try again.",
};

/**
 * Turns the error Supabase hands back to /auth/callback into one of our keys.
 * Only a real "access_denied" (the visitor pressed Cancel) counts as cancelled: every other
 * problem used to be reported as "cancelled", which hid the real cause.
 */
export function classifyProviderError(error: string | null, description: string | null): OAuthErrorKey {
    if (description && /database error saving new user/i.test(description)) return "oauth_account";
    if (error === "access_denied") return "oauth_cancelled";
    return "oauth_failed";
}

/** The message for ?error=<code> on the login page, or null when there is nothing to show. */
export function oauthErrorMessage(code: string | null): string | null {
    if (!code) return null;
    return (OAUTH_ERROR_MESSAGES as Record<string, string>)[code] ?? OAUTH_ERROR_MESSAGES.oauth_failed;
}
