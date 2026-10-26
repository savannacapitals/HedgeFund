import Link from "next/link";

export default function DashboardPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            {/* Overview Header */}
            <div className="border-b border-terminal-border pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center space-x-2 text-xs font-mono text-terminal-gold mb-2">
                        <span>USER TERMINAL // OVERVIEW</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-terminal-text tracking-tight">
                        Account Dashboard
                    </h1>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-muted">
                        STATUS: <span className="text-terminal-emerald font-bold">ACTIVE SUBSCRIBER</span>
                    </span>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">ENROLLED COURSES</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">2</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">1 Course In Progress</span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">RESEARCH SUBSCRIPTION</span>
                    <span className="text-3xl font-bold font-mono text-terminal-gold">PASSPORT</span>
                    <span className="text-xs font-mono text-terminal-muted block mt-2">Renews Nov 2026</span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">PAPER TRADING EQUITY</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">$10,000.00</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">+2.4% Simulated Return</span>
                </div>
            </div>

            {/* Quick Navigation & Active Workflows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Learning Progress */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-terminal-text">Active Academy Courses</h2>
                        <Link href="/academy" className="text-xs font-mono text-terminal-gold hover:underline">
                            Browse Catalogue &rarr;
                        </Link>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <div className="flex items-center justify-between text-xs font-mono text-terminal-muted mb-2">
                                <span className="text-terminal-text font-bold">Quantitative Macroeconomic Analysis</span>
                                <span className="text-terminal-gold">65% Completed</span>
                            </div>
                            <div className="w-full bg-terminal-surface h-2 rounded-full overflow-hidden">
                                <div className="bg-terminal-gold h-full w-[65%]"></div>
                            </div>
                        </div>

                        <div className="p-4 rounded bg-terminal-bg border border-terminal-border">
                            <div className="flex items-center justify-between text-xs font-mono text-terminal-muted mb-2">
                                <span className="text-terminal-text font-bold">Institutional Price Action Mechanics</span>
                                <span className="text-terminal-emerald">Completed</span>
                            </div>
                            <div className="w-full bg-terminal-surface h-2 rounded-full overflow-hidden">
                                <div className="bg-terminal-emerald h-full w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Tools & Shortcuts */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">Quantitative Workflows</h2>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <Link
                            href="/watchlist"
                            className="p-4 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors block text-center"
                        >
                            <span className="text-terminal-gold text-lg block mb-1">📊</span>
                            <span className="text-terminal-text font-bold block">Asset Watchlist</span>
                            <span className="text-terminal-muted text-[10px]">Track Regional Yields & Equities</span>
                        </Link>

                        <Link
                            href="/journal"
                            className="p-4 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors block text-center"
                        >
                            <span className="text-terminal-gold text-lg block mb-1">📓</span>
                            <span className="text-terminal-text font-bold block">Trading Journal</span>
                            <span className="text-terminal-muted text-[10px]">Paper Trading Log & Metrics</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}