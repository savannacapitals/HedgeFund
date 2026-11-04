/**
 * Pure helpers shared by the research pages. No server-only imports here, so this file is safe
 * to use from client components as well.
 */

export const CORE_CATEGORIES = ["Macroeconomics", "Fixed Income", "Equities", "Policy", "Digital Assets"] as const;

/** Short descriptors for the coverage index. They describe scope only, not any particular publication. */
export const CATEGORY_SCOPE: Record<(typeof CORE_CATEGORIES)[number], string> = {
    Macroeconomics: "Growth, inflation, external balances and currencies",
    "Fixed Income": "Sovereign curves, credit and money markets",
    Equities: "Listed companies, sectors and earnings",
    Policy: "Monetary, fiscal and regulatory developments",
    "Digital Assets": "Market structure, stablecoins and regulation",
};

/** The articles table stores an author id, but profiles are not publicly readable, so the byline is the desk. */
export const HOUSE_AUTHOR = "Savanna Research";

export const WORDS_PER_MINUTE = 200;

export interface ResearchSummary {
    id: string;
    title: string;
    slug: string;
    summary: string;
    category: string;
    tags: string[];
    author: string;
    /** ISO timestamp, or empty string when unknown */
    publishedAt: string;
    readingMinutes: number;
}

export function wordCount(text: string): number {
    const trimmed = String(text || "").trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function readingMinutes(body: string): number {
    return Math.max(1, Math.round(wordCount(body) / WORDS_PER_MINUTE));
}

/** Fixed locale and UTC so server and browser always print the same string. */
export function formatDate(iso: string, style: "short" | "long" = "short"): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: style === "long" ? "long" : "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

/** Maps "fixed income" or " Fixed Income " onto the canonical spelling; unknown categories are kept as typed. */
export function normalizeCategory(category: string): string {
    const trimmed = String(category || "").trim();
    const match = CORE_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    return match || trimmed || "Research";
}

export function categoryHref(category: string): string {
    return `/research?category=${encodeURIComponent(category)}#library`;
}

export function tagHref(tag: string): string {
    return `/research?q=${encodeURIComponent(tag)}#library`;
}

/* ------------------------------------------------------------------ */
/* Article body                                                         */
/* ------------------------------------------------------------------ */

export type ArticleBlock =
    | { type: "heading"; level: 2 | 3; id: string; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "quote"; text: string }
    | { type: "rule" };

export interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
}

/** Removes the lightweight inline markers so headings and the contents list show clean text. */
export function stripInline(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*\s][^*]*)\*/g, "$1")
        .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, "$1")
        .trim();
}

function slugifyHeading(text: string): string {
    return (
        text
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "section"
    );
}

/**
 * Turns the plain-text article body into display blocks.
 *
 * What editors already write keeps working: blank lines separate paragraphs and a line starting
 * with "## " is a heading. Also understood:
 *   ### Subheading        - item / * item        1. item        > quote        ---
 * Nothing is ever injected as HTML.
 */
export function parseBody(body: string): { blocks: ArticleBlock[]; toc: TocItem[] } {
    const lines = String(body || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks: ArticleBlock[] = [];
    const toc: TocItem[] = [];
    const usedIds = new Map<string, number>();

    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let quote: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
        paragraph = [];
    };
    const flushList = () => {
        if (list && list.items.length) blocks.push({ type: "list", ordered: list.ordered, items: list.items });
        list = null;
    };
    const flushQuote = () => {
        if (quote.length) blocks.push({ type: "quote", text: quote.join("\n") });
        quote = [];
    };
    const flushAll = () => {
        flushParagraph();
        flushList();
        flushQuote();
    };

    const uniqueId = (text: string) => {
        const base = slugifyHeading(text);
        const seen = usedIds.get(base) || 0;
        usedIds.set(base, seen + 1);
        return seen === 0 ? base : `${base}-${seen + 1}`;
    };

    for (const raw of lines) {
        const line = raw.trim();

        if (!line) {
            flushAll();
            continue;
        }

        const heading = line.match(/^(#{1,4})\s+(.+)$/);
        if (heading) {
            flushAll();
            const text = stripInline(heading[2]);
            if (!text) continue;
            const level: 2 | 3 = heading[1].length <= 2 ? 2 : 3;
            const id = uniqueId(text);
            blocks.push({ type: "heading", level, id, text });
            toc.push({ id, text, level });
            continue;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            flushAll();
            blocks.push({ type: "rule" });
            continue;
        }

        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
            flushParagraph();
            flushQuote();
            if (!list || list.ordered) {
                flushList();
                list = { ordered: false, items: [] };
            }
            list.items.push(bullet[1]);
            continue;
        }

        const numbered = line.match(/^\d{1,3}[.)]\s+(.+)$/);
        if (numbered) {
            flushParagraph();
            flushQuote();
            if (!list || !list.ordered) {
                flushList();
                list = { ordered: true, items: [] };
            }
            list.items.push(numbered[1]);
            continue;
        }

        const quoted = line.match(/^>\s?(.*)$/);
        if (quoted) {
            flushParagraph();
            flushList();
            quote.push(quoted[1]);
            continue;
        }

        // An indented line straight after a list item continues that item
        if (list && list.items.length && /^\s+/.test(raw)) {
            list.items[list.items.length - 1] += ` ${line}`;
            continue;
        }

        flushList();
        flushQuote();
        paragraph.push(line);
    }
    flushAll();

    return { blocks, toc };
}
