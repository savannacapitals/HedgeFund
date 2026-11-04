import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/research/ArticleBody";
import ArticleToc from "@/components/research/ArticleToc";
import PublicationArt from "@/components/research/PublicationArt";
import { getArticleBySlug } from "@/lib/research/data";
import { categoryHref, formatDate, parseBody, tagHref } from "@/lib/research/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) return { title: "Research" };
    return {
        title: article.title,
        description: article.summary || undefined,
        openGraph: {
            title: article.title,
            description: article.summary || undefined,
            type: "article",
            publishedTime: article.publishedAt || undefined,
            section: article.category,
            tags: article.tags,
        },
    };
}

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    const { blocks, toc } = parseBody(article.body);
    const showToc = toc.length >= 2;

    return (
        <article>
            {/* ---------------------------------------------------------------- Header */}
            <header className="border-b border-terminal-border">
                <div className="mx-auto max-w-7xl px-6 pb-10 pt-8 sm:pb-14 sm:pt-10">
                    <Link
                        href="/research#library"
                        className="inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] uppercase tracking-[.16em] text-terminal-muted transition-colors hover:text-terminal-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold"
                    >
                        <span aria-hidden="true">&larr;</span> Research library
                    </Link>

                    <div className="mt-8 max-w-4xl">
                        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[.14em] text-terminal-muted">
                            <Link
                                href={categoryHref(article.category)}
                                className="rounded-[3px] border border-terminal-gold/50 px-2.5 py-1 text-terminal-gold transition-colors hover:bg-terminal-gold hover:text-terminal-bg"
                            >
                                {article.category}
                            </Link>
                            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, "long")}</time>
                            <span>{article.readingMinutes} min read</span>
                        </div>
                        <h1 className="font-sans text-[2.15rem] leading-[1.12] tracking-[-0.015em] text-terminal-text sm:text-5xl lg:text-[3.4rem]">
                            {article.title}
                        </h1>
                        <p className="mt-7 text-sm text-terminal-muted">
                            By <span className="font-semibold text-terminal-text">{article.author}</span>
                        </p>
                    </div>

                    <div className="mt-10 h-20 overflow-hidden rounded-md border border-terminal-border bg-terminal-bg sm:h-28">
                        <PublicationArt slug={article.slug} category={article.category} />
                    </div>
                </div>
            </header>

            {/* ---------------------------------------------------------------- Reading area */}
            <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
                <div className={showToc ? "grid gap-x-16 lg:grid-cols-[15rem_minmax(0,44rem)] lg:justify-center" : "mx-auto max-w-[44rem]"}>
                    {showToc && (
                        <aside className="hidden lg:block">
                            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                                <ArticleToc items={toc} variant="sidebar" />
                            </div>
                        </aside>
                    )}

                    <div className="min-w-0">
                        {article.summary && (
                            <section
                                aria-labelledby="executive-summary"
                                className="mb-12 rounded-md border border-terminal-border border-l-[3px] border-l-terminal-gold bg-terminal-surface p-6 sm:p-8"
                            >
                                <h2 id="executive-summary" className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-terminal-gold">
                                    Executive summary
                                </h2>
                                <p className="font-sans text-[1.2rem] leading-[1.7] text-terminal-text sm:text-[1.35rem]">{article.summary}</p>
                            </section>
                        )}

                        {showToc && (
                            <div className="lg:hidden">
                                <ArticleToc items={toc} variant="inline" />
                            </div>
                        )}

                        <ArticleBody blocks={blocks} />

                        {/* ------------------------------------------------ Tags */}
                        {article.tags.length > 0 && (
                            <div className="mt-14 border-t border-terminal-border pt-8">
                                <p className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-terminal-muted">Topics</p>
                                <ul className="flex flex-wrap gap-2">
                                    {article.tags.map((tag) => (
                                        <li key={tag}>
                                            <Link
                                                href={tagHref(tag)}
                                                className="inline-flex min-h-[36px] items-center rounded-[4px] border border-terminal-border px-3 font-mono text-[11px] text-terminal-muted transition-colors hover:border-terminal-gold/60 hover:text-terminal-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-terminal-gold"
                                            >
                                                {tag}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ------------------------------------------------ Disclaimer */}
                        <aside role="note" aria-labelledby="research-disclaimer" className="mt-12 rounded-md border border-terminal-border bg-terminal-surface p-6">
                            <h2 id="research-disclaimer" className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-terminal-gold">
                                Research disclaimer
                            </h2>
                            <p className="text-[13px] leading-6 text-terminal-muted">
                                This publication is issued by Savanna Capitals for general information and discussion only. It is not investment, legal,
                                tax or accounting advice, and it is not an offer or solicitation to buy or sell any security or financial instrument.
                                Views and estimates reflect the judgement of the author at the date of publication and may change without notice.
                                Information is drawn from sources believed to be reliable, but its accuracy and completeness are not guaranteed.
                                Investing in African and other emerging or frontier markets, in fixed income, equities and digital assets, involves risk,
                                including the loss of capital, and past performance is not a reliable guide to future results. Obtain independent
                                professional advice before acting on anything you read here.
                            </p>
                        </aside>

                        <div className="mt-10 border-t border-terminal-border pt-8">
                            <Link
                                href="/research#library"
                                className="inline-flex min-h-[48px] items-center gap-3 rounded-[4px] border border-terminal-border px-5 text-[13px] font-semibold text-terminal-text transition-colors hover:border-terminal-gold/60 hover:text-terminal-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold"
                            >
                                <span aria-hidden="true">&larr;</span> Return to the research library
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
