import { Card } from "@/components/ui/Card";

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                        Preview · Sample entries only
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">
                        Trading journal
                    </h2>
                    <p className="mt-1 text-sm text-terminal-muted max-w-xl">
                        Sample entries so you can see the layout. They are not your trades, and new entries are not saved yet.
                    </p>
                </div>
                <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-md bg-terminal-gold/40 px-4 py-2 text-xs font-semibold text-terminal-bg"
                >
                    New entry · coming soon
                </button>
            </div>

            <div className="space-y-3">
                {JOURNAL_ENTRIES.map((entry) => (
                    <Card key={entry.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                                <span
                                    className={`px-2 py-0.5 rounded font-bold ${
                                        entry.type === "BUY"
                                            ? "bg-terminal-emerald/20 text-terminal-emerald"
                                            : "bg-red-500/20 text-red-400"
                                    }`}
                                >
                                    {entry.type}
                                </span>
                                <span className="text-terminal-text font-bold text-sm">{entry.asset}</span>
                                <span className="text-terminal-muted">{entry.date}</span>
                            </div>
                            <span
                                className={`font-mono font-bold text-sm tabular-nums ${
                                    entry.isProfit ? "text-terminal-emerald" : "text-red-400"
                                }`}
                            >
                                {entry.pnl}
                            </span>
                        </div>
                        <p className="text-xs text-terminal-muted leading-relaxed font-mono">
                            <span className="text-terminal-gold font-bold">Notes · </span>
                            {entry.notes}
                        </p>
                        <div className="mt-3 flex gap-4 text-[11px] font-mono text-terminal-muted">
                            <span>Entry {entry.entryPrice}</span>
                            <span>Exit {entry.exitPrice}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
