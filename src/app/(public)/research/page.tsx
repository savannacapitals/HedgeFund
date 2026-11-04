import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ResearchArticle {
    id: string;
    title: string;
    slug: string;
    summary: string;
    category: string;
    author: string;
    publishedAt: string;
    readTime: string;
}

const CATEGORIES = ["All", "Macroeconomics", "Fixed Income", "Equities", "Policy"] as const;

const FORTHCOMING: { title: string; summary: string; category: string }[] = [
    {
        title: "Sub-Saharan Africa macroeconomic outlook: monetary divergence and currency dynamics",
        summary: "Central bank rate paths across East and West Africa, reserves, and debt sustainability — published when the desk completes verification.",
        category: "Macroeconomics",
    },
    {
        title: "Kenyan infrastructure bonds and yield-curve mechanics",
        summary: "Auction differentials, real yields against domestic inflation, and institutional liquidity on the secondary market.",
        category: "Fixed Income",
    },
    {
        title: "Banking sector earnings: asset quality, NPLs and digital margins",
        summary: "A comparative look at listed financials on the Nairobi Securities Exchange.",
        category: "Equities",
    },
    {
        title: "Policy-rate transmission and domestic credit growth",
        summary: "How CBR cycles move lending rates, private-sector credit and money-market fund yields.",
        category: "Policy",
    },
];

async function getPublishedArticles(): Promise<ResearchArticle[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("research_articles")
            .select("id, title, slug, summary, category, body, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100);
        if (error || !data) return [];
        return data.map((a: { id: string; title: string; slug: string; summary: string | null; category: string; body: string | null; published_at: string | null }) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            summary: a.summary || "",
            category: a.category,
            author: "Savanna Research",
            publishedAt: (a.published_at || "").slice(0, 10),
            readTime: `${Math.max(1, Math.round(String(a.body || "").split(/\s+/).length / 200))} min read`,
        }));
    } catch {
        return [];
    }
}

export default async function ResearchLibraryPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category: rawCategory } = await searchParams;
    const category = CATEGORIES.includes(rawCategory as (typeof CATEGORIES)[number]) ? (rawCategory as string) : "All";
    const published = await getPublishedArticles();
    const articles = category === "All" ? published : published.filter((article) => article.category === category);
    const forthcoming = category === "All" ? FORTHCOMING : FORTHCOMING.filter((item) => item.category === category);

    return (
        <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-10 border-b border-terminal-border pb-8">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">Research &amp; intelligence</p>
                <h1 className="mb-4 text-3xl font-semibold tracking-[-.04em] text-terminal-text md:text-5xl">
                    See beyond the headline.
                </h1>
                <p className="max-w-3xl text-base text-terminal-muted md:text-lg">
                    Independent analysis of African and global markets — policy, rates, credit and listed companies — written for people who allocate capital carefully.
                </p>
            </div>

            <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-terminal-border bg-terminal-surface p-4 md:flex-row md:items-center">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="mr-1 text-terminal-muted">Category</span>
                    {CATEGORIES.map((item) => (
                        <Link
                            key={item}
                            href={item === "All" ? "/research" : `/research?category=${encodeURIComponent(item)}`}
                            className={`rounded-full px-3 py-1.5 ${category === item ? "bg-terminal-gold font-semibold text-terminal-bg" : "border border-terminal-border bg-terminal-bg text-terminal-muted hover:text-terminal-text"}`}
                        >
                            {item}
                        </Link>
                    ))}
                </div>
                <p className="text-xs text-terminal-muted">
                    {articles.length} published{forthcoming.length && articles.length === 0 ? ` · ${forthcoming.length} forthcoming` : ""}
                </p>
            </div>

            {articles.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {articles.map((article) => (
                        <article
                            key={article.id}
                            className="group flex flex-col justify-between rounded-2xl border border-terminal-border bg-terminal-surface p-6 transition hover:border-terminal-gold/50"
                        >
                            <div>
                                <div className="mb-3 flex items-center justify-between text-xs text-terminal-muted">
                                    <span className="rounded-full border border-terminal-border bg-terminal-bg px-2 py-0.5 text-terminal-gold">{article.category}</span>
                                    <span>{article.readTime}</span>
                                </div>
                                <h2 className="mb-3 text-xl font-semibold leading-snug text-terminal-text transition group-hover:text-terminal-gold">
                                    <Link href={`/research/${article.slug}`}>{article.title}</Link>
                                </h2>
                                <p className="mb-6 line-clamp-3 text-sm text-terminal-muted">{article.summary}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-terminal-border/50 pt-4 text-xs text-terminal-muted">
                                <span>{article.author}</span>
                                <span>{article.publishedAt}</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {articles.length === 0 && (
                <div className="mb-8 rounded-2xl border border-terminal-border bg-terminal-surface px-6 py-10">
                    <h2 className="text-lg font-semibold text-terminal-text">The live library is still being filled</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-terminal-muted">
                        Published reports appear here as soon as the desk marks them live. Until then, these are the briefs in preparation — they are not clickable articles.
                    </p>
                </div>
            )}

            {articles.length === 0 && forthcoming.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {forthcoming.map((item) => (
                        <article key={item.title} className="rounded-2xl border border-dashed border-terminal-border bg-terminal-surface/60 p-6">
                            <div className="mb-3 flex items-center justify-between text-xs">
                                <span className="rounded-full border border-terminal-border px-2 py-0.5 text-terminal-gold">{item.category}</span>
                                <span className="text-terminal-muted">Forthcoming</span>
                            </div>
                            <h2 className="mb-3 text-xl font-semibold leading-snug text-terminal-text">{item.title}</h2>
                            <p className="text-sm text-terminal-muted">{item.summary}</p>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
