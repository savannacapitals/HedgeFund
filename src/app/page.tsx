export default function Home() {
    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-5xl mx-auto">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-terminal-surface border border-terminal-border text-terminal-gold text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-terminal-emerald animate-pulse"></span>
                    <span>Institutional Intelligence & Research Platform</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-terminal-text mb-6">
                    African Financial Intelligence <br className="hidden md:inline" />
                    <span className="text-terminal-gold">& Quantitative Research</span>
                </h1>

                <p className="text-lg md:text-xl text-terminal-muted max-w-2xl mb-10">
                    Rigorous macroeconomic analysis, advanced financial education academy, and institutional-grade market tools built for African markets.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
                    <a
                        href="/research"
                        className="w-full sm:w-auto bg-terminal-gold text-terminal-bg font-semibold px-6 py-3 rounded hover:bg-terminal-gold/90 transition-colors text-center"
                    >
                        Explore Research
                    </a>
                    <a
                        href="/academy"
                        className="w-full sm:w-auto bg-terminal-surface border border-terminal-border text-terminal-text font-semibold px-6 py-3 rounded hover:border-terminal-gold/50 transition-colors text-center"
                    >
                        View Academy
                    </a>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="border-t border-terminal-border bg-terminal-surface/30 px-6 py-16">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                        <h3 className="font-mono text-terminal-gold text-sm mb-2">01 // RESEARCH LIBRARY</h3>
                        <h4 className="text-lg font-semibold mb-2">Macroeconomic Insight</h4>
                        <p className="text-sm text-terminal-muted">
                            Deep-dive reports on monetary policy, fixed income markets, equity valuations, and currency flows across Sub-Saharan Africa.
                        </p>
                    </div>

                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                        <h3 className="font-mono text-terminal-gold text-sm mb-2">02 // SAVANNA ACADEMY</h3>
                        <h4 className="text-lg font-semibold mb-2">Professional Education</h4>
                        <p className="text-sm text-terminal-muted">
                            Structured quantitative finance, risk management, and trading methodologies built for serious market practitioners.
                        </p>
                    </div>

                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                        <h3 className="font-mono text-terminal-gold text-sm mb-2">03 // ANALYTICS & TOOLS</h3>
                        <h4 className="text-lg font-semibold mb-2">Quantitative Workflows</h4>
                        <p className="text-sm text-terminal-muted">
                            Reproducible calculation engines, paper-trading simulations, and asset watchlists designed with strict empirical standards.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}