"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/research/format";

interface Props {
    items: TocItem[];
    /** "sidebar" stays in view beside the article on large screens; "inline" is a collapsible list for small screens. */
    variant: "sidebar" | "inline";
}

export default function ArticleToc({ items, variant }: Props) {
    const [active, setActive] = useState(items[0]?.id || "");
    const [open, setOpen] = useState(false);

    // Highlight the section being read (sidebar only): the last heading that has passed the reading line,
    // which sits just below the sticky site header. Works the same scrolling up, down or jumping.
    useEffect(() => {
        if (variant !== "sidebar") return;
        const headings = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => Boolean(el));
        if (!headings.length) return;

        const READING_LINE = 140;
        let frame = 0;

        const update = () => {
            frame = 0;
            let current = headings[0].id;
            for (const heading of headings) {
                if (heading.getBoundingClientRect().top <= READING_LINE) current = heading.id;
                else break;
            }
            // A short final section may never reach the reading line, so hand it over at the foot of the page
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = headings[headings.length - 1].id;
            setActive(current);
        };
        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [items, variant]);

    const list = (
        <ol className="space-y-0.5 text-[13px] leading-5">
            {items.map((item) => {
                const current = variant === "sidebar" && active === item.id;
                return (
                    <li key={item.id}>
                        <a
                            href={`#${item.id}`}
                            onClick={() => {
                                setActive(item.id);
                                setOpen(false);
                            }}
                            aria-current={current ? "location" : undefined}
                            className={`block border-l py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal-gold ${
                                item.level === 3 ? "pl-7 text-[12px]" : "pl-4"
                            } ${
                                current
                                    ? "border-terminal-gold text-terminal-gold"
                                    : "border-terminal-border text-terminal-muted hover:border-terminal-muted hover:text-terminal-text"
                            }`}
                        >
                            {item.text}
                        </a>
                    </li>
                );
            })}
        </ol>
    );

    if (variant === "inline") {
        return (
            <details
                open={open}
                onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
                className="group mb-10 rounded-md border border-terminal-border bg-terminal-surface"
            >
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-5 font-mono text-[11px] uppercase tracking-[.18em] text-terminal-text [&::-webkit-details-marker]:hidden">
                    In this report
                    <span aria-hidden="true" className="text-terminal-gold transition-transform group-open:rotate-45">
                        +
                    </span>
                </summary>
                <nav aria-label="Table of contents" className="border-t border-terminal-border px-5 py-4">
                    {list}
                </nav>
            </details>
        );
    }

    return (
        <nav aria-label="Table of contents">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-terminal-muted">In this report</p>
            {list}
        </nav>
    );
}
