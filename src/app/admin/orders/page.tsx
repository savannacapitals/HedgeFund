"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, btnCls, dangerBtnCls, formatMoney, inputCls, primaryBtnCls, shortDate } from "@/lib/admin/client";

const FILTERS = ["all", "pending", "confirmed", "failed", "refunded"];
const STATUS_COLOUR: Record<string, string> = {
    confirmed: "text-terminal-emerald",
    pending: "text-terminal-gold",
    failed: "text-red-400",
    refunded: "text-terminal-muted",
};

const ACTIONS: Record<string, { label: string; help: string; cta: string }> = {
    confirm: {
        label: "Confirm payment",
        help: "Marks the order paid and gives the customer access to the course. Use this only after you have seen the money arrive.",
        cta: "CONFIRM ORDER",
    },
    fail: {
        label: "Cancel order (marks it failed)",
        help: "Cancels the order and its open payment. It will show as FAILED in the list. The customer would have to place a new order.",
        cta: "CANCEL ORDER",
    },
    refund: {
        label: "Record refund",
        help: "Marks the order refunded and removes course access. It does NOT send money back. Return the funds yourself from your wallet or exchange.",
        cta: "RECORD REFUND",
    },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [filter, setFilter] = useState("pending");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [open, setOpen] = useState<{ id: string; action: string } | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = filter !== "all" ? `?status=${filter}` : "";
            const json = await adminApi(`/api/admin/orders${params}`);
            setOrders(json.orders);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        load();
    }, [load]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter((o) => [o.customer, o.customerName, o.course, o.id].some((v) => (v || "").toLowerCase().includes(q)));
    }, [orders, search]);

    async function submit() {
        if (!open) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            await adminApi("/api/admin/orders", { action: open.action, orderId: open.id, note });
            setNotice("Done. This has been saved to the audit log.");
            setOpen(null);
            setNote("");
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    function actionsFor(status: string) {
        if (status === "pending") return ["confirm", "fail"];
        if (status === "confirmed") return ["refund"];
        return [];
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="border-b border-terminal-border pb-6 mb-6">
                <div className="text-xs font-mono text-terminal-gold mb-2">ADMIN // ORDERS</div>
                <h1 className="text-2xl md:text-3xl font-bold text-terminal-text">Order Reconciliation & Refunds</h1>
                <p className="text-xs font-mono text-terminal-muted mt-2">
                    Crypto payments confirm themselves when the exact amount arrives on-chain, and Pochi la Biashara payments when the M-Pesa SMS reaches the site. Bank transfers (and any Pochi payment still waiting) are confirmed here: check the money is in your account or Pochi, then confirm.
                </p>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>}
            {notice && <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">{notice}</div>}

            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded text-xs font-mono border ${
                                filter === f ? "bg-terminal-gold text-terminal-bg border-terminal-gold font-bold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                            }`}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
                <input className={inputCls + " md:max-w-xs"} placeholder="Search customer, course or order id" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="bg-terminal-surface rounded-lg border border-terminal-border overflow-x-auto font-mono text-xs">
                <table className="w-full text-left">
                    <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted">
                        <tr>
                            <th className="p-3">ORDER</th>
                            <th className="p-3">CUSTOMER</th>
                            <th className="p-3">COURSE</th>
                            <th className="p-3 text-right">AMOUNT</th>
                            <th className="p-3">STATUS</th>
                            <th className="p-3">PAYMENT</th>
                            <th className="p-3">PLACED (UTC)</th>
                            <th className="p-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border text-terminal-text">
                        {shown.map((o) => (
                            <Fragment key={o.id}>
                                <tr>
                                    <td className="p-3 text-terminal-gold">{o.id.slice(0, 8)}</td>
                                    <td className="p-3">{o.customer}</td>
                                    <td className="p-3 text-terminal-muted">{o.course || "—"}</td>
                                    <td className="p-3 text-right font-bold">{formatMoney(o.total_amount, o.currency)}</td>
                                    <td className={`p-3 font-bold ${STATUS_COLOUR[o.status] || ""}`}>{o.status.toUpperCase()}</td>
                                    <td className="p-3 text-terminal-muted">
                                        {o.payment?.label
                                            ? o.payment.label
                                            : o.payment
                                            ? `${o.payment.status}${o.payment.token ? ` · ${o.payment.token}` : ""}${o.payment.network ? ` on ${o.payment.network}` : ""}`
                                            : "none started"}
                                    </td>
                                    <td className="p-3 text-terminal-muted whitespace-nowrap">{shortDate(o.created_at)}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2 justify-end">
                                            {actionsFor(o.status).map((a) => (
                                                <button
                                                    key={a}
                                                    className={a === "confirm" ? primaryBtnCls : a === "refund" ? dangerBtnCls : btnCls}
                                                    onClick={() => {
                                                        setOpen({ id: o.id, action: a });
                                                        setNote("");
                                                        setError(null);
                                                    }}
                                                >
                                                    {a === "confirm" ? "CONFIRM" : a === "fail" ? "CANCEL ORDER" : "REFUND"}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                                {open?.id === o.id && (
                                    <tr className="bg-terminal-bg">
                                        <td colSpan={8} className="p-4">
                                            <div className="max-w-2xl space-y-3">
                                                <div className="font-bold text-terminal-text">{ACTIONS[open.action].label}</div>
                                                <p className="text-terminal-muted leading-relaxed">{ACTIONS[open.action].help}</p>
                                                <textarea
                                                    className={inputCls}
                                                    rows={2}
                                                    maxLength={500}
                                                    placeholder="Reason (required). For example: Customer paid 40.00 USDT on Tron, tx ending 9f2c, amount slightly off."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                />
                                                {error && <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}
                                                {note.trim().length < 5 && <p className="text-terminal-muted">Type a reason of at least 5 characters to enable the button.</p>}
                                                <div className="flex gap-3">
                                                    <button className={open.action === "refund" ? dangerBtnCls : primaryBtnCls} disabled={busy || note.trim().length < 5} onClick={submit}>
                                                        {busy ? "WORKING..." : ACTIONS[open.action].cta}
                                                    </button>
                                                    <button className={btnCls} onClick={() => setOpen(null)}>CLOSE</button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {!shown.length && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-terminal-muted">
                                    {loading ? "Loading..." : "No orders match."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
