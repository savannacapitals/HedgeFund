import Link from "next/link";

interface AuditLogEntry {
    id: string;
    actor: string;
    action: string;
    target: string;
    timestamp: string;
    ipAddress: string;
}

const SAMPLE_AUDIT_LOGS: AuditLogEntry[] = [
    {
        id: "aud_101",
        actor: "admin@savannacapitals.com",
        action: "CONTENT_PUBLISH",
        target: "Research: Sub-Saharan Africa Macroeconomic Outlook",
        timestamp: "2026-10-24 14:32:05 UTC",
        ipAddress: "197.232.61.12",
    },
    {
        id: "aud_102",
        actor: "finance@savannacapitals.com",
        action: "ORDER_RECONCILE",
        target: "Order #ORD-8942 ($199.00 - Sandbox Crypto)",
        timestamp: "2026-10-24 11:15:22 UTC",
        ipAddress: "197.232.61.18",
    },
    {
        id: "aud_103",
        actor: "system_cron",
        action: "ENTITLEMENT_GRANT",
        target: "User #USR-4412 -> Course: Quantitative Macro",
        timestamp: "2026-10-24 09:00:00 UTC",
        ipAddress: "127.0.0.1",
    },
];

export default function AdminDashboardPage() {
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

                <div className="flex items-center space-x-3 text-xs font-mono">
                    <Link href="/admin/academy" className="px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg font-bold">
                        ACADEMY ADMIN
                    </Link>
                    <span className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-gold font-bold">
                        ROLE: ADMINISTRATOR
                    </span>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">TOTAL USERS</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">1,248</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">+12% this month</span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">ACTIVE ENROLLMENTS</span>
                    <span className="text-3xl font-bold font-mono text-terminal-gold">412</span>
                    <span className="text-xs font-mono text-terminal-muted block mt-2">Academy & Subscriptions</span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">MONTHLY REVENUE (EST)</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">$18,450.00</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">Reconciled via Sandbox</span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">PUBLISHED ARTICLES</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">28</span>
                    <span className="text-xs font-mono text-terminal-gold block mt-2">2 Drafts Pending Review</span>
                </div>
            </div>

            {/* Admin Modules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Management Quick Navigation */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-3">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">Content & User Controls</h2>

                    <Link
                        href="/admin/content"
                        className="p-3 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors flex items-center justify-between text-xs font-mono block"
                    >
                        <span className="text-terminal-text font-bold">📝 Article Publishing & Editorial</span>
                        <span className="text-terminal-gold">&rarr;</span>
                    </Link>

                    <Link
                        href="/admin/users"
                        className="p-3 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors flex items-center justify-between text-xs font-mono block"
                    >
                        <span className="text-terminal-text font-bold">👥 User Management & Roles</span>
                        <span className="text-terminal-gold">&rarr;</span>
                    </Link>

                    <Link
                        href="/admin/orders"
                        className="p-3 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors flex items-center justify-between text-xs font-mono block"
                    >
                        <span className="text-terminal-text font-bold">💳 Order Reconciliation & Refunds</span>
                        <span className="text-terminal-gold">&rarr;</span>
                    </Link>
                </div>

                {/* System Health Status */}
                <div className="lg:col-span-2 p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">System Operations & Adapters</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <span className="text-terminal-muted block mb-1">DATABASE RLS STATUS</span>
                            <span className="text-terminal-emerald font-bold text-sm block">ACTIVE / ENFORCED</span>
                            <span className="text-[10px] text-terminal-muted">Row Level Security enabled across public schemas</span>
                        </div>

                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <span className="text-terminal-muted block mb-1">PAYMENT ADAPTER ENGINE</span>
                            <span className="text-terminal-gold font-bold text-sm block">MOCK_SANDBOX_ACTIVE</span>
                            <span className="text-[10px] text-terminal-muted">Cryptographic signature verification enforced</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Append-Only Audit Log */}
            <div className="bg-terminal-surface rounded-lg border border-terminal-border p-6 font-mono text-xs">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-terminal-text">Immutable System Audit Log</h2>
                    <span className="text-terminal-gold text-[10px]">APPEND-ONLY RECORD</span>
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
                            {SAMPLE_AUDIT_LOGS.map((log) => (
                                <tr key={log.id} className="hover:bg-terminal-bg/50">
                                    <td className="p-3 text-terminal-gold">{log.id}</td>
                                    <td className="p-3">{log.actor}</td>
                                    <td className="p-3 font-bold">{log.action}</td>
                                    <td className="p-3 text-terminal-muted">{log.target}</td>
                                    <td className="p-3">{log.timestamp}</td>
                                    <td className="p-3 text-right">{log.ipAddress}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}