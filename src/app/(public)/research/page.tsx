import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Always show what is published right now
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

const SAMPLE_ARTICLES: ResearchArticle[] = [
    {
        id: "1",
        title: "Sub-Saharan Africa Macroeconomic Outlook Q4 2026: Monetary Divergence and Currency Dynamics",
        slug: "sub-saharan-africa-macroeconomic-outlook-q4-2026",
        summary: "An analysis of central bank interest rate trajectories across East and West Africa, foreign exchange reserves, and debt sustainability frameworks.",
        category: "Macroeconomics",
        author: "Savanna Research Team",
        publishedAt: "2026-10-15",
        readTime: "8 min read",
    },
    {
        id: "2",
        title: "Kenyan Infrastructure Bonds & Yield Curve Mechanics: Secondary Market Pricing Analysis",
        slug: "kenyan-infrastructure-bonds-yield-curve-mechanics",
        summary: "Evaluating tax-free yield differentials across Central Bank of Kenya auctions, real yields against domestic inflation, and institutional liquidity flows.",
        category: "Fixed Income",
        author: "Quantitative Research Group",
        publishedAt: "2026-10-02",
        readTime: "12 min read",
    },
    {
        id: "3",
        title: "Banking Sector Earnings Review: Asset Quality, NPL Ratios & Digital Banking Margins",
        slug: "banking-sector-earnings-review-q3-2026",
        summary: "Comparative financial performance analysis of major listed financial institutions across the Nairobi Securities Exchange (NSE).",
        category: "Equities",
        author: "Equity Strategy Desk",
        publishedAt: "2026-09-24",
        readTime: "10 min read",
    },
    {
        id: "4",
        title: "Central Bank Policy Rate Transmission & Domestic Credit Growth",
        slug: "cbk-policy-rate-transmission-credit-growth",
        summary: "Empirical study on how CBR adjustment cycles influence commercial lending rates, private sector credit extension, and Money Market Fund yields.",
        category: "Policy",
        author: "Savanna Research Team",
        publishedAt: "2026-09-10",
        readTime: "15 min read",
    },
];

async function getPublishedArticles(): Promise<ResearchArticle[]> {
    try {
        const supabase = await createClient();
        // Row-level security only lets visitors read published articles
        const { data, error } = await supabase
            .from("research_articles")
            .select("id, title, slug, summary, category, body, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100);
        if (error || !data) return [];
        return data.map((a: any) => ({
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

export default async function ResearchLibraryPage() {
    // Articles published from /admin/content. Until the first one is published,
    // the original sample reports stay on the page so it is never empty.
    const published = await getPublishedArticles();
    const articles = published.length ? published : SAMPLE_ARTICLES;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="border-b border-terminal-border pb-8 mb-10">
                <div className="inline-flex items-center space-x-2 text-xs font-mono text-terminal-gold mb-3">
                    <span>MODULE // RESEARCH & INTELLIGENCE</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-terminal-text tracking-tight mb-4">
                    Institutional Research Library
                </h1>
                <p className="text-terminal-muted max-w-3xl text-base md:text-lg">
                    Rigorous, empirical macroeconomic analysis, fixed income commentary, and market intelligence tailored for regional institutional investors and analysts.
                </p>
            </div>

            {/* Filter / Search Bar Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-terminal-surface p-4 rounded-lg border border-terminal-border mb-8">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-terminal-muted mr-2">CATEGORY:</span>
                    <button className="px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg font-semibold">ALL</button>
                    <button className="px-3 py-1.5 rounded bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border">MACROECONOMICS</button>
                    <button className="px-3 py-1.5 rounded bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border">FIXED INCOME</button>
                    <button className="px-3 py-1.5 rounded bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border">EQUITIES</button>
                    <button className="px-3 py-1.5 rounded bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border">POLICY</button>
                </div>
                <div className="font-mono text-xs text-terminal-muted">
                    SHOWING: <span className="text-terminal-gold font-bold">{articles.length}</span> REPORTS
                </div>
            </div>

            {/* Article Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map((article) => (
                    <article
                        key={article.id}
                        className="p-6 rounded-lg bg-terminal-surface border border-terminal-border hover:border-terminal-gold/50 transition-all flex flex-col justify-between group"
                    >
                        <div>
                            <div className="flex items-center justify-between text-xs font-mono text-terminal-muted mb-3">
                                <span className="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-terminal-gold">
                                    {article.category}
                                </span>
                                <span>{article.readTime}</span>
                            </div>

                            <h2 className="text-xl font-bold text-terminal-text group-hover:text-terminal-gold transition-colors mb-3 leading-snug">
                                <Link href={`/research/${article.slug}`}>
                                    {article.title}
                                </Link>
                            </h2>

                            <p className="text-sm text-terminal-muted line-clamp-3 mb-6">
                                {article.summary}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-terminal-border/50 flex items-center justify-between text-xs font-mono text-terminal-muted">
                            <span>AUTH: {article.author}</span>
                            <span>PUB: {article.publishedAt}</span>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}