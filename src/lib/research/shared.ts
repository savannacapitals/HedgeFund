// Shared (server + client safe) helpers for the Research section.
// Nothing in here touches Supabase, so it can be imported from client components.

/** The five desks shown as filters. Articles in any other category still appear under "All". */
export const RESEARCH_CATEGORIES = ["Macroeconomics", "Fixed Income", "Equities", "Policy", "Digital Assets"] as const;

export const RESEARCH_BYLINE = "Savanna Research";

/** A publication as shown in the library: no article body, so it stays light to send to the browser. */
export interface PublicationSummary {
    id: string;
    title: string;
    slug: string;
    summary: string;
    category: string;
    tags: string[];
    publishedAt: string | null; // ISO timestamp
    dateLabel: string; // e.g. "4 Nov 2026" (formatted on the server so it can never mismatch on hydration)
    readMinutes: number;
}

/** Matches a stored category to the canonical spelling of one of the five desks, ignoring case and spacing. */
export function canonicalCategory(raw: string | null | undefined): string {
    const value = String(raw || "").trim().replace(/\s+/g, " ");
    if (!value) return "Research";
    const match = RESEARCH_CATEGORIES.find((c) => c.toLowerCase() === value.toLowerCase());
    return match || value;
}

export function countWords(body: string | null | undefined): number {
    return String(body || "").split(/\s+/).filter(Boolean).length;
}

/** Same 200 words-per-minute basis the library has always used. */
export function readingMinutes(body: string | null | undefined): number {
    return Math.max(1, Math.round(countWords(body) / 200));
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Lower-case, accent-free text used for forgiving search matching. */
export function normalise(text: string): string {
    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
