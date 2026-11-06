import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/auth/staff";
import { ADMIN_AREA_ROLES, canAccess } from "@/lib/auth/roles";
import { getAdminMetrics, monthOverMonth, type RevenueLine } from "@/lib/admin/metrics";
import LiveRefresh from "@/components/LiveRefresh";
import { Card, MetricCard } from "@/components/ui/Card";

// Always read fresh figures. Never cache this page.
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-US");
const num = (n: number | null) => (n === null ? "—" : nf.format(n));
const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);

/** Prefer USD then KES then others; always list both USD and KES when showing platform totals. */
function formatLines(lines: RevenueLine[], ensureCurrencies: string[] = ["USD", "KES"]) {
    const map = new Map(lines.map((l) => [l.currency.toUpperCase(), l.amount]));
    for (const c of ensureCurrencies) {
        if (!map.has(c)) map.set(c, 0);
    }
    const ordered = [
        ...ensureCurrencies.filter((c) => map.has(c)),
        ...[...map.keys()].filter((c) => !ensureCurrencies.includes(c)).sort(),
    ];
    return ordered.map((c) => ({ currency: c, amount: map.get(c) ?? 0 }));
}

function ago(iso: string | null) {
    if (!iso) return "never";
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
}

export default async function AdminDashboardPage() {
    const access = await getStaffAccess(ADMIN_AREA_ROLES);
    if (access.status === "anonymous") redirect("/login");
    if (access.status === "forbidden") redirect("/");

    const role = access.role;
    const showMoney = canAccess(role, "orders");
    const showAudit = role === "administrator";
    const m = await getAdminMetrics({ money: showMoney, audit: showAudit });

    const growth = monthOverMonth(m.users.newThisMonth, m.users.newLastMonth);
    const growthDown = growth?.startsWith("-");

    const totals = showMoney && m.revenue.ok ? formatLines(m.revenue.lines) : [];
    const usdTotal = totals.find((l) => l.currency === "USD")?.amount ?? 0;
    const kesTotal = totals.find((l) => l.currency === "KES")?.amount ?? 0;

    const paymentsLive = m.payments.networks.length > 0;
    const scanStale =
        paymentsLive &&
        (!m.payments.lastScanAt || Date.now() - new Date(m.payments.lastScanAt).getTime() > 60 * 60 * 1000);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                        Operations · Control Centre
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">
                        Platform Overview
                    </h2>
                    <p className="mt-1 text-sm text-terminal-muted">
                        Live institutional snapshot of users, academy, research and revenue.
                    </p>
                </div>
                <LiveRefresh generatedAt={m.generatedAt} />
            </div>

            {/* Primary metrics */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${showMoney ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-4`}>
                <MetricCard
                    label="Total Users"
                    value={num(m.users.total)}
                    delta={growth ?? "Growth unavailable"}
                    deltaTone={growth === null ? "neutral" : growthDown ? "negative" : "positive"}
                    footnote={`${num(m.users.newThisMonth)} new this month`}
                />
                <MetricCard
                    label="Active Enrolments"
                    value={num(m.enrolments.active)}
                    footnote={`${num(m.enrolments.completed)} completed`}
                />
                {showMoney && (
                    <MetricCard
                        label={`Revenue · ${m.revenue.monthLabel || "This month"}`}
                        value={!m.revenue.ok ? "—" : money(usdTotal, "USD")}
                        footnote={
                            m.revenue.ok
                                ? `${money(kesTotal, "KES")} · ${num(m.revenue.confirmedOrders)} confirmed orders`
                                : "Revenue unavailable"
                        }
                    />
                )}
                <MetricCard
                    label="Published Research"
                    value={num(m.articles.published)}
                    footnote={`${num(m.articles.drafts)} drafts · ${num(m.articles.inReview)} awaiting review`}
                />
            </div>

            {/* Revenue breakdown by product */}
            {showMoney && m.revenue.ok && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-terminal-text">Revenue by product</h3>
                            <p className="text-[11px] font-mono text-terminal-muted mt-0.5">
                                Confirmed orders this month · USD and KES always shown
                            </p>
                        </div>
                        <Link
                            href="/admin/orders"
                            className="text-[11px] font-mono text-terminal-gold hover:underline"
                        >
                            Open orders →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(m.revenue.buckets.length
                            ? m.revenue.buckets
                            : [
                                  { key: "academy", label: "Academy", orderCount: 0, lines: [] as RevenueLine[] },
                                  { key: "ai_membership", label: "AI membership", orderCount: 0, lines: [] as RevenueLine[] },
                                  { key: "ai_assistance", label: "AI assistance", orderCount: 0, lines: [] as RevenueLine[] },
                              ]
                        ).map((bucket) => {
                            const lines = formatLines(bucket.lines);
                            return (
                                <div
                                    key={bucket.key}
                                    className="rounded-md border border-terminal-border bg-terminal-bg/40 p-4"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="text-xs font-semibold text-terminal-text">{bucket.label}</span>
                                        <span className="text-[10px] font-mono text-terminal-muted">
                                            {bucket.orderCount} order{bucket.orderCount === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {lines.map((l) => (
                                            <div key={l.currency} className="flex justify-between text-sm font-mono">
                                                <span className="text-terminal-muted">{l.currency}</span>
                                                <span
                                                    className={
                                                        l.amount > 0
                                                            ? "text-terminal-text tabular-nums font-semibold"
                                                            : "text-terminal-muted tabular-nums"
                                                    }
                                                >
                                                    {money(l.amount, l.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Platform totals */}
                    <div className="mt-4 pt-4 border-t border-terminal-border flex flex-wrap gap-x-8 gap-y-2 text-sm font-mono">
                        <span className="text-terminal-muted">Platform total</span>
                        {totals.map((l) => (
                            <span key={l.currency} className="text-terminal-text">
                                <span className="text-terminal-muted mr-2">{l.currency}</span>
                                <span className="font-semibold tabular-nums">{money(l.amount, l.currency)}</span>
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {/* Secondary status + quick links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-terminal-text">Operational Status</h3>
                        <span className="text-[10px] font-mono text-terminal-muted">REAL-TIME</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-terminal-muted">Open payments</span>
                                <span className="font-mono tabular-nums">{num(m.payments.openPayments)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-terminal-muted">Unmatched transfers</span>
                                <span className="font-mono tabular-nums text-red-400">
                                    {num(m.payments.unmatchedTransfers)}
                                </span>
                            </div>
                            {paymentsLive && (
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">Last payment scan</span>
                                    <span
                                        className={`font-mono ${scanStale ? "text-red-400" : "text-terminal-emerald"}`}
                                    >
                                        {ago(m.payments.lastScanAt)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-terminal-muted">Scan errors</span>
                                <span className="font-mono tabular-nums">{num(m.payments.scanErrors)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-terminal-muted">Networks live</span>
                                <span className="font-mono tabular-nums">
                                    {m.payments.networks.length ? m.payments.networks.join(", ") : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-sm font-semibold text-terminal-text mb-4">Quick Actions</h3>
                    <div className="flex flex-col gap-2">
                        {canAccess(role, "users") && (
                            <Link
                                href="/admin/users"
                                className="px-3 py-2 rounded-md text-sm border border-terminal-border hover:border-terminal-gold/50 hover:bg-terminal-gold/5 transition-colors"
                            >
                                Manage users & roles
                            </Link>
                        )}
                        {canAccess(role, "academy") && (
                            <Link
                                href="/admin/academy"
                                className="px-3 py-2 rounded-md text-sm border border-terminal-border hover:border-terminal-gold/50 hover:bg-terminal-gold/5 transition-colors"
                            >
                                Academy management
                            </Link>
                        )}
                        {canAccess(role, "content") && (
                            <Link
                                href="/admin/content"
                                className="px-3 py-2 rounded-md text-sm border border-terminal-border hover:border-terminal-gold/50 hover:bg-terminal-gold/5 transition-colors"
                            >
                                Research & editorial
                            </Link>
                        )}
                        {canAccess(role, "orders") && (
                            <Link
                                href="/admin/orders"
                                className="px-3 py-2 rounded-md text-sm border border-terminal-border hover:border-terminal-gold/50 hover:bg-terminal-gold/5 transition-colors"
                            >
                                Orders & payments
                            </Link>
                        )}
                        {canAccess(role, "ai") && (
                            <Link
                                href="/admin/ai"
                                className="px-3 py-2 rounded-md text-sm border border-terminal-border hover:border-terminal-gold/50 hover:bg-terminal-gold/5 transition-colors"
                            >
                                AI Opportunities
                            </Link>
                        )}
                    </div>
                </Card>
            </div>

            {showAudit && (
                <Card padding="none">
                    <div className="px-5 py-4 border-b border-terminal-border flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-terminal-text">Audit Log</h3>
                        <span className="text-[10px] font-mono text-terminal-gold uppercase tracking-wider">
                            Append-only · Latest 10
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-terminal-bg/60 text-terminal-muted">
                                <tr>
                                    <th className="px-5 py-3 font-medium">ID</th>
                                    <th className="px-5 py-3 font-medium">Actor</th>
                                    <th className="px-5 py-3 font-medium">Action</th>
                                    <th className="px-5 py-3 font-medium">Target</th>
                                    <th className="px-5 py-3 font-medium">Timestamp</th>
                                    <th className="px-5 py-3 font-medium text-right">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-terminal-border">
                                {m.audit.rows.map((log) => (
                                    <tr key={log.id} className="hover:bg-terminal-surface/50">
                                        <td className="px-5 py-3 text-terminal-gold">{log.id.slice(0, 8)}</td>
                                        <td className="px-5 py-3">{log.actor}</td>
                                        <td className="px-5 py-3 font-semibold text-terminal-text">{log.action}</td>
                                        <td className="px-5 py-3 text-terminal-muted">{log.target}</td>
                                        <td className="px-5 py-3">{log.timestamp}</td>
                                        <td className="px-5 py-3 text-right">{log.ipAddress}</td>
                                    </tr>
                                ))}
                                {m.audit.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-terminal-muted">
                                            {m.audit.ok
                                                ? "No audit events recorded yet."
                                                : "Audit log could not be loaded."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
