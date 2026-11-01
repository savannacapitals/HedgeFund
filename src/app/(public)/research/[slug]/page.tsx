import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
    const supabase = await createClient();
    // Row-level security only lets visitors read published articles
    const { data } = await supabase
        .from("research_articles")
        .select("title, summary, category, body, tags, published_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
    return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticle(slug);
    if (!article) return { title: "Research" };
    return { title: article.title, description: article.summary || undefined };
}

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticle(slug);
    if (!article) notFound();

    // Plain text in, paragraphs out. "## " starts a heading. Nothing is injected as HTML.
    const blocks = String(article.body || "")
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter(Boolean);
    const minutes = Math.max(1, Math.round(String(article.body || "").split(/\s+/).length / 200));

    return (
        <article className="max-w-3xl mx-auto px-6 py-12">
            <Link href="/research" className="text-xs font-mono text-terminal-gold hover:underline">
                &larr; Research library
            </Link>

            <header className="border-b border-terminal-border pb-8 mt-6 mb-8">
                <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted mb-4">
                    <span className="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-terminal-gold">{article.category}</span>
                    <span>{(article.published_at || "").slice(0, 10)}</span>
                    <span>{minutes} min read</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-terminal-text tracking-tight leading-tight mb-4">{article.title}</h1>
                {article.summary && <p className="text-terminal-muted text-lg">{article.summary}</p>}
            </header>

            <div className="space-y-5 text-terminal-text leading-relaxed">
                {blocks.map((b, i) =>
                    b.startsWith("## ") ? (
                        <h2 key={i} className="text-xl font-bold text-terminal-text pt-4">
                            {b.slice(3)}
                        </h2>
                    ) : (
                        <p key={i} className="whitespace-pre-line">
                            {b}
                        </p>
                    )
                )}
            </div>

            {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-terminal-border text-[11px] font-mono text-terminal-muted">
                    {article.tags.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded border border-terminal-border">
                            {t}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
