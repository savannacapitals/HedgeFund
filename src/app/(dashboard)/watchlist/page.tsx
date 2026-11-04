interface WatchlistItem {
    symbol: string;
    name: string;
    category: string;
    lastPrice: string;
    change: string;
    isPositive: boolean;
}

const WATCHLIST_ITEMS: WatchlistItem[] = [
    {
        symbol: "IFB1/2023/17YR",
        name: "Kenya Infrastructure Bond 17Y",
        category: "Fixed Income",
        lastPrice: "14.25%",
        change: "-0.15%",
        isPositive: true,
    },
    {
        symbol: "SCOM",
        name: "Safaricom PLC",
        category: "NSE Equities",
        lastPrice: "KES 17.50",
        change: "+1.15%",
        isPositive: true,
    },
    {
        symbol: "EQTY",
        name: "Equity Group Holdings",
        category: "NSE Equities",
        lastPrice: "KES 42.00",
        change: "-0.50%",
        isPositive: false,
    },
    {
        symbol: "USDKES",
        name: "USD / Kenya Shilling",
        category: "Currencies",
        lastPrice: "129.50",
        change: "+0.05%",
        isPositive: false,
    },
];

export default function WatchlistPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="border-b border-terminal-border pb-6 mb-8">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">Preview</p>
                <h1 className="text-2xl font-semibold tracking-tight text-terminal-text md:text-4xl">Market watchlist</h1>
                <p className="mt-3 max-w-2xl text-sm text-terminal-muted">
                    Illustrative layout only. These figures are not live market data and should not be used for decisions.
                </p>
            </div>

            <div className="bg-terminal-surface rounded-lg border border-terminal-border overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left font-mono text-xs">
                    <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                        <tr>
                            <th className="p-4">SYMBOL</th>
                            <th className="p-4">ASSET NAME</th>
                            <th className="p-4">CATEGORY</th>
                            <th className="p-4 text-right">LAST / YIELD</th>
                            <th className="p-4 text-right">24H CHANGE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border text-terminal-text">
                        {WATCHLIST_ITEMS.map((item, idx) => (
                            <tr key={idx} className="hover:bg-terminal-bg/50">
                                <td className="p-4 text-terminal-gold font-bold">{item.symbol}</td>
                                <td className="p-4">{item.name}</td>
                                <td className="p-4 text-terminal-muted">{item.category}</td>
                                <td className="p-4 text-right font-bold">{item.lastPrice}</td>
                                <td className={`p-4 text-right font-bold ${item.isPositive ? "text-terminal-emerald" : "text-red-400"}`}>
                                    {item.change}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}