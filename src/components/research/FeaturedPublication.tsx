import Link from "next/link";
import type { PublicationSummary } from "@/lib/research/shared";
import { RESEARCH_BYLINE } from "@/lib/research/shared";
import PublicationCover from "./PublicationCover";
import { ReadTime } from "./PublicationCard";
import styles from "./research.module.css";

export default function FeaturedPublication({ article }: { article: PublicationSummary }) {
    const monthLabel = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
        : undefined;

    return (
        <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mb-8 flex items-end justify-between gap-4 border-b border-terminal-border pb-4">
                <div>
                    <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[.22em] text-terminal-gold">Featured research</p>
                    <h2 id="featured-heading" className={`${styles.display} text-3xl font-semibold tracking-[-.01em] text-terminal-text md:text-4xl`}>
                        Latest publication
                    </h2>
                </div>
            </div>

            <article className="group relative grid items-stretch gap-0 border border-terminal-border bg-terminal-surface transition-colors duration-200 hover:border-terminal-gold/60 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <PublicationCover seed={article.slug} category={article.category} label={monthLabel} className="h-full lg:aspect-auto lg:min-h-[22rem]" />
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-5 lg:p-10">
                    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-[.16em]">
                        <span className="border border-terminal-gold/50 px-2 py-1 text-terminal-gold">{article.category}</span>
                        {article.dateLabel && <time dateTime={article.publishedAt || undefined} className="text-terminal-muted">{article.dateLabel}</time>}
                    </div>
                    <h3 className={`${styles.display} mb-4 text-[2.1rem] font-semibold leading-[1.05] tracking-[-.015em] text-terminal-text md:text-[2.6rem]`}>
                        <Link href={`/research/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold">
                            {article.title}
                        </Link>
                    </h3>
                    {article.summary && <p className={`${styles.lineClamp3} ${styles.reading} mb-6 text-base leading-7 text-terminal-muted md:text-[1.05rem]`}>{article.summary}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-terminal-border pt-5 text-xs text-terminal-muted">
                        <span>{RESEARCH_BYLINE}</span>
                        <ReadTime minutes={article.readMinutes} />
                        <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-terminal-text transition-colors group-hover:text-terminal-gold">
                            Read the report
                            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </div>
                </div>
            </article>
        </section>
    );
}
