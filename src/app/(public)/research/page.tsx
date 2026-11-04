import type { Metadata } from "next";
import Link from "next/link";
import PublicationArt from "@/components/research/PublicationArt";
import ResearchLibrary from "@/components/research/ResearchLibrary";
import { getPublishedArticles } from "@/lib/research/data";
import { CATEGORY_SCOPE, CORE_CATEGORIES, categoryHref, formatDate } from "@/lib/research/format";

// Published articles must show up the moment an editor publishes them
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Research",
    description:
        "Independent analysis of African and global markets: macroeconomics, fixed income, equities, policy and digital assets.",
};

const PRINCIPLES = [
    {
        title: "Evidence before narrative",
        body: "Every argument rests on primary data, official sources and stated assumptions. Where the evidence is thin, we say so.",
    },
    {
        title: "Local structure, global standard",
        body: "African markets are analysed on their own terms, through market depth, policy regimes and currency mechanics, then set against global peers.",
    },
    {
        title: "Clarity over complexity",
        body: "Findings are written for people who allocate capital: the conclusion first, the supporting analysis after, and plain language wherever it will do.",
    },
    {
        title: "Independence and humility",
        body: "Our views are our own and reflect the evidence at the date of publication. We state limitations plainly and revise when the facts change.",
    },
];

function first(value: string | string[] | undefined): string {
    return (Array.isArray(value) ? value[0] : value) || "";
}

export default async function ResearchLibraryPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
    const params = await searchParams;
    const { articles, failed } = await getPublishedArticles();

    // Accept a category from the address only if it is one we actually have or cover
    const requested = first(params.category).trim().toLowerCase();
    const known = [...CORE_CATEGORIES, ...articles.map((a) => a.category)];
    const initialCategory = known.find((c) => c.toLowerCase() === requested) || "All";
    const initialQuery = first(params.q).slice(0, 80);

    const featured = articles[0] || null;
    const countFor = (category: string) => articles.filter((a) => a.category.toLowerCase() === category.toLowerCase()).length;

    return (
        <>
            {/* ---------------------------------------------------------------- Hero */}
            <section className="relative border-b border-terminal-border">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[.5] [mask-image:linear-gradient(to_bottom,black,transparent)]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgb(var(--t-border) / .55) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--t-border) / .55) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                    }}
                />
                <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-12 lg:gap-16 lg:pb-24 lg:pt-24">
                    <div className="lg:col-span-7">
                        <p className="mb-7 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-terminal-gold">
                            <span className="h-px w-8 bg-terminal-gold" aria-hidden="true" />
                            Savanna Research
                        </p>
                        <h1 className="font-headline text-[2.75rem] leading-[1.06] tracking-[-0.02em] text-terminal-text sm:text-6xl lg:text-[4.5rem]">
                            See <span className="text-terminal-gold">beyond</span> the headline.
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-8 text-terminal-muted sm:text-lg">
                            Independent analysis of African and global markets &mdash; policy, rates, credit and listed companies &mdash; written for
                            people who allocate capital carefully.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-3">
                            <a
                                href="#library"
                                className="inline-flex min-h-[48px] items-center gap-3 rounded-[4px] bg-terminal-gold px-5 text-[13px] font-semibold text-terminal-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold"
                            >
                                Browse the library <span aria-hidden="true">&darr;</span>
                            </a>
                            <a
                                href="#philosophy"
                                className="inline-flex min-h-[48px] items-center rounded-[4px] border border-terminal-border px-5 text-[13px] font-semibold text-terminal-text transition-colors hover:border-terminal-gold/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold"
                            >
                                Our research philosophy
                            </a>
                        </div>
                    </div>

                    <aside aria-label="Research coverage" className="lg:col-span-5">
                        <div className="rounded-md border border-terminal-border bg-terminal-surface">
                            <div className="flex items-center justify-between border-b border-terminal-border px-5 py-3.5 font-mono text-[10px] uppercase tracking-[.18em] text-terminal-muted">
                                <span>Coverage index</span>
                                <span>{failed ? "Unavailable" : `${articles.length} published`}</span>
                            </div>
                            <ul>
                                {CORE_CATEGORIES.map((category, index) => (
                                    <li key={category} className={index > 0 ? "border-t border-terminal-border" : undefined}>
                                        <Link
                                            href={categoryHref(category)}
                                            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-terminal-bg/60 focus-visible:bg-terminal-bg/60 focus-visible:outline-none"
                                        >
                                            <span className="w-5 font-mono text-[10px] text-terminal-gold">{String(index + 1).padStart(2, "0")}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-headline text-lg leading-tight text-terminal-text group-hover:text-terminal-gold">
                                                    {category}
                                                </span>
                                                <span className="mt-1 block text-xs leading-5 text-terminal-muted">{CATEGORY_SCOPE[category]}</span>
                                            </span>
                                            <span className="font-mono text-xs text-terminal-muted">{countFor(category)}</span>
                                            <span aria-hidden="true" className="text-terminal-muted transition-transform group-hover:translate-x-0.5 group-hover:text-terminal-gold">
                                                &rarr;
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            {featured && (
                                <div className="border-t border-terminal-border px-5 py-3.5 font-mono text-[10px] uppercase tracking-[.14em] text-terminal-muted">
                                    Latest publication &middot; {formatDate(featured.publishedAt)}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </section>

            {/* ---------------------------------------------------------------- Featured */}
            {featured && (
                <section aria-labelledby="featured-heading" className="border-b border-terminal-border">
                    <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
                        <p id="featured-heading" className="mb-8 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-terminal-gold">
                            <span className="h-px w-8 bg-terminal-gold" aria-hidden="true" />
                            Featured publication
                        </p>
                        <article className="group relative grid overflow-hidden rounded-md border border-terminal-border bg-[rgb(var(--sc-green-rgb)/0.04)] transition-colors focus-within:border-terminal-gold hover:border-terminal-gold/50 lg:grid-cols-12">
                            <div className="relative min-h-[220px] border-b border-terminal-border bg-terminal-bg lg:col-span-5 lg:min-h-[360px] lg:border-b-0 lg:border-r">
                                <PublicationArt slug={featured.slug} category={featured.category} />
                                <span className="absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[.18em] text-terminal-gold">
                                    {featured.category}
                                </span>
                            </div>
                            <div className="flex flex-col justify-center p-7 sm:p-10 lg:col-span-7 lg:p-14">
                                <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[.12em] text-terminal-muted">
                                    <span className="text-terminal-gold">{featured.category}</span>
                                    <span aria-hidden="true">&middot;</span>
                                    <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt, "long")}</time>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{featured.readingMinutes} min read</span>
                                </div>
                                <h2 className="font-headline text-3xl leading-[1.15] tracking-[-0.01em] text-terminal-text sm:text-4xl">
                                    <Link
                                        href={`/research/${encodeURIComponent(featured.slug)}`}
                                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-terminal-gold"
                                    >
                                        {featured.title}
                                    </Link>
                                </h2>
                                {featured.summary && (
                                    <p className="mt-5 line-clamp-5 max-w-2xl font-editorial text-lg leading-8 text-terminal-muted">{featured.summary}</p>
                                )}
                                <p className="mt-8 flex items-center gap-4 text-xs text-terminal-muted">
                                    <span className="font-semibold tracking-wide text-terminal-gold">
                                        Read the report <span aria-hidden="true">&rarr;</span>
                                    </span>
                                    <span className="h-3 w-px bg-terminal-border" aria-hidden="true" />
                                    <span>{featured.author}</span>
                                </p>
                            </div>
                        </article>
                    </div>
                </section>
            )}

            {/* ---------------------------------------------------------------- Library */}
            <section id="library" aria-labelledby="library-heading" className="scroll-mt-24">
                <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
                    <div className="mb-10 max-w-2xl">
                        <p className="mb-4 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-terminal-gold">
                            <span className="h-px w-8 bg-terminal-gold" aria-hidden="true" />
                            Publication library
                        </p>
                        <h2 id="library-heading" className="font-headline text-3xl leading-tight tracking-[-0.01em] text-terminal-text sm:text-4xl">
                            Every report, in one place.
                        </h2>
                    </div>

                    {failed ? (
                        <div className="rounded-md border border-terminal-border bg-terminal-surface px-6 py-12 text-center">
                            <p className="font-headline text-xl text-terminal-text">The library is temporarily unavailable.</p>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-terminal-muted">
                                We could not load the publications just now. Please refresh the page in a moment.
                            </p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="rounded-md border border-terminal-border bg-terminal-surface px-6 py-14 text-center">
                            <p className="font-headline text-xl text-terminal-text">No publications are live yet.</p>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-terminal-muted">
                                Reports appear here as soon as the research desk publishes them.
                            </p>
                        </div>
                    ) : (
                        <ResearchLibrary
                            key={`${initialCategory}|${initialQuery}`}
                            articles={articles}
                            featuredSlug={featured ? featured.slug : null}
                            initialCategory={initialCategory}
                            initialQuery={initialQuery}
                        />
                    )}
                </div>
            </section>

            {/* ---------------------------------------------------------------- Philosophy */}
            <section id="philosophy" aria-labelledby="philosophy-heading" className="scroll-mt-24 border-t border-terminal-border bg-[var(--sc-section-alt)]">
                <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
                    <div className="lg:col-span-5">
                        <p className="mb-5 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-terminal-gold">
                            <span className="h-px w-8 bg-terminal-gold" aria-hidden="true" />
                            Research philosophy
                        </p>
                        <h2 id="philosophy-heading" className="font-headline text-3xl leading-[1.15] tracking-[-0.01em] text-terminal-text sm:text-4xl lg:text-[2.6rem]">
                            Rigour before narrative.
                        </h2>
                        <p className="mt-6 max-w-md font-editorial text-lg leading-8 text-terminal-muted">
                            African markets are too often read through borrowed frameworks. Our research starts from how institutions, liquidity and
                            policy actually work on the ground, and holds every conclusion to a global standard of evidence.
                        </p>
                    </div>
                    <ol className="lg:col-span-7">
                        {PRINCIPLES.map((principle, index) => (
                            <li key={principle.title} className={`grid grid-cols-[2.5rem_1fr] gap-4 py-7 sm:grid-cols-[3.5rem_1fr] ${index === 0 ? "border-t" : ""} border-b border-terminal-border`}>
                                <span className="pt-1 font-mono text-xs text-terminal-gold">{String(index + 1).padStart(2, "0")}</span>
                                <div>
                                    <h3 className="font-headline text-xl leading-snug text-terminal-text">{principle.title}</h3>
                                    <p className="mt-2 max-w-xl text-sm leading-7 text-terminal-muted">{principle.body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </>
    );
}
