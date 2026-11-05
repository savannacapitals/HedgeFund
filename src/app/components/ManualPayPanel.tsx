"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_EVERY_MS = 8000;

type Method = "pochi" | "bank";

interface ManualView {
    id: string;
    method: Method;
    status: "awaiting" | "submitted" | "succeeded" | "expired";
    amount: string;
    currency: string;
    reference: string;
    providerRef: string | null;
    pochi?: { phone: string; displayPhone: string; accountName: string | null } | null;
    bank?: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        branch: string | null;
        swift: string | null;
        currency: string;
    } | null;
}
interface Info {
    pochi: { available: boolean; tooLarge: boolean; approxAmount: string | null };
    bank: { available: boolean; approxAmount: string | null };
    payment: ManualView | null;
}

function Spinner({ className = "w-3.5 h-3.5" }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
    );
}

const copyBtn =
    "inline-flex items-center px-2.5 py-1 rounded-md border border-terminal-border text-[10px] font-mono font-semibold hover:bg-terminal-bg transition-colors shrink-0";
const primaryBtn =
    "w-full py-3 rounded-md bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-gold focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-surface";
const field =
    "w-full px-3.5 py-2.5 rounded-md bg-terminal-bg border border-terminal-border text-xs font-mono text-terminal-text placeholder:text-terminal-muted/70 focus:outline-none focus:border-terminal-gold focus:ring-1 focus:ring-terminal-gold/40 transition-shadow";

/** Pays an order with Pochi la Biashara or a bank transfer. Reports back through onPaid when the order is confirmed. */
export default function ManualPayPanel({
    orderId,
    method,
    onPaid,
}: {
    orderId: string;
    method: Method;
    onPaid: (redirectTo: string) => void;
}) {
    const [info, setInfo] = useState<Info | null>(null);
    const [payment, setPayment] = useState<ManualView | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [copied, setCopied] = useState("");
    const onPaidRef = useRef(onPaid);
    onPaidRef.current = onPaid;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await fetch(`/api/payments/manual?orderId=${encodeURIComponent(orderId)}`);
            const json = res.ok ? await res.json() : null;
            if (cancelled) return;
            setInfo(json);
            setPayment(json?.payment ?? null);
        })();
        return () => {
            cancelled = true;
        };
    }, [orderId]);

    const mine = payment && payment.method === method ? payment : null;
    const other = payment && payment.method !== method ? payment : null;

    const poll = useCallback(async () => {
        if (!payment) return;
        try {
            const res = await fetch(`/api/payments/manual/status?paymentId=${encodeURIComponent(payment.id)}`);
            const json = await res.json();
            if (!res.ok) return;
            setPayment((p) => (p ? { ...p, status: json.status } : p));
            if (json.status === "succeeded") onPaidRef.current(json.redirectTo || "/dashboard");
        } catch {
            // network blip
        }
    }, [payment?.id]);

    useEffect(() => {
        if (!payment || payment.status !== "submitted") return;
        const timer = setInterval(poll, POLL_EVERY_MS);
        return () => clearInterval(timer);
    }, [payment?.id, payment?.status, poll]);

    const start = async () => {
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/payments/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, method }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Could not start the payment.");
            setPayment(json.payment);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        if (!mine) return;
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/payments/manual/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId: mine.id, providerRef: code, payerName: name }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Could not save your payment.");
            setPayment(json.payment);
            if (json.payment.status === "succeeded") onPaidRef.current(json.redirectTo || "/dashboard");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            setTimeout(() => setCopied(""), 1600);
        } catch {
            // clipboard blocked
        }
    };

    const Row = ({
        label,
        value,
        id,
        big,
    }: {
        label: string;
        value: string;
        id: string;
        big?: boolean;
    }) => (
        <div className="space-y-1.5">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted">{label}</span>
            <div className="flex items-center gap-2.5 flex-wrap">
                <span
                    className={`font-mono break-all ${big ? "text-2xl sm:text-3xl font-bold text-terminal-gold tabular-nums tracking-tight" : "text-sm text-terminal-text"
                        }`}
                >
                    {value}
                </span>
                <button type="button" onClick={() => copy(value, id)} className={copyBtn}>
                    {copied === id ? "Copied" : "Copy"}
                </button>
            </div>
        </div>
    );

    if (!info) {
        return (
            <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted py-2">
                <Spinner />
                Loading payment options…
            </div>
        );
    }

    const available = method === "pochi" ? info.pochi.available : info.bank.available;
    if (!available && !mine) {
        return (
            <div className="rounded-lg border border-terminal-gold/30 bg-terminal-gold/5 px-4 py-3.5 text-xs font-mono text-terminal-gold leading-relaxed">
                {method === "pochi" && info.pochi.tooLarge
                    ? "This amount is above the M-Pesa limit for a single transaction. Please pay by bank transfer instead."
                    : method === "pochi"
                        ? "Pochi la Biashara payments are not available right now."
                        : "Bank transfer is not available right now."}
            </div>
        );
    }

    // Step 1: nothing started yet
    if (!mine && !other) {
        return (
            <div className="space-y-5">
                <p className="text-sm text-terminal-muted leading-relaxed">
                    {method === "pochi"
                        ? "Send the exact amount to our Pochi la Biashara number from M-Pesa, then enter the confirmation code from your SMS. Access unlocks once we verify the payment."
                        : "You will receive our bank details and a unique reference. After you transfer, enter the bank transaction reference. Bank transfers are confirmed manually once funds arrive."}
                </p>
                <div className="rounded-lg bg-terminal-bg border border-terminal-border px-4 py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-terminal-muted">Amount due</span>
                    <span className="text-base font-mono font-bold text-terminal-gold tabular-nums">
                        {method === "pochi" ? info.pochi.approxAmount : info.bank.approxAmount}
                    </span>
                </div>
                {error && (
                    <p className="text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}
                <button type="button" onClick={start} disabled={busy} className={primaryBtn}>
                    {busy ? (
                        <>
                            <Spinner />
                            Please wait…
                        </>
                    ) : (
                        "Show payment details"
                    )}
                </button>
            </div>
        );
    }

    // The other method already has a payment waiting
    if (!mine && other) {
        return (
            <div className="space-y-5">
                <p className="text-sm text-terminal-muted leading-relaxed">
                    {other.status === "submitted"
                        ? "You already submitted a payment for this order with another method. Please wait while it is verified."
                        : "You already have payment details open for another method. You can switch to this one if you prefer."}
                </p>
                {error && (
                    <p className="text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}
                {other.status !== "submitted" && (
                    <button type="button" onClick={start} disabled={busy} className={primaryBtn}>
                        {busy ? (
                            <>
                                <Spinner />
                                Please wait…
                            </>
                        ) : (
                            "Use this method instead"
                        )}
                    </button>
                )}
            </div>
        );
    }

    const p = mine!;
    const money = `${p.currency === "KES" ? "KES" : p.currency} ${Number(p.amount).toLocaleString("en-KE", {
        minimumFractionDigits: p.currency === "KES" && method === "pochi" ? 0 : 2,
    })}`;

    return (
        <div className="space-y-6">
            {method === "pochi" && p.pochi && (
                <div className="space-y-5">
                    <Row label="Send exactly" value={money.replace("KES ", "KSh ")} id="amount" big />
                    <Row label="Pochi la Biashara number" value={p.pochi.displayPhone} id="phone" />
                    {p.pochi.accountName && (
                        <p className="text-[11px] text-terminal-muted leading-relaxed -mt-2">
                            M-Pesa will show the name <strong className="text-terminal-text">{p.pochi.accountName}</strong> on the
                            confirmation screen.
                        </p>
                    )}
                    <div className="rounded-lg bg-terminal-bg border border-terminal-border px-4 py-3.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-terminal-muted mb-2.5">How to pay</p>
                        <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-2">
                            <li className="flex gap-2">
                                <span className="text-terminal-gold/70 shrink-0">1.</span>
                                <span>
                                    <strong className="text-terminal-text">M-Pesa app:</strong> Pay → Pochi la Biashara → enter the number
                                    and amount → PIN.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-terminal-gold/70 shrink-0">2.</span>
                                <span>
                                    <strong className="text-terminal-text">USSD:</strong> dial <strong className="text-terminal-text">*334#</strong>{" "}
                                    → Pochi La Biashara → Send money → number, amount, Hakikisha, PIN.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-terminal-gold/70 shrink-0">3.</span>
                                <span>
                                    Standard M-Pesa charges apply and are paid by you. Send the full amount so at least{" "}
                                    {money.replace("KES ", "KSh ")} arrives.
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {method === "bank" && p.bank && (
                <div className="space-y-5">
                    <Row label="Transfer exactly" value={money} id="amount" big />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Row label="Bank" value={p.bank.bankName} id="bank" />
                        <Row label="Account name" value={p.bank.accountName} id="accname" />
                        <Row label="Account number" value={p.bank.accountNumber} id="accno" />
                        {p.bank.branch && <Row label="Branch" value={p.bank.branch} id="branch" />}
                    </div>
                    {p.bank.swift && (
                        <Row label="SWIFT / BIC (international)" value={p.bank.swift} id="swift" />
                    )}
                    <div className="rounded-lg border border-terminal-gold/25 bg-terminal-gold/5 px-4 py-3.5 space-y-2">
                        <Row label="Payment reference (required in narration)" value={p.reference} id="ref" />
                        <p className="text-[11px] text-terminal-muted leading-relaxed">
                            Always include this reference so we can match your payment to this order. Your bank may charge a fee —
                            ensure the full {money} arrives.
                        </p>
                    </div>
                </div>
            )}

            {p.status === "awaiting" || (p.status === "submitted" && method === "pochi") ? (
                <div className="space-y-4 border-t border-terminal-border pt-5">
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5">
                            {method === "pochi" ? "M-Pesa confirmation code (from SMS)" : "Bank transaction reference"}
                        </label>
                        <input
                            className={field}
                            value={code}
                            onChange={(e) => setCode(method === "pochi" ? e.target.value.toUpperCase() : e.target.value)}
                            placeholder={method === "pochi" ? "e.g. SGL4ABC12D" : "Reference from your bank receipt"}
                            maxLength={method === "pochi" ? 10 : 64}
                            autoCapitalize="characters"
                            autoComplete="off"
                        />
                    </div>
                    {method === "bank" && (
                        <div>
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5">
                                Name on sending account <span className="normal-case tracking-normal text-terminal-muted/70">(optional)</span>
                            </label>
                            <input
                                className={field}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="As shown on the transfer"
                                maxLength={80}
                                autoComplete="name"
                            />
                        </div>
                    )}
                    {error && (
                        <p className="text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                    <button type="button" onClick={submit} disabled={busy || !code.trim()} className={primaryBtn}>
                        {busy ? (
                            <>
                                <Spinner />
                                Please wait…
                            </>
                        ) : p.status === "submitted" ? (
                            "Update code"
                        ) : (
                            "I have paid"
                        )}
                    </button>
                    {p.status === "submitted" && p.providerRef && (
                        <div className="rounded-lg bg-terminal-bg border border-terminal-border px-4 py-3 flex items-start gap-3">
                            <Spinner className="w-3.5 h-3.5 text-terminal-muted shrink-0 mt-0.5" />
                            <p className="text-[11px] font-mono text-terminal-muted leading-relaxed">
                                Code received: <strong className="text-terminal-text">{p.providerRef}</strong>. Waiting for the payment
                                to appear — this page updates automatically.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-lg bg-terminal-bg border border-terminal-border px-4 py-3.5 flex items-start gap-3">
                    <Spinner className="w-3.5 h-3.5 text-terminal-muted shrink-0 mt-0.5" />
                    <div className="text-[11px] font-mono text-terminal-muted leading-relaxed">
                        <p>
                            Reference received: <strong className="text-terminal-text">{p.providerRef}</strong>.
                        </p>
                        <p className="mt-1.5">
                            We are checking for your transfer. Bank transfers are confirmed by hand once funds reach our account, so
                            this can take a while. You can leave this page — access unlocks as soon as it is confirmed.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
