interface JournalEntry {
    id: string;
    date: string;
    asset: string;
    type: "BUY" | "SELL";
    entryPrice: string;
    exitPrice: string;
    pnl: string;
    isProfit: boolean;
    notes: string;
}

const JOURNAL_ENTRIES: JournalEntry[] = [
    {
        id: "j1",
        date: "2026-10-20",
        asset: "SCOM (NSE)",
        type: "BUY",
        entryPrice: "KES 16.80",
        exitPrice: "KES 17.40",
        pnl: "+KES 60,000",
        isProfit: true,
        notes: "Liquidity grab at support level post Q3 earnings sentiment.",
    },
    {
        id: "j2",
        date: "2026-10-14",
        asset: "IFB1/2023/17YR",
        type: "BUY",
        entryPrice: "14.40%",
        exitPrice: "14.25%",
        pnl: "+$1,200",
        isProfit: true,
        notes: "Duration trade anticipating CBK CBR rate cut transmission.",
    },
];

export default function JournalPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="border-b border-terminal-border pb-6 mb-8 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">Preview</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-terminal-text md:text-4xl">Trading journal</h1>
                    <p className="mt-3 max-w-xl text-sm text-terminal-muted">
                        Sample entries so you can see the layout. They are not your trades, and new entries are not saved yet.
                    </p>
                </div>

                <button type="button" disabled className="cursor-not-allowed rounded-lg bg-terminal-gold/50 px-4 py-2 text-xs font-semibold text-terminal-bg">
                    New entry coming soon
                </button>
            </div>

            <div className="space-y-4">
                {JOURNAL_ENTRIES.map((entry) => (
                    <div key={entry.id} className="p-5 rounded-lg bg-terminal-surface border border-terminal-border font-mono text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className={`px-2 py-0.5 rounded font-bold ${entry.type === "BUY" ? "bg-terminal-emerald/20 text-terminal-emerald" : "bg-red-500/20 text-red-400"}`}>
                                    {entry.type}
                                </span>
                                <span className="text-terminal-text font-bold text-sm">{entry.asset}</span>
                                <span className="text-terminal-muted">DATE: {entry.date}</span>
                            </div>
                            <span className={`font-bold text-sm ${entry.isProfit ? "text-terminal-emerald" : "text-red-400"}`}>
                                {entry.pnl}
                            </span>
                        </div>
                        <p className="text-terminal-muted leading-relaxed">
                            <span className="text-terminal-gold font-bold">NOTES:</span> {entry.notes}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}