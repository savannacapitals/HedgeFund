"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, inputCls, primaryBtnCls, shortDate } from "@/lib/admin/client";
import { ALL_ROLES, ROLE_INFO } from "@/lib/auth/roles";

// Most responsible roles first
const ORDER = ["administrator", "editor", "researcher", "finance_operator", "customer", "learner", "visitor"];

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [me, setMe] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [pending, setPending] = useState<Record<string, string>>({}); // userId -> chosen role
    const [savingId, setSavingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (roleFilter !== "all") params.set("role", roleFilter);
            if (search.trim()) params.set("q", search.trim());
            const json = await adminApi(`/api/admin/users?${params}`);
            setUsers(json.users);
            setCounts(json.roleCounts);
            setMe(json.me);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [roleFilter, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    async function saveRole(u: any) {
        const role = pending[u.id];
        if (!role || role === u.role) return;
        const msg = `Change ${u.email} from ${ROLE_INFO[u.role]?.label} to ${ROLE_INFO[role]?.label}?\n\n${ROLE_INFO[role]?.summary}`;
        if (!window.confirm(msg)) return;

        setSavingId(u.id);
        setError(null);
        setNotice(null);
        try {
            await adminApi("/api/admin/users", { action: "set_role", userId: u.id, role });
            setPending((p) => {
                const { [u.id]: _, ...rest } = p;
                return rest;
            });
            setNotice(`${u.email} is now ${ROLE_INFO[role]?.label}. They get the new access the next time they open a page.`);
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="pb-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">Administration · Access control</p>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">Users & roles</h2>
                <p className="mt-1 text-sm text-terminal-muted">Assign roles to control what each person can open in the admin area.</p>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
            {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
                        <div className="flex flex-wrap gap-2">
                            {["all", ...ORDER].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-mono border ${
                                        roleFilter === r ? "bg-terminal-gold text-terminal-bg border-terminal-gold font-bold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                                    }`}
                                >
                                    {r === "all" ? "ALL" : ROLE_INFO[r].label.toUpperCase()}
                                    {r !== "all" && counts[r] !== undefined ? ` ${counts[r]}` : ""}
                                </button>
                            ))}
                        </div>
                        <input className={inputCls + " md:max-w-[14rem]"} placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <div className="bg-terminal-surface rounded-lg border border-terminal-border overflow-x-auto font-mono text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                                <tr>
                                    <th className="p-3">PERSON</th>
                                    <th className="p-3">JOINED</th>
                                    <th className="p-3">ROLE</th>
                                    <th className="p-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-terminal-border text-terminal-text">
                                {users.map((u) => {
                                    const chosen = pending[u.id] ?? u.role;
                                    const isMe = u.id === me;
                                    return (
                                        <tr key={u.id}>
                                            <td className="p-3">
                                                <div className="font-bold">{u.full_name || u.email}{isMe && <span className="ml-2 text-terminal-gold">(you)</span>}</div>
                                                {u.full_name && <div className="text-terminal-muted">{u.email}</div>}
                                            </td>
                                            <td className="p-3 text-terminal-muted whitespace-nowrap">{shortDate(u.created_at).slice(0, 10)}</td>
                                            <td className="p-3">
                                                <select
                                                    className={inputCls + " min-w-[10rem]"}
                                                    disabled={isMe}
                                                    title={isMe ? "You cannot change your own role" : undefined}
                                                    value={chosen}
                                                    onChange={(e) => setPending({ ...pending, [u.id]: e.target.value })}
                                                >
                                                    {ORDER.filter((r) => (ALL_ROLES as readonly string[]).includes(r)).map((r) => (
                                                        <option key={r} value={r}>{ROLE_INFO[r].label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-right">
                                                {chosen !== u.role && (
                                                    <button className={primaryBtnCls} disabled={savingId === u.id} onClick={() => saveRole(u)}>
                                                        {savingId === u.id ? "..." : "SAVE"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!users.length && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-terminal-muted">{loading ? "Loading..." : "No one matches."}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] font-mono text-terminal-muted mt-3">
                        Showing the 200 most recent matches. Every role change is saved to the audit log.
                    </p>
                </div>

                <aside className="p-5 rounded-lg bg-terminal-surface border border-terminal-border h-fit">
                    <h2 className="text-sm font-bold text-terminal-text mb-4">What each role can do</h2>
                    <div className="space-y-4">
                        {ORDER.map((r) => (
                            <div key={r}>
                                <div className="text-xs font-mono font-bold text-terminal-gold">{ROLE_INFO[r].label}</div>
                                <div className="text-[11px] font-mono text-terminal-muted leading-relaxed">{ROLE_INFO[r].summary}</div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
