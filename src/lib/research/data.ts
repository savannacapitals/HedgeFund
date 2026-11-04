import { createClient } from "@/lib/supabase/server";
import { HOUSE_AUTHOR, normalizeCategory, readingMinutes, type ResearchSummary } from "./format";

/**
 * SERVER ONLY. Reads the existing `research_articles` table through the normal Supabase server
 * client, so row-level security still decides what a visitor can see (published articles only).
 */

interface LibraryRow {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    category: string | null;
    tags: string[] | null;
    body: string | null;
    published_at: string | null;
    created_at: string | null;
}

export interface ResearchArticle extends ResearchSummary {
    body: string;
}

function toArticle(row: LibraryRow): ResearchArticle {
    const body = String(row.body || "");
    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: String(row.summary || "").trim(),
        category: normalizeCategory(row.category || ""),
        tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
        author: HOUSE_AUTHOR,
        publishedAt: row.published_at || row.created_at || "",
        readingMinutes: readingMinutes(body),
        body,
    };
}

/** Everything published, newest first. `failed` is true when the database could not be reached. */
export async function getPublishedArticles(): Promise<{ articles: ResearchSummary[]; failed: boolean }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("research_articles")
            .select("id, title, slug, summary, category, tags, body, published_at, created_at")
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(100);
        if (error || !data) return { articles: [], failed: true };

        const articles = (data as LibraryRow[]).map((row) => {
            // The body is only needed here to work out the reading time; it is not sent to the browser.
            const { body: _body, ...summary } = toArticle(row);
            return summary;
        });
        return { articles, failed: false };
    } catch {
        return { articles: [], failed: true };
    }
}

export async function getArticleBySlug(slug: string): Promise<ResearchArticle | null> {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from("research_articles")
            .select("id, title, slug, summary, category, tags, body, published_at, created_at")
            .eq("slug", slug)
            .eq("status", "published")
            .maybeSingle();
        return data ? toArticle(data as LibraryRow) : null;
    } catch {
        return null;
    }
}
