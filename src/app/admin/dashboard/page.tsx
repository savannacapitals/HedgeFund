import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/auth/staff";
import { ADMIN_AREA_ROLES, canAccess } from "@/lib/auth/roles";
import { getAdminMetrics, monthOverMonth } from "@/lib/admin/metrics";
import LiveRefresh from "@/components/LiveRefresh";

// Always read fresh figures. Never cache this page.
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-US");
const num = (n: number | null) => (n === null ? "—" : nf.format(n));
const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);

function ago(iso: string | null) {
    if (!iso) return "never";
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
}

export default async function AdminDashboardPage() {
    // The admin layout already checks this; checking again here keeps the page safe
    // even if it is ever moved out of /admin.
    const access = await getStaffAccess(ADMIN_AREA_ROLES);
    if (access.status === "anonymous") redirect("/login");
    if (access.status === "forbidden") redirect("/");

    const role = access.role;
    const showMoney = canAccess(role, "orders");
    const showAudit = role === "administrator";
    const m = await getAdminMetrics({ money: showMoney, audit: showAudit });

    const growth = monthOverMonth(m.users.newThisMonth, m.users.newLastMonth);
    const growthDown = growth?.startsWith("-");
    const usd = m.revenue.lines.find((l) => l.currency === "USD");
    const otherRevenue = m.revenue.lines.filter((l) => l.currency !== "USD");

    const paymentsLive = m.payments.networks.length > 0;
    const scanStale =
        paymentsLive && (!m.payments.lastScanAt || Date.now() - new Date(m.payments.lastScanAt).getTime() > 60 * 60 * 1000);

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            {/* Admin Header */}
            <div className="border-b border-terminal-border pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center space-x-2 text-xs font-mono text-terminal-gold mb-2">
                        <span>PRIVILEGED PORTAL // ADMINISTRATION</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-terminal-text tracking-tight">
                        System Control & Operations
                    </h1>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                        {canAccess(role, "academy") && (
                            <Link href="/admin/academy" className="px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg font-bold">
                                ACADEMY ADMIN
                            </Link>
                        )}
                        <Link
                            href="/dashboard"
                            className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-text hover:border-terminal-gold/50"
                        >
                            MEMBER DASHBOARD
                        </Link>
                        <Link
                            href="/"
                            className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-text hover:border-terminal-gold/50"
                        >
                            VIEW SITE
                        </Link>
                        <span className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-gold font-bold">
                            ROLE: {(access.role || "").toUpperCase()}
                        </span>
                    </div>
                    <LiveRefresh generatedAt={m.generatedAt} />
                </div>
            </div>

            {/* Metrics Row (live) */}
            <div className={`grid grid-cols-1 ${showMoney ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6 mb-10`}>
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">TOTAL USERS</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">{num(m.users.total)}</span>
                    <span
                        className={`text-xs font-mono block mt-2 ${
                            growth === null ? "text-terminal-muted" : growthDown ? "text-red-400" : "text-terminal-emerald"
                        }`}
                    >
                        {growth ?? "Growth unavailable"}
                    </span>
                    <span className="text-[10px] font-mono text-terminal-muted block">
                        {num(m.users.newThisMonth)} new this month
                    </span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">ACTIVE ENROLLMENTS</span>
                    <span className="text-3xl font-bold font-mono text-terminal-gold">{num(m.enrolments.active)}</span>
                    <span className="text-xs font-mono text-terminal-muted block mt-2">
                        {num(m.enrolments.completed)} completed
                    </span>
                </div>

                {showMoney && (
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">
                        REVENUE · {m.revenue.monthLabel.toUpperCase() || "THIS MONTH"}
                    </span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">
                        {!m.revenue.ok ? "—" : money(usd?.amount ?? 0, "USD")}
                    </span>
                    {otherRevenue.map((l) => (
                        <span key={l.currency} className="text-xs font-mono text-terminal-text block mt-1">
                            + {money(l.amount, l.currency)}
                        </span>
                    ))}
                    <span className="text-xs font-mono text-terminal-muted block mt-2">
                        {m.revenue.ok ? `${num(m.revenue.confirmedOrders)} confirmed orders` : "Revenue unavailable"}
                    </span>
                </div>
                )}

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">PUBLISHED ARTICLES</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">{num(m.articles.published)}</span>
                    <span className="text-xs font-mono text-terminal-gold block mt-2">
                        {m.articles.inReview === null
                            ? "Review queue unavailable"
                            : `${m.articles.inReview} pending review`}
                    </span>
                    <span className="text-[10px] font-mono text-terminal-muted block">
                        {num(m.articles.drafts)} drafts
                    </span>
                </div>
            </div>

            {/* Admin Modules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Management Quick Navigation (only what this role can open) */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-3">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">Content & User Controls</h2>

                    {[
                        { section: "content", href: "/admin/content", title: "📝 Article Publishing & Editorial", sub: "Write, edit and publish research" },
                        { section: "academy", href: "/admin/academy", title: "🎓 Academy Courses & Lessons", sub: "Courses, lessons, quizzes" },
                        { section: "users", href: "/admin/users", title: "👥 User Management & Roles", sub: "Decide who can do what" },
                        { section: "orders", href: "/admin/orders", title: "💳 Order Reconciliation & Refunds", sub: "Confirm, fail or refund orders" },
                    ]
                        .filter((l) => canAccess(role, l.section as any))
                        .map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="p-3 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors flex items-center justify-between text-xs font-mono block"
                            >
                                <span>
                                    <span className="text-terminal-text font-bold block">{l.title}</span>
                                    <span className="text-[10px] text-terminal-muted">{l.sub}</span>
                                </span>
                                <span className="text-terminal-gold">&rarr;</span>
                            </Link>
                        ))}
                </div>

                {/* System Health Status (money roles only) */}
                {showMoney && (
                <div className="lg:col-span-2 p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">System Operations & Payments</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <span className="text-terminal-muted block mb-1">STABLECOIN PAYMENTS</span>
                            <span
                                className={`font-bold text-sm block ${
                                    !paymentsLive ? "text-red-400" : scanStale || m.payments.scanErrors ? "text-terminal-gold" : "text-terminal-emerald"
                                }`}
                            >
                                {!paymentsLive ? "NOT CONFIGURED" : scanStale ? "SCANNER STALE" : m.payments.scanErrors ? "SCAN ERRORS" : "ACTIVE"}
                            </span>
                            <span className="text-[10px] text-terminal-muted block">
                                {paymentsLive
                                    ? `${m.payments.networks.length} networks · last scan ${ago(m.payments.lastScanAt)}`
                                    : "No deposit addresses are set, so checkout cannot take payments"}
                            </span>
                        </div>

                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <span className="text-terminal-muted block mb-1">OPEN PAYMENTS</span>
                            <span className="text-terminal-gold font-bold text-sm block">{num(m.payments.openPayments)}</span>
                            <span className="text-[10px] text-terminal-muted">Orders waiting for a transfer</span>
                        </div>

                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border md:col-span-2">
                            <span className="text-terminal-muted block mb-1">UNMATCHED TRANSFERS</span>
                            <span
                                className={`font-bold text-sm block ${
                                    m.payments.unmatchedTransfers ? "text-terminal-gold" : "text-terminal-emerald"
                                }`}
                            >
                                {num(m.payments.unmatchedTransfers)}
                            </span>
                            <span className="text-[10px] text-terminal-muted">
                                Money received that did not match an open order (check by hand)
                            </span>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Append-Only Audit Log (administrators only) */}
            {showAudit && (
            <div className="bg-terminal-surface rounded-lg border border-terminal-border p-6 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-base font-bold text-terminal-text">Immutable System Audit Log</h2>
                    <span className="text-terminal-gold text-[10px]">APPEND-ONLY RECORD · LATEST 10</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">ACTOR</th>
                                <th className="p-3">ACTION</th>
                                <th className="p-3">TARGET</th>
                                <th className="p-3">TIMESTAMP</th>
                                <th className="p-3 text-right">IP ADDRESS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-terminal-border text-terminal-text">
                            {m.audit.rows.map((log) => (
                                <tr key={log.id} className="hover:bg-terminal-bg/50">
                                    <td className="p-3 text-terminal-gold">{log.id.slice(0, 8)}</td>
                                    <td className="p-3">{log.actor}</td>
                                    <td className="p-3 font-bold">{log.action}</td>
                                    <td className="p-3 text-terminal-muted">{log.target}</td>
                                    <td className="p-3">{log.timestamp}</td>
                                    <td className="p-3 text-right">{log.ipAddress}</td>
                                </tr>
                            ))}
                            {m.audit.rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-terminal-muted">
                                        {m.audit.ok ? "No audit events recorded yet." : "Audit log could not be loaded."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
}
