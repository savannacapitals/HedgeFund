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
    bank?: { bankName: string; accountName: string; accountNumber: string; branch: string | null; swift: string | null; currency: string } | null;
}
interface Info {
    pochi: { available: boolean; tooLarge: boolean; approxAmount: string | null };
    bank: { available: boolean; approxAmount: string | null };
    payment: ManualView | null;
}

const btn = "px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg";
const gold = "w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 disabled:opacity-50";
const input = "w-full px-3 py-2 rounded bg-terminal-bg border border-terminal-border text-xs font-mono text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-gold";

/** Pays an order with Pochi la Biashara or a bank transfer. Reports back through onPaid when the order is confirmed. */
export default function ManualPayPanel({ orderId, method, onPaid }: { orderId: string; method: Method; onPaid: (redirectTo: string) => void }) {
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

    // A payment made with the other method stays open on the server: only show this method's own
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
            // network blip: try again next time
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
            setTimeout(() => setCopied(""), 1500);
        } catch {
            // clipboard blocked: the text is on screen to copy by hand
        }
    };

    const box = "p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-5";
    const Row = ({ label, value, id, big }: { label: string; value: string; id: string; big?: boolean }) => (
        <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">{label}</span>
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono break-all ${big ? "text-2xl font-bold text-terminal-gold" : "text-sm text-terminal-text"}`}>{value}</span>
                <button onClick={() => copy(value, id)} className={btn}>{copied === id ? "COPIED" : "COPY"}</button>
            </div>
        </div>
    );

    if (!info) return <div className={`${box} text-xs font-mono text-terminal-muted`}>Loading payment options…</div>;

    const available = method === "pochi" ? info.pochi.available : info.bank.available;
    if (!available && !mine) {
        return (
            <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border text-xs font-mono text-terminal-gold">
                {method === "pochi" && info.pochi.tooLarge
                    ? "This amount is above the M-Pesa limit for one transaction. Please pay by bank transfer instead."
                    : method === "pochi"
                    ? "Pochi la Biashara payments are not available right now."
                    : "Bank transfer is not available right now."}
            </div>
        );
    }

    // Step 1: nothing started yet
    if (!mine && !other) {
        return (
            <div className={box}>
                <p className="text-xs text-terminal-muted leading-relaxed">
                    {method === "pochi"
                        ? "You will send the exact amount to our Pochi la Biashara number from M-Pesa, then enter the M-Pesa code from your confirmation SMS. Your access unlocks automatically once we see the payment."
                        : "You will get our bank details and a reference. After you transfer, enter your bank's transaction reference. We confirm bank transfers by hand once the money reaches our account."}
                </p>
                <p className="text-xs font-mono text-terminal-gold">Amount: {method === "pochi" ? info.pochi.approxAmount : info.bank.approxAmount}</p>
                {error && <p className="text-xs font-mono text-red-400">{error}</p>}
                <button onClick={start} disabled={busy} className={gold}>{busy ? "PLEASE WAIT..." : "SHOW PAYMENT DETAILS"}</button>
            </div>
        );
    }

    // The other method already has a payment waiting
    if (!mine && other) {
        return (
            <div className={box}>
                <p className="text-xs text-terminal-muted leading-relaxed">
                    {other.status === "submitted"
                        ? "You already sent a payment for this order by another method and it is being checked. Please wait for it to be confirmed."
                        : "You have payment details open for another method. You can switch to this one."}
                </p>
                {error && <p className="text-xs font-mono text-red-400">{error}</p>}
                {other.status !== "submitted" && <button onClick={start} disabled={busy} className={gold}>{busy ? "PLEASE WAIT..." : "USE THIS METHOD INSTEAD"}</button>}
            </div>
        );
    }

    const p = mine!;
    const money = `${p.currency === "KES" ? "KES" : p.currency} ${Number(p.amount).toLocaleString("en-KE", { minimumFractionDigits: p.currency === "KES" && method === "pochi" ? 0 : 2 })}`;

    return (
        <div className={box}>
            {method === "pochi" && p.pochi && (
                <>
                    <Row label="Send exactly" value={money.replace("KES ", "KSh ")} id="amount" big />
                    <Row label="To Pochi la Biashara number" value={p.pochi.displayPhone} id="phone" />
                    {p.pochi.accountName && <p className="text-[11px] text-terminal-muted">M-Pesa will show the name <strong>{p.pochi.accountName}</strong> on the confirmation screen.</p>}
                    <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-1.5 list-disc pl-4">
                        <li><strong>M-Pesa app:</strong> Pay → Pochi la Biashara → enter the number and amount → enter your PIN.</li>
                        <li><strong>USSD:</strong> dial <strong>*334#</strong> → Pochi La Biashara → Send money → Pochi la Biashara → number, amount, Hakikisha, PIN.</li>
                        <li>Normal M-Pesa charges apply and are paid by you. Send the full amount so that at least {money.replace("KES ", "KSh ")} arrives.</li>
                    </ul>
                </>
            )}

            {method === "bank" && p.bank && (
                <>
                    <Row label="Transfer exactly" value={money} id="amount" big />
                    <Row label="Bank" value={p.bank.bankName} id="bank" />
                    <Row label="Account name" value={p.bank.accountName} id="accname" />
                    <Row label="Account number" value={p.bank.accountNumber} id="accno" />
                    {p.bank.branch && <Row label="Branch" value={p.bank.branch} id="branch" />}
                    {p.bank.swift && <Row label="SWIFT / BIC (international transfers)" value={p.bank.swift} id="swift" />}
                    <Row label="Payment reference (put this in the narration)" value={p.reference} id="ref" />
                    <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-1.5 list-disc pl-4">
                        <li>Always include the reference above so we can match your payment to this order.</li>
                        <li>Your bank may charge a transfer fee. Make sure the full {money} arrives, otherwise we cannot confirm it automatically.</li>
                    </ul>
                </>
            )}

            {p.status === "awaiting" || (p.status === "submitted" && method === "pochi") ? (
                <div className="space-y-3 border-t border-terminal-border pt-4">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted">
                        {method === "pochi" ? "M-Pesa confirmation code (from the SMS)" : "Bank transaction reference"}
                    </label>
                    <input
                        className={input}
                        value={code}
                        onChange={(e) => setCode(method === "pochi" ? e.target.value.toUpperCase() : e.target.value)}
                        placeholder={method === "pochi" ? "e.g. SGL4ABC12D" : "e.g. the reference on your bank receipt"}
                        maxLength={method === "pochi" ? 10 : 64}
                        autoCapitalize="characters"
                    />
                    {method === "bank" && <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name on the sending account (optional)" maxLength={80} />}
                    {error && <p className="text-xs font-mono text-red-400">{error}</p>}
                    <button onClick={submit} disabled={busy || !code.trim()} className={gold}>
                        {busy ? "PLEASE WAIT..." : p.status === "submitted" ? "UPDATE CODE" : "I HAVE PAID"}
                    </button>
                    {p.status === "submitted" && p.providerRef && (
                        <p className="text-[11px] font-mono text-terminal-muted">Code received: <strong>{p.providerRef}</strong>. Waiting for the payment to show up… this page updates by itself.</p>
                    )}
                </div>
            ) : (
                <div className="p-3 rounded bg-terminal-bg border border-terminal-border text-xs font-mono text-terminal-muted">
                    Reference received: <strong>{p.providerRef}</strong>. We are checking for your transfer. Bank transfers are confirmed by hand once the money reaches our account, so this can take a while. You can leave this page: your access unlocks as soon as it is confirmed.
                </div>
            )}
        </div>
    );
}
