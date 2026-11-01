"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, btnCls, dangerBtnCls, inputCls, primaryBtnCls, shortDate } from "@/lib/admin/client";

const CATEGORIES = ["Macroeconomics", "Fixed Income", "Equities", "Policy"];
const FILTERS = ["all", "draft", "review", "published", "archived"];

const STATUS_COLOUR: Record<string, string> = {
    published: "text-terminal-emerald",
    review: "text-terminal-gold",
    draft: "text-terminal-muted",
    archived: "text-terminal-muted",
};

const slugify = (s: string) =>
    s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

const blank = () => ({ id: null as string | null, title: "", slug: "", category: CATEGORIES[0], summary: "", body: "", tags: "", status: "draft" });

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">{label}</span>
            {children}
            {hint && <span className="block text-[10px] font-mono text-terminal-muted mt-1">{hint}</span>}
        </label>
    );
}

export default function AdminContentPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [perms, setPerms] = useState<{ role?: string; canDelete?: boolean; canPublish?: boolean }>({});
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [form, setForm] = useState<ReturnType<typeof blank> | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== "all") params.set("status", filter);
            if (search.trim()) params.set("q", search.trim());
            const json = await adminApi(`/api/admin/content?${params}`);
            setArticles(json.articles);
            setPerms({ role: json.role, canDelete: json.canDelete, canPublish: json.canPublish });
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    async function openEditor(id: string | null) {
        setError(null);
        setNotice(null);
        if (!id) {
            setForm(blank());
            setSlugTouched(false);
            return;
        }
        try {
            const { article } = await adminApi(`/api/admin/content?id=${id}`);
            setForm({
                id: article.id,
                title: article.title,
                slug: article.slug,
                category: article.category,
                summary: article.summary || "",
                body: article.body,
                tags: (article.tags || []).join(", "),
                status: article.status,
            });
            setSlugTouched(true);
        } catch (e: any) {
            setError(e.message);
        }
    }

    async function save(nextStatus?: string) {
        if (!form) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const status = nextStatus || form.status;
            const { id } = await adminApi("/api/admin/content", { action: "save", article: { ...form, status } });
            setForm({ ...form, id, status });
            setNotice(status === "published" ? "Published. It is now on the site." : "Saved.");
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!form?.id) return;
        if (!window.confirm(`Delete "${form.title}" permanently? This cannot be undone.`)) return;
        setBusy(true);
        try {
            await adminApi("/api/admin/content", { action: "delete", id: form.id });
            setForm(null);
            setNotice("Article deleted.");
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    const statusOptions = perms.canPublish ? ["draft", "review", "published", "archived"] : ["draft", "review"];

    // ------------------------------------------------------------ editor
    if (form) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-10">
                <button onClick={() => setForm(null)} className="text-xs font-mono text-terminal-gold hover:underline mb-4">
                    &larr; All articles
                </button>
                <h1 className="text-2xl font-bold text-terminal-text mb-6">{form.id ? "Edit article" : "New article"}</h1>

                {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
                {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-5">
                    <Field label="Title">
                        <input
                            className={inputCls}
                            value={form.title}
                            maxLength={200}
                            onChange={(e) => {
                                const title = e.target.value;
                                setForm({ ...form, title, slug: slugTouched ? form.slug : slugify(title) });
                            }}
                        />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Web address (slug)" hint={`/research/${form.slug || "..."}`}>
                            <input
                                className={inputCls}
                                value={form.slug}
                                onChange={(e) => {
                                    setSlugTouched(true);
                                    setForm({ ...form, slug: e.target.value.toLowerCase() });
                                }}
                            />
                        </Field>
                        <Field label="Category">
                            <input className={inputCls} list="categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                            <datalist id="categories">
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </Field>
                    </div>

                    <Field label="Summary" hint="Shown on the research list. A sentence or two.">
                        <textarea className={inputCls} rows={3} maxLength={600} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                    </Field>

                    <Field label="Body" hint="Plain text. Leave a blank line between paragraphs. Start a line with ## for a heading.">
                        <textarea className={inputCls + " leading-relaxed"} rows={18} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Tags" hint="Separate with commas.">
                            <input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                        </Field>
                        <Field label="Status" hint={perms.canPublish ? undefined : "Researchers submit for review; an editor publishes."}>
                            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                {statusOptions.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-terminal-border">
                        <button className={primaryBtnCls} disabled={busy} onClick={() => save()}>
                            {busy ? "SAVING..." : "SAVE"}
                        </button>
                        {perms.canPublish && form.status !== "published" && (
                            <button className={btnCls} disabled={busy} onClick={() => save("published")}>SAVE & PUBLISH</button>
                        )}
                        {!perms.canPublish && form.status === "draft" && (
                            <button className={btnCls} disabled={busy} onClick={() => save("review")}>SUBMIT FOR REVIEW</button>
                        )}
                        {form.id && form.status === "published" && (
                            <Link href={`/research/${form.slug}`} target="_blank" className={btnCls}>VIEW ON SITE &nearr;</Link>
                        )}
                        {form.id && perms.canDelete && (
                            <button className={dangerBtnCls + " ml-auto"} disabled={busy} onClick={remove}>DELETE</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------ list
    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-6 mb-6">
                <div>
                    <div className="text-xs font-mono text-terminal-gold mb-2">ADMIN // CONTENT</div>
                    <h1 className="text-2xl md:text-3xl font-bold text-terminal-text">Article Publishing & Editorial</h1>
                </div>
                <button className={primaryBtnCls} onClick={() => openEditor(null)}>+ NEW ARTICLE</button>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
            {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded text-xs font-mono border ${
                                filter === f ? "bg-terminal-gold text-terminal-bg border-terminal-gold font-bold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                            }`}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
                <input className={inputCls + " md:max-w-xs"} placeholder="Search title or slug" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="bg-terminal-surface rounded-lg border border-terminal-border overflow-x-auto font-mono text-xs">
                <table className="w-full text-left">
                    <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                        <tr>
                            <th className="p-3">TITLE</th>
                            <th className="p-3">CATEGORY</th>
                            <th className="p-3">STATUS</th>
                            <th className="p-3">AUTHOR</th>
                            <th className="p-3">UPDATED (UTC)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border text-terminal-text">
                        {articles.map((a) => (
                            <tr key={a.id} onClick={() => openEditor(a.id)} className="cursor-pointer hover:bg-terminal-bg/50">
                                <td className="p-3 font-bold max-w-md">{a.title}</td>
                                <td className="p-3 text-terminal-muted">{a.category}</td>
                                <td className={`p-3 font-bold ${STATUS_COLOUR[a.status] || ""}`}>{a.status.toUpperCase()}</td>
                                <td className="p-3 text-terminal-muted">{a.author}</td>
                                <td className="p-3 text-terminal-muted">{shortDate(a.updated_at)}</td>
                            </tr>
                        ))}
                        {!articles.length && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-terminal-muted">
                                    {loading ? "Loading..." : "No articles here yet. Click NEW ARTICLE to write the first one."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
