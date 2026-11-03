"use client";

import { useMemo, useState } from "react";
import PlatformCard, { type PlatformSummary } from "@/components/ai/PlatformCard";
import MembershipButton from "@/components/ai/MembershipButton";
import { CATEGORIES, DISPLAY_MEMBERSHIP, KENYA_ELIGIBILITY, STATUSES, categoryLabel } from "@/lib/ai/config";

/** Searchable, filterable directory. Filtering happens in the browser on the public summary data. */
export default function Directory({ platforms, savedIds = [], initialCategory = "all", lockedCategories = [], signedIn = false }: { platforms: PlatformSummary[]; savedIds?: string[]; initialCategory?: string; lockedCategories?: string[]; signedIn?: boolean }) {
    const [q, setQ] = useState("");
    const [category, setCategory] = useState(initialCategory);
    const [country, setCountry] = useState("all");
    const [status, setStatus] = useState("all");

    const shown = useMemo(() => {
        const term = q.trim().toLowerCase();
        return platforms.filter(
            (p) =>
                (category === "all" || p.category === category) &&
                (country === "all" || p.kenya_eligibility === country) &&
                (status === "all" || p.verification_status === status) &&
                (!term || p.name.toLowerCase().includes(term) || (p.short_description || "").toLowerCase().includes(term))
        );
    }, [platforms, q, category, country, status]);

    const saved = new Set(savedIds);
    const reset = () => { setQ(""); setCategory("all"); setCountry("all"); setStatus("all"); };

    return (
        <div>
            <div className="aio-filterbar" role="search">
                <input className="aio-input" type="search" placeholder="Search platforms" aria-label="Search platforms" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="aio-select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className="aio-select" aria-label="Filter by Kenya eligibility" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="all">Any country status</option>
                    {KENYA_ELIGIBILITY.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className="aio-select" aria-label="Filter by verification status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">Any verification status</option>
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>

            <p aria-live="polite" style={{ fontSize: 12, color: "var(--sc-fg-4)", marginBottom: 16 }}>
                Showing {shown.length} of {platforms.length + lockedCategories.length} platforms{lockedCategories.length ? ` · ${lockedCategories.length} members-only` : ""}
            </p>

            {shown.length === 0 ? (
                <div className="aio-card" style={{ textAlign: "center" }}>
                    <h3>No platforms match these filters</h3>
                    <p>Try a broader search, or clear the filters.</p>
                    <button type="button" className="aio-btn ghost sm" style={{ marginTop: 14 }} onClick={reset}>Clear filters</button>
                </div>
            ) : (
                <div className="aio-grid c3">
                    {shown.map((p) => <PlatformCard key={p.id} p={p} saved={saved.has(p.id)} />)}
                </div>
            )}

            {lockedCategories.length > 0 && (
                <div className="aio-lockzone">
                    <div className="aio-grid c3" aria-hidden="true">
                        {(category === "all" ? lockedCategories : lockedCategories.filter((c) => c === category)).slice(0, 6).map((c, i) => (
                            <div key={i} className="aio-card aio-locked-card">
                                <div className="aio-locked-top">
                                    <span className="aio-locked-ico">🔒</span>
                                    <div>
                                        <div className="aio-bar w60" />
                                        <div className="aio-locked-cat">{categoryLabel(c)}</div>
                                    </div>
                                </div>
                                <div className="aio-bar w100" />
                                <div className="aio-bar w80" />
                                <span className="aio-locked-tag">MEMBERS ONLY</span>
                            </div>
                        ))}
                    </div>
                    <div className="aio-card aio-lockcta">
                        <div>
                            <h3>{lockedCategories.length} more researched platform{lockedCategories.length === 1 ? "" : "s"} for members</h3>
                            <p>Unlock the full directory with every platform&apos;s status, Kenya eligibility and step-by-step guide. Search and filters above cover your {platforms.length} free platform{platforms.length === 1 ? "" : "s"} only.</p>
                        </div>
                        <div className="aio-lockcta-actions">
                            <MembershipButton label={`Unlock all — ${DISPLAY_MEMBERSHIP}`} />
                            {!signedIn && <a href="/login" className="aio-btn ghost">Sign in</a>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
