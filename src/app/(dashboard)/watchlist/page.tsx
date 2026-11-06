import { Card } from "@/components/ui/Card";

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
        <div className="space-y-6">
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                    Preview · Not live prices
                </p>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">
                    Market watchlist
                </h2>
                <p className="mt-1 text-sm text-terminal-muted max-w-2xl">
                    Illustrative layout only. These figures are not live market data and must not be used for investment decisions.
                </p>
            </div>

            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left font-mono text-xs">
                        <thead className="bg-terminal-bg/60 border-b border-terminal-border text-terminal-muted">
                            <tr>
                                <th className="px-5 py-3 font-medium">Symbol</th>
                                <th className="px-5 py-3 font-medium">Asset</th>
                                <th className="px-5 py-3 font-medium">Category</th>
                                <th className="px-5 py-3 font-medium text-right">Last / Yield</th>
                                <th className="px-5 py-3 font-medium text-right">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-terminal-border text-terminal-text">
                            {WATCHLIST_ITEMS.map((item) => (
                                <tr key={item.symbol} className="hover:bg-terminal-surface/50">
                                    <td className="px-5 py-3 text-terminal-gold font-bold">{item.symbol}</td>
                                    <td className="px-5 py-3">{item.name}</td>
                                    <td className="px-5 py-3 text-terminal-muted">{item.category}</td>
                                    <td className="px-5 py-3 text-right font-bold tabular-nums">{item.lastPrice}</td>
                                    <td
                                        className={`px-5 py-3 text-right font-bold tabular-nums ${
                                            item.isPositive ? "text-terminal-emerald" : "text-red-400"
                                        }`}
                                    >
                                        {item.change}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
