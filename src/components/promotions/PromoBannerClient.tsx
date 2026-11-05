"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEat } from "@/lib/promotions/pricing";
import type { PublicOffer } from "@/lib/promotions/server";

const DAY = 86_400_000;

function countdown(ms: number): string {
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function PromoBannerClient({ offer }: { offer: PublicOffer }) {
    const storageKey = `sc-promo-dismissed:${offer.id}`;
    const [dismissed, setDismissed] = useState(false);
    const [now, setNow] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(storageKey)) setDismissed(true);
        } catch {
            // storage blocked: the banner just shows every time
        }
    }, [storageKey]);

    // The clock starts after the page loads, so the server and browser HTML always match
    useEffect(() => {
        if (!offer.endsAt) return;
        setNow(Date.now());
        const left = new Date(offer.endsAt).getTime() - Date.now();
        const timer = setInterval(() => setNow(Date.now()), left < DAY * 3 ? 1000 : 30_000);
        return () => clearInterval(timer);
    }, [offer.endsAt]);

    const msLeft = offer.endsAt && now !== null ? new Date(offer.endsAt).getTime() - now : null;
    if (dismissed || (msLeft !== null && msLeft <= 0)) return null;

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(storageKey, "1");
        } catch {
            // ignore
        }
    };

    const copyCode = async () => {
        if (!offer.code) return;
        try {
            await navigator.clipboard.writeText(offer.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard blocked: the code is on screen to copy by hand
        }
    };

    const scarce = offer.remaining !== null && offer.remaining <= 25;

    return (
        <section
            role="region"
            aria-label="Current offer"
            className="relative border-b border-terminal-gold/25 bg-terminal-gold/[0.07]"
        >
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5 pr-12 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-terminal-gold/40 bg-terminal-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-terminal-gold">
                    <span className="h-1.5 w-1.5 rounded-full bg-terminal-gold" aria-hidden="true" />
                    {offer.label}
                </span>

                <p className="min-w-0 flex-1 basis-64 text-terminal-text">
                    <span className="font-semibold">{offer.headline}</span>
                    {offer.description && <span className="ml-2 text-terminal-muted">{offer.description}</span>}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-terminal-muted">
                    {offer.code && (
                        <button
                            type="button"
                            onClick={copyCode}
                            className="inline-flex items-center gap-2 rounded border border-dashed border-terminal-gold/50 px-2.5 py-1 text-terminal-text transition hover:border-terminal-gold"
                            aria-label={`Copy promo code ${offer.code}`}
                        >
                            <span className="tracking-[.14em]">{offer.code}</span>
                            <span className="text-[9px] uppercase text-terminal-gold">{copied ? "Copied" : "Copy"}</span>
                        </button>
                    )}
                    {offer.remaining !== null && (
                        <span className={scarce ? "text-terminal-gold" : undefined}>
                            {offer.remaining} {offer.remaining === 1 ? "place" : "places"} left
                        </span>
                    )}
                    {offer.endsAt && (
                        <span title={`Ends ${formatEat(offer.endsAt)}`}>
                            {msLeft !== null ? (
                                <>Ends in <span className="tabular-nums text-terminal-text">{countdown(msLeft)}</span></>
                            ) : (
                                <>Ends {formatEat(offer.endsAt)}</>
                            )}
                        </span>
                    )}
                </div>

                <Link
                    href={offer.href}
                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-terminal-gold hover:underline"
                >
                    {offer.scope === "course" ? "View course" : offer.scope === "community" ? "Unlock access" : "View courses"} <span aria-hidden="true">→</span>
                </Link>
            </div>

            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss offer"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-terminal-muted transition hover:text-terminal-text"
            >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
        </section>
    );
}
