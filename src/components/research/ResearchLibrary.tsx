"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PublicationArt from "./PublicationArt";
import { CORE_CATEGORIES, formatDate, type ResearchSummary } from "@/lib/research/format";

interface Props {
    articles: ResearchSummary[];
    /** The publication shown in the featured block; it is left out of the grid until a search or filter is used. */
    featuredSlug: string | null;
    initialCategory: string;
    initialQuery: string;
}

const ALL = "All";

export default function ResearchLibrary({ articles, featuredSlug, initialCategory, initialQuery }: Props) {
    const [category, setCategory] = useState(initialCategory || ALL);
    const [query, setQuery] = useState(initialQuery || "");

    // The five core categories always appear; any other category an editor has used is added after them.
    const categories = useMemo(() => {
        const extras = new Map<string, string>();
        for (const article of articles) {
            const known = CORE_CATEGORIES.some((c) => c.toLowerCase() === article.category.toLowerCase());
            if (!known) extras.set(article.category.toLowerCase(), article.category);
        }
        return [ALL, ...CORE_CATEGORIES, ...extras.values()];
    }, [articles]);

    const counts = useMemo(() => {
        const map = new Map<string, number>();
        for (const article of articles) {
            const key = article.category.toLowerCase();
            map.set(key, (map.get(key) || 0) + 1);
        }
        return map;
    }, [articles]);

    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtering = category !== ALL || tokens.length > 0;

    const matches = useMemo(() => {
        return articles.filter((article) => {
            if (category !== ALL && article.category.toLowerCase() !== category.toLowerCase()) return false;
            if (!tokens.length) return true;
            const haystack = [article.title, article.summary, article.category, article.tags.join(" ")].join(" ").toLowerCase();
            return tokens.every((token) => haystack.includes(token));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articles, category, query]);

    const visible = filtering ? matches : matches.filter((article) => article.slug !== featuredSlug);

    function selectCategory(next: string) {
        setCategory(next);
        try {
            const url = new URL(window.location.href);
            if (next === ALL) url.searchParams.delete("category");
            else url.searchParams.set("category", next);
            window.history.replaceState(window.history.state, "", url.toString());
        } catch {
            /* the address bar is a convenience only */
        }
    }

    function clearAll() {
        setQuery("");
        selectCategory(ALL);
    }

    const status = !filtering
        ? `${articles.length} ${articles.length === 1 ? "publication" : "publications"}`
        : `${matches.length} ${matches.length === 1 ? "result" : "results"}${tokens.length ? ` for “${query.trim()}”` : ""}${category !== ALL ? ` in ${category}` : ""}`;

    return (
        <div>
            <div className="mb-8 border-y border-terminal-border py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div role="group" aria-label="Filter by category" className="-mx-1 flex flex-wrap gap-2">
                        {categories.map((item) => {
                            const active = category.toLowerCase() === item.toLowerCase();
                            const count = item === ALL ? articles.length : counts.get(item.toLowerCase()) || 0;
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => selectCategory(item)}
                                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border px-3.5 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold ${
                                        active
                                            ? "border-terminal-gold bg-terminal-gold font-semibold text-terminal-bg"
                                            : "border-terminal-border text-terminal-muted hover:border-terminal-gold/60 hover:text-terminal-text"
                                    }`}
                                >
                                    {item}
                                    <span className={`font-mono text-[10px] ${active ? "text-terminal-bg/70" : "text-terminal-muted/70"}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full lg:max-w-sm">
                        <label htmlFor="research-search" className="sr-only">
                            Search publications by title, summary or category
                        </label>
                        <svg
                            viewBox="0 0 20 20"
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-terminal-muted"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            aria-hidden="true"
                        >
                            <circle cx="9" cy="9" r="5.5" />
                            <path d="M13.5 13.5 17 17" strokeLinecap="round" />
                        </svg>
                        <input
                            id="research-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search titles, summaries, categories"
                            autoComplete="off"
                            className="h-11 w-full rounded-[4px] border border-terminal-border bg-terminal-bg pl-10 pr-10 text-base text-terminal-text placeholder:text-terminal-muted/70 focus:border-terminal-gold focus:outline-none sm:text-sm"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                aria-label="Clear search"
                                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[4px] text-terminal-muted hover:text-terminal-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-terminal-gold"
                            >
                                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                                    <path d="M5 5l10 10M15 5L5 15" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[.14em] text-terminal-muted" role="status" aria-live="polite">
                    {status}
                </p>
            </div>

            {visible.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((article) => (
                        <article
                            key={article.id}
                            className="group relative flex flex-col overflow-hidden rounded-md border border-terminal-border bg-terminal-surface transition-colors focus-within:border-terminal-gold hover:border-terminal-gold/50"
                        >
                            <div className="relative h-36 border-b border-terminal-border bg-terminal-bg">
                                <PublicationArt slug={article.slug} category={article.category} />
                                <span className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[.18em] text-terminal-gold">
                                    {article.category}
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col p-5 sm:p-6">
                                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-terminal-muted">
                                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{article.readingMinutes} min read</span>
                                </div>
                                <h3 className="font-headline text-[1.3rem] leading-snug text-terminal-text">
                                    <Link
                                        href={`/research/${encodeURIComponent(article.slug)}`}
                                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-terminal-gold"
                                    >
                                        {article.title}
                                    </Link>
                                </h3>
                                {article.summary && <p className="mt-3 line-clamp-3 text-sm leading-6 text-terminal-muted">{article.summary}</p>}
                                <span className="mt-auto pt-6 text-xs font-semibold tracking-wide text-terminal-gold">
                                    Read the report <span aria-hidden="true">&rarr;</span>
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {visible.length === 0 && filtering && (
                <div className="rounded-md border border-terminal-border bg-terminal-surface px-6 py-12 text-center">
                    <p className="font-headline text-xl text-terminal-text">No publications match.</p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-terminal-muted">
                        {category !== ALL && !tokens.length
                            ? `There is nothing published under ${category} yet. New reports appear here as soon as they are released.`
                            : "Try a broader search term, or look across all categories."}
                    </p>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="mt-6 inline-flex min-h-[40px] items-center rounded-[4px] border border-terminal-border px-4 text-[13px] text-terminal-text hover:border-terminal-gold/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terminal-gold"
                    >
                        Show all publications
                    </button>
                </div>
            )}

            {visible.length === 0 && !filtering && articles.length > 0 && (
                <p className="rounded-md border border-dashed border-terminal-border px-6 py-10 text-center text-sm leading-6 text-terminal-muted">
                    The featured report above is the only publication so far. Further reports appear here as soon as they are released.
                </p>
            )}
        </div>
    );
}
