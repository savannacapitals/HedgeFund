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
