"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";
import ManualPayPanel from "@/components/ManualPayPanel";

const POLL_EVERY_MS = 8000;

interface Token {
    symbol: "USDC" | "USDT";
    id: string;
    uri: string;
}
interface Network {
    id: string;
    name: string;
    family: string;
    address: string;
    addressUrl: string;
    warning: string | null;
    tokens: Token[];
}
interface PaymentView {
    id: string;
    status: string;
    amountDue: string;
    expiresAt: string;
    networks: Network[];
}

type Method = "pochi" | "bank" | "crypto";

const METHOD_META: Record<
    Method,
    { label: string; short: string; description: string; recommended?: boolean }
> = {
    pochi: {
        label: "Pochi la Biashara",
        short: "M-Pesa",
        description: "Instant M-Pesa payment. Access unlocks once the code is verified.",
        recommended: true,
    },
    bank: {
        label: "Bank Transfer",
        short: "Bank",
        description: "Transfer to our account. Confirmed manually after funds arrive.",
    },
    crypto: {
        label: "USDC / USDT",
        short: "Crypto",
        description: "Stablecoin payment on supported networks. Confirmed on-chain.",
    },
};

function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

function LockIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function CheckCircle({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
    );
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    const supabase = useMemo(() => createClient(), []);

    const [order, setOrder] = useState<any>(null);
    const [info, setInfo] = useState<{ available: boolean; approxAmount?: string } | null>(null);
    const [payment, setPayment] = useState<PaymentView | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [coin, setCoin] = useState<"USDC" | "USDT">("USDT");
    const [networkId, setNetworkId] = useState("");
    const [qr, setQr] = useState("");
    const [copied, setCopied] = useState<"address" | "amount" | "">("");
    const [paid, setPaid] = useState<string | null>(null);
    const [method, setMethod] = useState<Method>("pochi");

    useEffect(() => {
        async function load() {
            if (!orderId) return;
            setLoading(true);

            const { data } = await supabase.from("orders").select("*, courses(*)").eq("id", orderId).maybeSingle();
            setOrder(data ?? null);

            if (data && data.status === "pending") {
                const res = await fetch(`/api/payments/stablecoin/payment?orderId=${encodeURIComponent(orderId)}`);
                const json = res.ok ? await res.json() : { available: false };
                setInfo(json);
                if (json.payment) setPayment(json.payment);
            }
            setLoading(false);
        }
        load();
    }, [orderId, supabase]);

    const networks = useMemo(
        () => (payment ? payment.networks.filter((n) => n.tokens.some((t) => t.symbol === coin)) : []),
        [payment, coin]
    );

    useEffect(() => {
        if (networks.length && !networks.some((n) => n.id === networkId)) setNetworkId(networks[0].id);
    }, [networks, networkId]);

    const network = networks.find((n) => n.id === networkId);
    const token = network?.tokens.find((t) => t.symbol === coin);

    useEffect(() => {
        let cancelled = false;
        async function draw() {
            if (!token) return setQr("");
            const QRCode = (await import("qrcode")).default;
            const url = await QRCode.toDataURL(token.uri, { margin: 1, width: 224 });
            if (!cancelled) setQr(url);
        }
        draw();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const check = useCallback(async () => {
        if (!payment) return;
        try {
            const res = await fetch(`/api/payments/stablecoin/status?paymentId=${encodeURIComponent(payment.id)}`);
            const json = await res.json();
            if (!res.ok) return;
            setPayment((p) => (p ? { ...p, status: json.status } : p));
            if (json.status === "succeeded") setPaid(json.redirectTo || "/dashboard");
        } catch {
            // network blip
        }
    }, [payment?.id]);

    useEffect(() => {
        if (!payment || payment.status !== "pending") return;
        const timer = setInterval(check, POLL_EVERY_MS);
        return () => clearInterval(timer);
    }, [payment?.id, payment?.status, check]);

    useEffect(() => {
        if (!paid) return;
        const t = setTimeout(() => {
            router.push(paid);
            router.refresh();
        }, 1800);
        return () => clearTimeout(t);
    }, [paid, router]);

    const startPayment = async () => {
        setStarting(true);
        setErrorMessage("");
        try {
            const res = await fetch("/api/payments/stablecoin/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Could not start the payment.");
            setPayment(json.payment);
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setStarting(false);
        }
    };

    const simulate = async () => {
        setStarting(true);
        setErrorMessage("");
        try {
            const res = await fetch("/api/payments/sandbox-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Simulation failed.");
            router.push(json.redirectTo);
        } catch (err: any) {
            setErrorMessage(err.message);
            setStarting(false);
        }
    };

    const copy = async (text: string, what: "address" | "amount") => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            setTimeout(() => setCopied(""), 1600);
        } catch {
            // clipboard blocked
        }
    };

    const shell = (title: string, text: string, action?: React.ReactNode, success?: boolean) => (
        <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col">
            <header className="border-b border-terminal-border/80 bg-terminal-bg/95 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
                    <BrandMark height={32} />
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-terminal-muted">
                        <LockIcon />
                        <span>Secure checkout</span>
                    </div>
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center px-5 py-16">
                <div className="w-full max-w-md text-center">
                    <div
                        className={`mx-auto mb-6 w-14 h-14 rounded-full flex items-center justify-center border ${success
                                ? "bg-terminal-emerald/10 border-terminal-emerald/30 text-terminal-emerald"
                                : "bg-terminal-surface border-terminal-border text-terminal-gold"
                            }`}
                    >
                        {success ? <CheckCircle className="w-7 h-7" /> : <ShieldIcon className="w-6 h-6" />}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">{title}</h1>
                    <p className="text-sm text-terminal-muted leading-relaxed mb-8 font-mono">{text}</p>
                    {action}
                </div>
            </div>
        </div>
    );

    const goldBtn =
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-terminal-gold text-terminal-bg text-xs font-mono font-bold tracking-wide hover:bg-terminal-gold/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-gold focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg";

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col items-center justify-center gap-4">
                <Spinner className="w-6 h-6 text-terminal-gold" />
                <p className="font-mono text-[11px] tracking-widest text-terminal-muted uppercase">Loading secure checkout</p>
            </div>
        );
    }

    if (!order) {
        return shell(
            "Order not found",
            "This transaction reference is invalid or has expired.",
            <Link href="/academy" className={goldBtn}>
                Return to Academy
            </Link>
        );
    }

    if (order.status === "confirmed" || paid) {
        if (order.kind === "ai_membership") {
            return shell(
                "Payment received",
                "Your Savanna AI Opportunities membership is now active.",
                <Link href={paid || "/ai-opportunities/dashboard"} className={goldBtn}>
                    Open dashboard
                </Link>,
                true
            );
        }
        if (order.kind === "ai_assistance") {
            return shell(
                "Payment received",
                "Your account assistance request has been received.",
                <Link href={paid || "/ai-opportunities/dashboard#assistance"} className={goldBtn}>
                    View request
                </Link>,
                true
            );
        }
        return order.kind === "community"
            ? shell(
                "Payment received",
                "Your Killzone Journal access is now active.",
                <Link href={paid || "/community/killzone"} className={goldBtn}>
                    Join Killzone Journal
                </Link>,
                true
            )
            : shell(
                "Payment received",
                "Your course access is now active.",
                <Link href={paid || `/learn/${order.courses?.slug}/lessons`} className={goldBtn}>
                    Go to course
                </Link>,
                true
            );
    }

    if (order.status !== "pending") {
        return shell(
            "Order unavailable",
            "This order can no longer be paid. Please start a new enrolment.",
            <Link href="/academy" className={goldBtn}>
                Return to Academy
            </Link>
        );
    }

    if (payment && payment.status === "expired") {
        return shell(
            "Payment window closed",
            "This payment expired before it was received. If you already sent funds, contact support with your transaction ID.",
            <Link href="/academy" className={goldBtn}>
                Return to Academy
            </Link>
        );
    }

    const total = Number(order.total_amount).toFixed(2);
    const discount = Number(order.discount_amount || 0);
    const subtotal = Number(order.subtotal_amount ?? order.total_amount).toFixed(2);
    const showDevSimulate = process.env.NODE_ENV !== "production";
    const unlockWord =
        order.kind === "ai_membership"
            ? "AI Opportunities membership"
            : order.kind === "ai_assistance"
                ? "assistance request"
                : order.kind === "community"
                    ? "Killzone Journal access"
                    : "course";

    const productTitle =
        order.kind === "ai_membership"
            ? "Savanna AI Opportunities · Membership (30 days)"
            : order.kind === "ai_assistance"
                ? "Savanna AI Opportunities · Account assistance"
                : order.kind === "community"
                    ? "The Killzone Journal · Community Access"
                    : order.courses?.title || "Academy Course Access";

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col">
            {/* Top bar */}
            <header className="border-b border-terminal-border/80 bg-terminal-bg/95 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
                    <BrandMark height={32} />
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-terminal-muted">
                            <LockIcon />
                            <span>Encrypted · TLS 1.3</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-terminal-emerald/10 border border-terminal-emerald/25 text-terminal-emerald text-[10px] font-mono font-semibold tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-emerald animate-pulse" />
                            Secure
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8 sm:py-12">
                {/* Page intro */}
                <div className="mb-8 sm:mb-10">
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-terminal-gold mb-2">
                        Institutional checkout
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-terminal-text">
                        Complete your payment
                    </h1>
                    <p className="mt-2 text-sm text-terminal-muted max-w-xl leading-relaxed">
                        Choose how you want to pay. Access unlocks automatically once payment is confirmed.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* Left: order summary (sticky on desktop) */}
                    <aside className="lg:col-span-4 order-2 lg:order-1">
                        <div className="lg:sticky lg:top-24 space-y-4">
                            <div className="rounded-xl border border-terminal-border bg-terminal-surface overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
                                <div className="px-5 py-4 border-b border-terminal-border/70">
                                    <h2 className="text-[11px] font-mono uppercase tracking-wider text-terminal-muted">Order summary</h2>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-terminal-text leading-snug">{productTitle}</p>
                                        <p className="mt-1 text-[11px] font-mono text-terminal-muted">Order · {orderId.slice(0, 8)}…</p>
                                    </div>

                                    <div className="space-y-2.5 pt-1 border-t border-terminal-border/60">
                                        <div className="flex justify-between text-xs font-mono text-terminal-muted">
                                            <span>Subtotal</span>
                                            <span className="text-terminal-text">
                                                {discount > 0 ? subtotal : total} {order.currency}
                                            </span>
                                        </div>
                                        {discount > 0 && (
                                            <div className="flex justify-between text-xs font-mono text-terminal-emerald">
                                                <span>{order.promotion_code ? `Promo · ${order.promotion_code}` : "Opening offer"}</span>
                                                <span>−{discount.toFixed(2)} {order.currency}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-baseline pt-2 border-t border-terminal-border/60">
                                            <span className="text-xs font-mono font-semibold text-terminal-text">Total due</span>
                                            <span className="text-lg font-mono font-bold text-terminal-gold tabular-nums">
                                                {method === "crypto"
                                                    ? payment
                                                        ? `${payment.amountDue} ${coin}`
                                                        : info?.approxAmount || `${total} ${order.currency}`
                                                    : `${total} ${order.currency}`}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-terminal-muted leading-relaxed pt-1">
                                        {method === "crypto"
                                            ? "USDC and USDT are dollar-pegged. 1 coin ≈ 1 USD."
                                            : "Exact amount in local currency is shown with the payment instructions."}
                                    </p>
                                </div>
                            </div>

                            {/* Trust strip */}
                            <div className="rounded-xl border border-terminal-border/70 bg-terminal-surface/50 px-4 py-3.5 flex items-start gap-3">
                                <ShieldIcon className="w-4 h-4 text-terminal-gold shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-medium text-terminal-text">Protected payment</p>
                                    <p className="text-[11px] text-terminal-muted leading-relaxed mt-0.5">
                                        Your funds go directly to Savanna Capitals. Access is granted only after confirmation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right: payment methods + panel */}
                    <section className="lg:col-span-8 order-1 lg:order-2 space-y-6">
                        {/* Method selector — card style */}
                        <div>
                            <h2 className="text-[11px] font-mono uppercase tracking-wider text-terminal-muted mb-3">
                                Payment method
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {(["pochi", "bank", "crypto"] as const).map((id) => {
                                    const meta = METHOD_META[id];
                                    const active = method === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setMethod(id)}
                                            className={`relative text-left rounded-xl border px-4 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-gold focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg ${active
                                                    ? "border-terminal-gold bg-terminal-gold/5 shadow-[0_0_0_1px_rgba(212,175,55,0.25)]"
                                                    : "border-terminal-border bg-terminal-surface hover:border-terminal-border hover:bg-terminal-surface/80"
                                                }`}
                                        >
                                            {meta.recommended && (
                                                <span className="absolute -top-2 right-3 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide bg-terminal-gold text-terminal-bg">
                                                    RECOMMENDED
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-terminal-gold" : "border-terminal-muted/50"
                                                        }`}
                                                >
                                                    {active && <span className="w-1.5 h-1.5 rounded-full bg-terminal-gold" />}
                                                </span>
                                                <span className={`text-xs font-semibold ${active ? "text-terminal-gold" : "text-terminal-text"}`}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-terminal-muted leading-snug pl-[22px]">{meta.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment panel */}
                        <div className="rounded-xl border border-terminal-border bg-terminal-surface overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
                            <div className="px-5 py-4 border-b border-terminal-border/70 flex items-center justify-between gap-3">
                                <h2 className="text-[11px] font-mono uppercase tracking-wider text-terminal-muted">
                                    {METHOD_META[method].label}
                                </h2>
                                {method === "crypto" && payment?.status === "pending" && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-terminal-muted">
                                        <Spinner className="w-3 h-3" />
                                        Listening for payment…
                                    </span>
                                )}
                            </div>

                            <div className="p-5 sm:p-6">
                                {method !== "crypto" && (
                                    <ManualPayPanel key={method} orderId={order.id} method={method} onPaid={(to) => setPaid(to)} />
                                )}

                                {method === "crypto" && (
                                    <>
                                        {info && !info.available && (
                                            <div className="rounded-lg border border-terminal-gold/30 bg-terminal-gold/5 px-4 py-3.5 text-xs font-mono text-terminal-gold">
                                                Crypto payments are not available yet. Please check back soon or use another method.
                                            </div>
                                        )}

                                        {info?.available && !payment && (
                                            <div className="space-y-5">
                                                <p className="text-sm text-terminal-muted leading-relaxed">
                                                    We will generate an exact amount unique to this order. Send that amount precisely — the
                                                    trailing decimals identify your payment. Your {unlockWord} unlocks automatically once confirmed
                                                    on-chain.
                                                </p>
                                                {errorMessage && (
                                                    <p className="text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                                                        {errorMessage}
                                                    </p>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={startPayment}
                                                    disabled={starting}
                                                    className="w-full py-3 rounded-md bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-gold focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-surface"
                                                >
                                                    {starting ? (
                                                        <>
                                                            <Spinner className="w-3.5 h-3.5" />
                                                            Preparing…
                                                        </>
                                                    ) : (
                                                        "Show payment details"
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {payment && (
                                            <div className="space-y-6">
                                                {/* Coin + network */}
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(["USDT", "USDC"] as const).map((c) => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setCoin(c)}
                                                                className={`px-3.5 py-1.5 rounded-md border text-xs font-mono font-bold transition-colors ${coin === c
                                                                        ? "border-terminal-gold text-terminal-gold bg-terminal-gold/5"
                                                                        : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                                                                    }`}
                                                            >
                                                                {c}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {networks.map((n) => (
                                                            <button
                                                                key={n.id}
                                                                type="button"
                                                                onClick={() => setNetworkId(n.id)}
                                                                className={`px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${n.id === networkId
                                                                        ? "border-terminal-gold text-terminal-gold bg-terminal-gold/5"
                                                                        : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                                                                    }`}
                                                            >
                                                                {n.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {network && token && (
                                                    <div className="space-y-5">
                                                        <div className="flex flex-col sm:flex-row gap-6">
                                                            <div className="shrink-0 mx-auto sm:mx-0">
                                                                {qr ? (
                                                                    <div className="rounded-xl bg-white p-2.5 shadow-sm">
                                                                        <img src={qr} alt="Payment QR code" className="w-52 h-52 rounded-md" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-52 h-52 rounded-xl bg-terminal-bg border border-terminal-border flex items-center justify-center">
                                                                        <Spinner className="w-5 h-5 text-terminal-muted" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-4 min-w-0 flex-1">
                                                                <div>
                                                                    <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5">
                                                                        Send exactly
                                                                    </span>
                                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                                        <span className="text-2xl sm:text-3xl font-mono font-bold text-terminal-gold tabular-nums tracking-tight">
                                                                            {payment.amountDue}{" "}
                                                                            <span className="text-base font-semibold text-terminal-gold/80">{coin}</span>
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copy(payment.amountDue, "amount")}
                                                                            className="px-2.5 py-1 rounded-md border border-terminal-border text-[10px] font-mono font-semibold hover:bg-terminal-bg transition-colors"
                                                                        >
                                                                            {copied === "amount" ? "Copied" : "Copy"}
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[11px] text-terminal-gold/90 mt-1.5 leading-snug">
                                                                        Do not round. All decimals identify this order.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5">
                                                                        Address · {network.name}
                                                                    </span>
                                                                    <p className="font-mono text-[11px] sm:text-xs break-all bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2.5 leading-relaxed">
                                                                        {network.address}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2 mt-2.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copy(network.address, "address")}
                                                                            className="px-2.5 py-1 rounded-md border border-terminal-border text-[10px] font-mono font-semibold hover:bg-terminal-bg transition-colors"
                                                                        >
                                                                            {copied === "address" ? "Copied" : "Copy address"}
                                                                        </button>
                                                                        <a
                                                                            href={network.addressUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="px-2.5 py-1 rounded-md border border-terminal-border text-[10px] font-mono font-semibold hover:bg-terminal-bg transition-colors"
                                                                        >
                                                                            View on explorer ↗
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {network.warning && (
                                                            <p className="text-[11px] text-terminal-gold bg-terminal-gold/5 border border-terminal-gold/20 rounded-lg px-3 py-2 leading-relaxed">
                                                                {network.warning}
                                                            </p>
                                                        )}

                                                        <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-2 list-none">
                                                            <li className="flex gap-2">
                                                                <span className="text-terminal-gold/70 shrink-0">•</span>
                                                                <span>
                                                                    Send <strong className="text-terminal-text">{coin}</strong> on{" "}
                                                                    <strong className="text-terminal-text">{network.name}</strong> only. Other assets or
                                                                    networks will not be recognised.
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2">
                                                                <span className="text-terminal-gold/70 shrink-0">•</span>
                                                                <span>
                                                                    From an exchange? Add any withdrawal fee so that exactly{" "}
                                                                    <strong className="text-terminal-text">{payment.amountDue}</strong> arrives.
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2">
                                                                <span className="text-terminal-gold/70 shrink-0">•</span>
                                                                <span>Wrong amount? Contact support with the transaction ID and we will resolve it.</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="rounded-lg bg-terminal-bg border border-terminal-border px-4 py-3 flex items-start gap-3">
                                                    <Spinner className="w-3.5 h-3.5 text-terminal-muted shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-mono text-terminal-muted leading-relaxed">
                                                        Waiting for your payment. This page updates automatically. You can leave and return — your{" "}
                                                        {unlockWord} unlocks as soon as the network confirms the transfer.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {errorMessage && payment && (
                                            <p className="mt-4 text-xs font-mono text-red-400">{errorMessage}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {showDevSimulate && (
                            <button
                                type="button"
                                onClick={simulate}
                                disabled={starting}
                                className="w-full py-2.5 rounded-md border border-dashed border-terminal-border text-[10px] font-mono text-terminal-muted hover:text-terminal-text hover:border-terminal-muted/60 disabled:opacity-50 transition-colors"
                            >
                                DEV ONLY · Simulate payment
                            </button>
                        )}
                    </section>
                </div>
            </main>

            <footer className="border-t border-terminal-border/60 mt-auto">
                <div className="max-w-5xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-terminal-muted">
                    <span>© Savanna Capitals · Secure institutional payments</span>
                    <Link href="/academy" className="hover:text-terminal-text transition-colors">
                        ← Back to Academy
                    </Link>
                </div>
            </footer>
        </div>
    );
}
