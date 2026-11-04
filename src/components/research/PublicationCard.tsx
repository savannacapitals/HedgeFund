import Link from "next/link";
import type { PublicationSummary } from "@/lib/research/shared";
import PublicationCover from "./PublicationCover";
import styles from "./research.module.css";

export function ReadTime({ minutes }: { minutes: number }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 4.6V8l2.3 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {minutes} min read
        </span>
    );
}

export default function PublicationCard({ article }: { article: PublicationSummary }) {
    const monthLabel = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
        : undefined;

    return (
        <article className="group relative flex h-full flex-col border border-terminal-border bg-terminal-surface transition-colors duration-200 hover:border-terminal-gold/60">
            <PublicationCover seed={article.slug} category={article.category} label={monthLabel} />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[.16em]">
                    <span className="text-terminal-gold">{article.category}</span>
                    {article.dateLabel && <time dateTime={article.publishedAt || undefined} className="text-terminal-muted">{article.dateLabel}</time>}
                </div>
                <h3 className={`${styles.display} mb-3 text-[1.65rem] font-semibold leading-[1.1] tracking-[-.01em] text-terminal-text`}>
                    <Link href={`/research/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold">
                        {article.title}
                    </Link>
                </h3>
                {article.summary && <p className={`${styles.lineClamp3} mb-6 text-sm leading-6 text-terminal-muted`}>{article.summary}</p>}
                <div className="mt-auto flex items-center justify-between border-t border-terminal-border pt-4 text-xs text-terminal-muted">
                    <ReadTime minutes={article.readMinutes} />
                    <span className="inline-flex items-center gap-1.5 font-medium text-terminal-text transition-colors group-hover:text-terminal-gold">
                        Read report
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </div>
            </div>
        </article>
    );
}
