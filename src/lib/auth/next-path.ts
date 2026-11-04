/** Only allow same-origin relative paths, so login cannot be used as an open redirect. */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
    if (!raw) return fallback;
    let value = raw.trim();
    try {
        value = decodeURIComponent(value);
    } catch {
        return fallback;
    }
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
        return fallback;
    }
    return value;
}

/** Cookie that carries "where to go after sign-in" through Google sign-in and email-confirmation links. */
export const NEXT_COOKIE = "sc-next";

/**
 * BROWSER ONLY. Remembers the destination for ~30 minutes, so it survives a round trip through Google or the
 * confirmation email. Passing the default destination (/dashboard) clears any remembered one.
 */
export function rememberNextPath(next: string) {
    if (typeof document === "undefined") return;
    const maxAge = next === "/dashboard" ? 0 : 1800;
    document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${maxAge}; samesite=lax`;
}
