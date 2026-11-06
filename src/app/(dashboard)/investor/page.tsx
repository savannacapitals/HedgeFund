"use client";

import Link from "next/link";
import { Card, MetricCard } from "@/components/ui/Card";

/**
 * Investor workspace — Phase 3 placeholder.
 * IMPORTANT: No live portfolio balances, returns, or transactions are shown.
 * All figures below are illustrative only and must not be treated as account data.
 */
export default function InvestorWorkspacePage() {
    return (
        <div className="space-y-8">
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                    Investor workspace
                </p>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">
                    Portfolio overview
                </h2>
                <p className="mt-1 text-sm text-terminal-muted max-w-2xl">
                    This area is prepared for a future investor portal.{" "}
                    <strong className="text-terminal-text font-medium">
                        No live investment balances, performance, or transactions are available yet.
                    </strong>{" "}
                    Figures below are illustrative layout only.
                </p>
            </div>

            {/* Clear disclaimer banner */}
            <div className="rounded-lg border border-terminal-gold/40 bg-terminal-gold/5 px-4 py-3 text-sm">
                <p className="font-mono text-[11px] uppercase tracking-wider text-terminal-gold mb-1">
                    Illustrative only · Not live data
                </p>
                <p className="text-terminal-muted text-xs leading-relaxed">
                    Savanna Capitals does not display real portfolio valuations, deposits, withdrawals,
                    or investment performance on this page. When investor functionality is activated,
                    it will be backed by verified account data and the appropriate regulatory controls.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Total invested (illustrative)" value="—" footnote="Not connected" />
                <MetricCard label="Portfolio valuation" value="—" footnote="Not connected" />
                <MetricCard label="Period return" value="—" footnote="Not connected" />
                <MetricCard label="Cash available" value="—" footnote="Not connected" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <h3 className="text-sm font-semibold text-terminal-text mb-2">Asset allocation</h3>
                    <p className="text-xs text-terminal-muted mb-6">
                        Allocation charts will appear here when portfolio data is available.
                    </p>
                    <div className="h-40 rounded-md border border-dashed border-terminal-border flex items-center justify-center">
                        <span className="text-[11px] font-mono text-terminal-muted">
                            Chart placeholder · no live series
                        </span>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-sm font-semibold text-terminal-text mb-3">Account status</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-2">
                            <dt className="text-terminal-muted">Verification</dt>
                            <dd className="font-mono text-terminal-muted">Not configured</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-terminal-muted">Statements</dt>
                            <dd className="font-mono text-terminal-muted">Unavailable</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-terminal-muted">Deposits / withdrawals</dt>
                            <dd className="font-mono text-terminal-muted">Unavailable</dd>
                        </div>
                    </dl>
                </Card>
            </div>

            <Card>
                <h3 className="text-sm font-semibold text-terminal-text mb-2">Transaction history</h3>
                <p className="text-xs text-terminal-muted mb-4">
                    No transactions to display. This table will list deposits, withdrawals and
                    allocations only when the investor ledger is connected.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="text-terminal-muted border-b border-terminal-border">
                            <tr>
                                <th className="py-2 pr-4 font-medium">Date</th>
                                <th className="py-2 pr-4 font-medium">Type</th>
                                <th className="py-2 pr-4 font-medium">Reference</th>
                                <th className="py-2 pr-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="py-10 text-center text-terminal-muted">
                                    No records
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/research">
                    <Card hover className="h-full">
                        <span className="block text-sm font-semibold text-terminal-text">Research library</span>
                        <span className="mt-1 block text-xs text-terminal-muted">
                            Market notes and analysis that inform allocation decisions
                        </span>
                    </Card>
                </Link>
                <Link href="/dashboard">
                    <Card hover className="h-full">
                        <span className="block text-sm font-semibold text-terminal-text">Learning dashboard</span>
                        <span className="mt-1 block text-xs text-terminal-muted">
                            Continue structured education in the Academy
                        </span>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
