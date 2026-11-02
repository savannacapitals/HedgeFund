"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, btnCls, dangerBtnCls, inputCls, primaryBtnCls, shortDate } from "@/lib/admin/client";
import { CATEGORIES, KENYA_ELIGIBILITY, REQUEST_STATUSES, STATUSES, YES_NO, categoryLabel, kenyaLabel, requestStatusLabel, statusLabel, yesNoLabel } from "@/lib/ai/config";

type Tab = "overview" | "platforms" | "requests" | "members" | "announcements";
const TABS: [Tab, string][] = [["overview", "OVERVIEW"], ["platforms", "PLATFORMS"], ["requests", "ASSISTANCE"], ["members", "MEMBERSHIPS"], ["announcements", "ANNOUNCEMENTS"]];

const EMPTY: any = {
    id: undefined, name: "", slug: "", logo_url: "", short_description: "", category: "ai_training", official_url: "",
    verification_status: "under_review", kenya_eligibility: "unknown", last_verified: "", is_featured: false, is_published: true,
    accepting_registrations: "unknown", has_projects: "unknown", pays_in_kenya: "unknown",
    country_eligibility: "", min_age: "", required_equipment: "", required_skills: "", registration_requirements: "", assessment_requirements: "",
    payment_methods: "", compensation: "", application_availability: "", overview: "", eligibility_notes: "", account_steps: "", assessment_notes: "",
    earning_notes: "", payments_notes: "", common_mistakes: "", recommendations: "", restriction_notes: "", resources: "", sources: "",
};
const LIST_KEYS = ["required_equipment", "required_skills", "registration_requirements", "payment_methods", "account_steps", "common_mistakes", "recommendations"];
const linkText = (v: any) => (Array.isArray(v) ? v.map((r: any) => `${r.label} | ${r.url}`).join("\n") : "");

function toForm(p: any) {
    const g = p.guide || {};
    const f: any = { ...EMPTY, ...p, ...g, id: p.id, last_verified: p.last_verified || "", min_age: g.min_age ?? "" };
    for (const k of LIST_KEYS) f[k] = (g[k] || []).join("\n");
    for (const k of Object.keys(EMPTY)) if (f[k] === null || f[k] === undefined) f[k] = EMPTY[k];
    f.resources = linkText(g.resources);
    f.sources = linkText(g.sources);
    return f;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-terminal-muted mb-1">{label}</span>
            {children}
            {hint && <span className="block text-[10px] text-terminal-muted mt-1">{hint}</span>}
        </label>
    );
}

export default function AdminAiPage() {
    const [tab, setTab] = useState<Tab>("overview");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [stats, setStats] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [grants, setGrants] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);

    const [form, setForm] = useState<any | null>(null);
    const [reqEdit, setReqEdit] = useState<any | null>(null);
    const [grant, setGrant] = useState({ email: "", days: "30", note: "" });
    const [post, setPost] = useState({ title: "", body: "", platform_id: "" });

    const load = useCallback(async () => {
        setError(null);
        try {
            const [m, p, r, a] = await Promise.all([
                adminApi("/api/admin/ai/memberships"), adminApi("/api/admin/ai/platforms"),
                adminApi("/api/admin/ai/requests"), adminApi("/api/admin/ai/announcements"),
            ]);
            setStats(m.stats); setMembers(m.members); setGrants(m.grants);
            setPlatforms(p.platforms); setRequests(r.requests); setNews(a.announcements);
        } catch (e: any) {
            setError(e.message);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    async function run(fn: () => Promise<any>, done: string) {
        setBusy(true); setError(null); setNotice(null);
        try { await fn(); setNotice(done); await load(); return true; }
        catch (e: any) { setError(e.message); return false; }
        finally { setBusy(false); }
    }

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const text = (k: string, rows = 3, hint?: string, label?: string) => (
        <Field label={label || k.replace(/_/g, " ")} hint={hint}><textarea className={inputCls} rows={rows} value={form[k]} onChange={(e) => set(k, e.target.value)} /></Field>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="border-b border-terminal-border pb-6 mb-6">
                <div className="text-xs font-mono text-terminal-gold mb-2">ADMIN // AI OPPORTUNITIES</div>
                <h1 className="text-2xl md:text-3xl font-bold text-terminal-text">AI Opportunities management</h1>
                <p className="text-xs font-mono text-terminal-muted mt-2">Platforms, guides, assistance requests, memberships and announcements. Every change is written to the audit log. Paid memberships and assistance are activated only from confirmed orders (see Orders).</p>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
            {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map(([id, label]) => (
                    <button key={id} onClick={() => { setTab(id); setForm(null); setReqEdit(null); }} className={`px-3 py-1.5 rounded text-xs font-mono border ${tab === id ? "border-terminal-gold text-terminal-gold font-bold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"}`}>{label}</button>
                ))}
            </div>

            {tab === "overview" && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    {[
                        ["Active members", stats.activeMembers], ["Expiring in 7 days", stats.expiringIn7Days], ["Paid membership periods", stats.paidMembershipPeriods],
                        ["Platforms listed", Object.values(stats.platforms).reduce((a: any, b: any) => a + b, 0)],
                        ...STATUSES.map((s) => [`Platforms · ${s.label}`, stats.platforms[s.id]]),
                        ...REQUEST_STATUSES.map((s) => [`Requests · ${s.label}`, stats.requests[s.id]]),
                    ].map(([l, v]: any) => (
                        <div key={l} className="p-4 rounded-lg bg-terminal-surface border border-terminal-border">
                            <div className="text-terminal-muted">{l}</div>
                            <div className="text-2xl font-bold text-terminal-text mt-1">{v}</div>
                        </div>
                    ))}
                </div>
            )}

            {tab === "platforms" && !form && (
                <div>
                    <div className="mb-4"><button className={primaryBtnCls} onClick={() => setForm({ ...EMPTY })}>+ ADD PLATFORM</button></div>
                    <div className="overflow-x-auto rounded-lg border border-terminal-border">
                        <table className="w-full text-xs font-mono">
                            <thead><tr className="text-terminal-muted text-left border-b border-terminal-border"><th className="p-3">Platform</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Kenya</th><th className="p-3">Verified</th><th className="p-3">Live</th><th className="p-3" /></tr></thead>
                            <tbody>
                                {platforms.map((p) => (
                                    <tr key={p.id} className="border-b border-terminal-border/40">
                                        <td className="p-3 text-terminal-text">{p.name}{p.is_featured ? " ★" : ""}</td>
                                        <td className="p-3 text-terminal-muted">{categoryLabel(p.category)}</td>
                                        <td className="p-3">{statusLabel(p.verification_status)}</td>
                                        <td className="p-3 text-terminal-muted">{kenyaLabel(p.kenya_eligibility)}</td>
                                        <td className="p-3 text-terminal-muted">{p.last_verified || "—"}</td>
                                        <td className="p-3">{p.is_published ? "Yes" : "Hidden"}</td>
                                        <td className="p-3 text-right"><button className={btnCls} onClick={() => setForm(toForm(p))}>EDIT</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "platforms" && form && (
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-5">
                    <h2 className="font-bold text-sm">{form.id ? `Edit ${form.name}` : "Add a platform"}</h2>
                    <div className="p-3 rounded bg-terminal-bg border border-terminal-border text-[11px] text-terminal-muted leading-relaxed">
                        Only record what an official source confirms. Leave a field empty and members will see “Not independently verified”. A Verified platform needs a last-verified date and at least one source link. Never encourage VPNs, false identities or location changes.
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                        <Field label="Slug (web address)" hint="lowercase-with-hyphens"><input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
                        <Field label="Official website"><input className={inputCls} placeholder="https://" value={form.official_url} onChange={(e) => set("official_url", e.target.value)} /></Field>
                        <Field label="Logo address (optional)"><input className={inputCls} placeholder="https://" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} /></Field>
                        <Field label="Category"><select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
                        <Field label="Verification status"><select className={inputCls} value={form.verification_status} onChange={(e) => set("verification_status", e.target.value)}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
                        <Field label="Accepts Kenyan applicants"><select className={inputCls} value={form.kenya_eligibility} onChange={(e) => set("kenya_eligibility", e.target.value)}>{KENYA_ELIGIBILITY.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
                        <Field label="Last verified"><input className={inputCls} type="date" value={form.last_verified} onChange={(e) => set("last_verified", e.target.value)} /></Field>
                        <Field label="Minimum age"><input className={inputCls} inputMode="numeric" value={form.min_age} onChange={(e) => set("min_age", e.target.value)} /></Field>
                    </div>
                    <Field label="Short description (max 300)"><input className={inputCls} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} /></Field>
                    <div className="grid md:grid-cols-3 gap-4">
                        {([["accepting_registrations", "Accepting registrations"], ["has_projects", "Projects available now"], ["pays_in_kenya", "Pays contributors in Kenya"]] as const).map(([k, l]) => (
                            <Field key={k} label={l}><select className={inputCls} value={form[k]} onChange={(e) => set(k, e.target.value)}>{YES_NO.map((v) => <option key={v} value={v}>{yesNoLabel(v)}</option>)}</select></Field>
                        ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {text("overview", 4, undefined, "1. Overview")}
                        {text("country_eligibility", 4, undefined, "Supported countries (as published)")}
                        {text("eligibility_notes", 3, undefined, "2. Eligibility notes")}
                        {text("restriction_notes", 3, "Required when status is Restricted. Explain why; do not suggest workarounds.")}
                        {text("required_equipment", 3, "One per line")}
                        {text("required_skills", 3, "One per line")}
                        {text("registration_requirements", 3, "One per line")}
                        {text("account_steps", 5, "One step per line, in order. Use the official website.", "3. Account creation steps")}
                        {text("assessment_requirements", 3, undefined, "4. Assessment requirements")}
                        {text("assessment_notes", 3, undefined, "4. Assessment notes")}
                        {text("compensation", 3, "Only officially published figures. Never estimate.", "5. Compensation (official)")}
                        {text("earning_notes", 3, undefined, "5. Earning notes")}
                        {text("payment_methods", 3, "One per line", "6. Payment methods")}
                        {text("payments_notes", 3, undefined, "6. Payments and withdrawals notes")}
                        {text("common_mistakes", 4, "One per line", "7. Common mistakes")}
                        {text("recommendations", 4, "One per line", "8. Savanna recommendations")}
                        {text("application_availability", 2)}
                        {text("resources", 4, "One per line: Label | https://link. Registration page, docs, support.", "9. Official resources")}
                    </div>
                    {text("sources", 4, "One per line: Label | https://link. Where each fact came from.", "Source links")}
                    <div className="flex flex-wrap gap-6 text-xs font-mono">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)} /> Published</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> Featured on landing page</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button className={primaryBtnCls} disabled={busy} onClick={async () => { if (await run(() => adminApi("/api/admin/ai/platforms", { action: "save", ...form }), "Platform saved.")) setForm(null); }}>SAVE PLATFORM</button>
                        <button className={btnCls} onClick={() => setForm(null)}>CANCEL</button>
                        {form.id && <button className={dangerBtnCls} disabled={busy} onClick={async () => { if (window.confirm(`Delete ${form.name} permanently? Saved lists and progress for it will be removed. To hide it instead, untick Published.`) && await run(() => adminApi("/api/admin/ai/platforms", { action: "delete", id: form.id }), "Platform deleted.")) setForm(null); }}>DELETE</button>}
                    </div>
                </div>
            )}

            {tab === "requests" && !reqEdit && (
                <div className="overflow-x-auto rounded-lg border border-terminal-border">
                    <table className="w-full text-xs font-mono">
                        <thead><tr className="text-terminal-muted text-left border-b border-terminal-border"><th className="p-3">Customer</th><th className="p-3">Platform</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3">Submitted</th><th className="p-3" /></tr></thead>
                        <tbody>
                            {requests.length === 0 && <tr><td className="p-4 text-terminal-muted" colSpan={6}>No requests yet.</td></tr>}
                            {requests.map((r) => (
                                <tr key={r.id} className="border-b border-terminal-border/40">
                                    <td className="p-3 text-terminal-text">{r.customer}<div className="text-terminal-muted">{r.customerName}</div></td>
                                    <td className="p-3">{r.platform}</td>
                                    <td className="p-3">{requestStatusLabel(r.status)}</td>
                                    <td className="p-3 text-terminal-muted">{r.orderStatus || "—"}</td>
                                    <td className="p-3 text-terminal-muted">{shortDate(r.createdAt)}</td>
                                    <td className="p-3 text-right"><button className={btnCls} onClick={() => setReqEdit({ ...r })}>OPEN</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "requests" && reqEdit && (
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-4 max-w-3xl">
                    <h2 className="font-bold text-sm">{reqEdit.platform} · {reqEdit.customer}</h2>
                    <div className="text-xs text-terminal-muted font-mono">Order payment: {reqEdit.orderStatus || "none"} · Contact: {reqEdit.contact || "not given"}</div>
                    <p className="text-xs whitespace-pre-line p-3 rounded bg-terminal-bg border border-terminal-border">{reqEdit.challenge}</p>
                    <div className="p-3 rounded bg-terminal-bg border border-terminal-border text-[11px] text-terminal-muted">The customer keeps their own passwords, OTPs, ID checks and payment details. Never ask for or record them here.</div>
                    <Field label="Status"><select className={inputCls} value={reqEdit.status} onChange={(e) => setReqEdit({ ...reqEdit, status: e.target.value })}>{REQUEST_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
                    <Field label="Message to customer (shown on their dashboard)"><textarea className={inputCls} rows={3} value={reqEdit.staffNote || ""} onChange={(e) => setReqEdit({ ...reqEdit, staffNote: e.target.value })} /></Field>
                    <Field label="Internal note (staff only)"><textarea className={inputCls} rows={3} value={reqEdit.internalNote || ""} onChange={(e) => setReqEdit({ ...reqEdit, internalNote: e.target.value })} /></Field>
                    <div className="flex gap-2">
                        <button className={primaryBtnCls} disabled={busy} onClick={async () => { if (await run(() => adminApi("/api/admin/ai/requests", { id: reqEdit.id, status: reqEdit.status, staffNote: reqEdit.staffNote, internalNote: reqEdit.internalNote }), "Request updated.")) setReqEdit(null); }}>SAVE</button>
                        <button className={btnCls} onClick={() => setReqEdit(null)}>CLOSE</button>
                    </div>
                </div>
            )}

            {tab === "members" && (
                <div className="space-y-8">
                    <div className="overflow-x-auto rounded-lg border border-terminal-border">
                        <table className="w-full text-xs font-mono">
                            <thead><tr className="text-terminal-muted text-left border-b border-terminal-border"><th className="p-3">Member</th><th className="p-3">Paid periods</th><th className="p-3">Access until</th></tr></thead>
                            <tbody>
                                {members.length === 0 && <tr><td className="p-4 text-terminal-muted" colSpan={3}>No paid memberships yet.</td></tr>}
                                {members.map((m) => (
                                    <tr key={m.userId} className="border-b border-terminal-border/40"><td className="p-3 text-terminal-text">{m.email}<div className="text-terminal-muted">{m.name}</div></td><td className="p-3">{m.paidPeriods}</td><td className="p-3">{shortDate(m.expiresAt)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-3 max-w-xl">
                        <h2 className="font-bold text-sm">Grant free access (administrators)</h2>
                        <p className="text-[11px] text-terminal-muted">For staff, comps or goodwill after a refund. A written reason is required and is audited.</p>
                        <Field label="User email"><input className={inputCls} value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} /></Field>
                        <Field label="Days"><input className={inputCls} inputMode="numeric" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} /></Field>
                        <Field label="Reason"><input className={inputCls} value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} /></Field>
                        <button className={primaryBtnCls} disabled={busy} onClick={() => run(() => adminApi("/api/admin/ai/memberships", { action: "grant", ...grant }), "Access granted.")}>GRANT ACCESS</button>
                    </div>
                    {grants.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-terminal-border">
                            <table className="w-full text-xs font-mono">
                                <thead><tr className="text-terminal-muted text-left border-b border-terminal-border"><th className="p-3">Granted to</th><th className="p-3">Until</th><th className="p-3">Reason</th><th className="p-3" /></tr></thead>
                                <tbody>{grants.map((g) => (
                                    <tr key={g.id} className="border-b border-terminal-border/40"><td className="p-3">{g.email}</td><td className="p-3">{shortDate(g.endsAt)}</td><td className="p-3 text-terminal-muted">{g.note}</td>
                                        <td className="p-3 text-right">{g.revoked ? "Revoked" : <button className={dangerBtnCls} disabled={busy} onClick={() => { const note = window.prompt("Reason for revoking?"); if (note) run(() => adminApi("/api/admin/ai/memberships", { action: "revoke", id: g.id, note }), "Grant revoked."); }}>REVOKE</button>}</td></tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === "announcements" && (
                <div className="space-y-6">
                    <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-3 max-w-2xl">
                        <h2 className="font-bold text-sm">Publish an announcement to members</h2>
                        <Field label="Title"><input className={inputCls} value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></Field>
                        <Field label="Message"><textarea className={inputCls} rows={4} value={post.body} onChange={(e) => setPost({ ...post, body: e.target.value })} /></Field>
                        <Field label="Related platform (optional)"><select className={inputCls} value={post.platform_id} onChange={(e) => setPost({ ...post, platform_id: e.target.value })}><option value="">None</option>{platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                        <button className={primaryBtnCls} disabled={busy} onClick={async () => { if (await run(() => adminApi("/api/admin/ai/announcements", { action: "create", ...post }), "Announcement published.")) setPost({ title: "", body: "", platform_id: "" }); }}>PUBLISH</button>
                    </div>
                    <div className="space-y-2">
                        {news.map((n) => (
                            <div key={n.id} className="p-4 rounded border border-terminal-border bg-terminal-surface text-xs font-mono flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0"><div className="text-terminal-text font-bold">{n.title} {n.is_published ? "" : "(hidden)"}</div><div className="text-terminal-muted whitespace-pre-line mt-1">{n.body}</div><div className="text-terminal-muted mt-1">{shortDate(n.created_at)}</div></div>
                                <div className="flex gap-2">
                                    <button className={btnCls} disabled={busy} onClick={() => run(() => adminApi("/api/admin/ai/announcements", { action: "toggle", id: n.id, is_published: !n.is_published }), "Updated.")}>{n.is_published ? "HIDE" : "SHOW"}</button>
                                    <button className={dangerBtnCls} disabled={busy} onClick={() => { if (window.confirm("Delete this announcement?")) run(() => adminApi("/api/admin/ai/announcements", { action: "delete", id: n.id }), "Deleted."); }}>DELETE</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
