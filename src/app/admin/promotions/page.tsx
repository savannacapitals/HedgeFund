"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, btnCls, dangerBtnCls, formatMoney, inputCls, primaryBtnCls } from "@/lib/admin/client";
import { formatEat, formatOffer } from "@/lib/promotions/pricing";

const STATE_COLOUR: Record<string, string> = {
    live: "text-terminal-emerald",
    scheduled: "text-terminal-gold",
    paused: "text-terminal-muted",
    ended: "text-terminal-muted",
};

const EMPTY_FORM = {
    name: "",
    headline: "",
    description: "",
    trigger: "code" as "code" | "auto",
    code: "",
    discountType: "percent" as "percent" | "fixed",
    percentOff: "20",
    amountOff: "",
    currency: "USD" as "USD" | "KES",
    scope: "all_courses" as "all_courses" | "course" | "community",
    courseId: "",
    startsAt: "",
    endsAt: "",
    maxRedemptions: "",
    maxPerUser: "1",
    showBanner: true,
};

const label = "block text-[10px] uppercase tracking-wider text-terminal-muted mb-1";

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className={label}>{title}</span>
            {children}
            {hint && <span className="block mt-1 text-[10px] text-terminal-muted leading-relaxed">{hint}</span>}
        </label>
    );
}

export default function AdminPromotionsPage() {
    const [promotions, setPromotions] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [maxPercent, setMaxPercent] = useState(90);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
    const [ending, setEnding] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const json = await adminApi("/api/admin/promotions");
            setPromotions(json.promotions);
            setCourses(json.courses);
            setMaxPercent(json.maxPercent);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));
    // datetime-local gives local time without a zone; the browser converts it to an exact moment
    const iso = (v: string) => (v ? new Date(v).toISOString() : "");

    async function run(body: any, done: string) {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            await adminApi("/api/admin/promotions", body);
            setNotice(`${done} It has been saved to the audit log.`);
            await load();
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function create() {
        const ok = await run(
            {
                action: "create",
                ...form,
                startsAt: iso(form.startsAt),
                endsAt: iso(form.endsAt),
                percentOff: form.discountType === "percent" ? Number(form.percentOff) : undefined,
                amountOff: form.discountType === "fixed" ? Number(form.amountOff) : undefined,
            },
            "Promotion created."
        );
        if (ok) {
            setForm(EMPTY_FORM);
            setCreating(false);
        }
    }

    async function saveLimit() {
        if (!editing) return;
        if (await run({ action: "update", id: editing.id, maxRedemptions: editing.value.trim() }, "Limit updated.")) setEditing(null);
    }

    async function confirmEnd(id: string) {
        if (await run({ action: "end", id }, "Promotion ended.")) setEnding(null);
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-terminal-border pb-6 mb-6">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">Administration · PROMOTIONS</p>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">Offers, Discounts & Promo Codes</h2>
                <p className="text-xs font-mono text-terminal-muted mt-2 leading-relaxed max-w-3xl">
                    Automatic offers apply to everyone eligible. Code offers apply only when the customer types the code. One offer applies per order (the largest wins). The discount is worked out on the server and saved on the order, so receipts stay correct if you later end or change an offer.
                </p>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
            {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

            {!creating ? (
                <button className={primaryBtnCls + " mb-6"} onClick={() => setCreating(true)}>
                    + NEW PROMOTION
                </button>
            ) : (
                <div className="mb-8 p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-5">
                    <h2 className="font-bold text-sm text-terminal-text">New promotion</h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Field title="Internal name" hint="Only staff see this. For example: Academy opening offer, Nov 2026.">
                            <input className={inputCls} maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} />
                        </Field>
                        <Field title="Public headline" hint="Shown on the website banner. For example: Founding students save 30% on every course.">
                            <input className={inputCls} maxLength={90} value={form.headline} onChange={(e) => set({ headline: e.target.value })} />
                        </Field>
                        <div className="md:col-span-2">
                            <Field title="Small print (optional)">
                                <input className={inputCls} maxLength={240} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                            </Field>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <Field title="How it applies">
                            <select className={inputCls} value={form.trigger} onChange={(e) => set({ trigger: e.target.value as any })}>
                                <option value="code">With a promo code</option>
                                <option value="auto">Automatically (opening offer)</option>
                            </select>
                        </Field>
                        {form.trigger === "code" && (
                            <Field title="Code" hint="5 to 24 letters, numbers or dashes. Avoid easy guesses on large discounts.">
                                <input className={inputCls + " uppercase"} maxLength={24} value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
                            </Field>
                        )}
                        <Field title="Discount">
                            <select className={inputCls} value={form.discountType} onChange={(e) => set({ discountType: e.target.value as any })}>
                                <option value="percent">Percentage off</option>
                                <option value="fixed">Fixed amount off</option>
                            </select>
                        </Field>
                        {form.discountType === "percent" ? (
                            <Field title="Percent off" hint={`Whole number, 1 to ${maxPercent}.`}>
                                <input className={inputCls} inputMode="numeric" value={form.percentOff} onChange={(e) => set({ percentOff: e.target.value })} />
                            </Field>
                        ) : (
                            <>
                                <Field title="Amount off">
                                    <input className={inputCls} inputMode="decimal" value={form.amountOff} onChange={(e) => set({ amountOff: e.target.value })} />
                                </Field>
                                <Field title="Currency" hint="Only applies to products priced in this currency.">
                                    <select className={inputCls} value={form.currency} onChange={(e) => set({ currency: e.target.value as any })}>
                                        <option value="USD">USD</option>
                                        <option value="KES">KES</option>
                                    </select>
                                </Field>
                            </>
                        )}
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <Field title="Applies to">
                            <select className={inputCls} value={form.scope} onChange={(e) => set({ scope: e.target.value as any })}>
                                <option value="all_courses">All paid courses</option>
                                <option value="course">One course</option>
                                <option value="community">Killzone Journal unlock</option>
                            </select>
                        </Field>
                        {form.scope === "course" && (
                            <Field title="Course">
                                <select className={inputCls} value={form.courseId} onChange={(e) => set({ courseId: e.target.value })}>
                                    <option value="">Choose…</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        <Field title="Starts (your device time)" hint="Empty = now.">
                            <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
                        </Field>
                        <Field title="Ends (your device time)" hint="Empty = runs until you end it.">
                            <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
                        </Field>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <Field title="Number of places" hint="Empty = unlimited. Unpaid orders give their place back after 48 hours.">
                            <input className={inputCls} inputMode="numeric" value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} />
                        </Field>
                        <Field title="Uses per customer">
                            <input className={inputCls} inputMode="numeric" value={form.maxPerUser} onChange={(e) => set({ maxPerUser: e.target.value })} />
                        </Field>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-xs font-mono text-terminal-text pb-2">
                                <input type="checkbox" checked={form.showBanner} onChange={(e) => set({ showBanner: e.target.checked })} />
                                Advertise on the website banner
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className={primaryBtnCls} disabled={busy} onClick={create}>{busy ? "WORKING..." : "CREATE PROMOTION"}</button>
                        <button className={btnCls} onClick={() => { setCreating(false); setForm(EMPTY_FORM); setError(null); }}>CANCEL</button>
                    </div>
                </div>
            )}

            <div className="bg-terminal-surface rounded-lg border border-terminal-border overflow-x-auto font-mono text-xs">
                <table className="w-full text-left">
                    <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                        <tr>
                            <th className="p-3">PROMOTION</th>
                            <th className="p-3">OFFER</th>
                            <th className="p-3">APPLIES TO</th>
                            <th className="p-3">RUNS (EAT)</th>
                            <th className="p-3">PLACES</th>
                            <th className="p-3 text-right">GIVEN AWAY</th>
                            <th className="p-3">STATE</th>
                            <th className="p-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border text-terminal-text">
                        {promotions.map((p) => {
                            const taken = p.reserved + p.redeemed;
                            return (
                                <tr key={p.id} className="align-top">
                                    <td className="p-3">
                                        <div className="font-bold">{p.name}</div>
                                        <div className="text-terminal-muted mt-0.5">{p.code ? `Code ${p.code}` : "Automatic"}{p.show_banner ? " · on banner" : ""}</div>
                                    </td>
                                    <td className="p-3 text-terminal-gold font-bold whitespace-nowrap">{formatOffer(p)}</td>
                                    <td className="p-3 text-terminal-muted">
                                        {p.scope === "all_courses" ? "All paid courses" : p.scope === "community" ? "Killzone Journal" : p.courseTitle || "One course"}
                                    </td>
                                    <td className="p-3 text-terminal-muted whitespace-nowrap">
                                        {formatEat(p.starts_at)}
                                        <br />→ {p.ends_at ? formatEat(p.ends_at) : "until ended"}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {p.max_redemptions ? `${taken} / ${p.max_redemptions}` : `${taken} / ∞`}
                                        {p.reserved > 0 && <div className="text-terminal-muted">{p.reserved} awaiting payment</div>}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {p.redeemed ? formatMoney(p.discounted, p.currency || "USD") : "—"}
                                        <div className="text-terminal-muted">{p.redeemed} paid</div>
                                    </td>
                                    <td className={`p-3 font-bold ${STATE_COLOUR[p.state] || ""}`}>{p.state.toUpperCase()}</td>
                                    <td className="p-3">
                                        {editing?.id === p.id ? (
                                            <div className="flex items-center gap-2 justify-end flex-wrap">
                                                <input
                                                    className={inputCls + " w-24"}
                                                    inputMode="numeric"
                                                    placeholder="∞"
                                                    aria-label="Number of places"
                                                    value={editing.value}
                                                    onChange={(e) => setEditing({ id: p.id, value: e.target.value })}
                                                />
                                                <button className={primaryBtnCls} disabled={busy} onClick={saveLimit}>SAVE</button>
                                                <button className={btnCls} onClick={() => setEditing(null)}>CANCEL</button>
                                            </div>
                                        ) : ending === p.id ? (
                                            <div className="max-w-[16rem] ml-auto space-y-2 text-right">
                                                <p className="text-terminal-muted leading-relaxed">
                                                    New orders stop getting this discount straight away. Orders already placed keep their price while they are paid.
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <button className={dangerBtnCls} disabled={busy} onClick={() => confirmEnd(p.id)}>END NOW</button>
                                                    <button className={btnCls} onClick={() => setEnding(null)}>KEEP</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 justify-end flex-wrap">
                                                {p.state !== "ended" && (
                                                    <button className={btnCls} disabled={busy} onClick={() => setEditing({ id: p.id, value: p.max_redemptions ? String(p.max_redemptions) : "" })}>LIMIT</button>
                                                )}
                                                {p.state === "live" || p.state === "scheduled" ? (
                                                    <button className={btnCls} disabled={busy} onClick={() => run({ action: "pause", id: p.id }, "Promotion paused.")}>PAUSE</button>
                                                ) : p.state === "paused" ? (
                                                    <button className={primaryBtnCls} disabled={busy} onClick={() => run({ action: "resume", id: p.id }, "Promotion resumed.")}>RESUME</button>
                                                ) : null}
                                                {p.state !== "ended" && (
                                                    <button className={dangerBtnCls} disabled={busy} onClick={() => setEnding(p.id)}>END</button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {!promotions.length && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-terminal-muted">
                                    {loading ? "Loading..." : "No promotions yet. Create your opening offer to get started."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-[10px] font-mono text-terminal-muted">
                &ldquo;Given away&rdquo; counts discounts on orders that were paid. Refunded orders give their place back.
            </p>
        </div>
    );
}
