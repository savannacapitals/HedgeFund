"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const POLL_EVERY_MS = 8000;

interface PaymentView {
    id: string;
    status: string;
    address: string;
    amountDue: string;
    amountDueUnits: number;
    received: string;
    receivedUnits: number;
    testMode: boolean;
    networks: { id: string; name: string; chainId: number; token: string; tokenUrl: string; addressUrl: string; uri: string }[];
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    const supabase = useMemo(() => createClient(), []);

    const [order, setOrder] = useState<any>(null);
    const [info, setInfo] = useState<{ available: boolean; testMode?: boolean; amountDue?: string } | null>(null);
    const [payment, setPayment] = useState<PaymentView | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [networkIndex, setNetworkIndex] = useState(0);
    const [qr, setQr] = useState("");
    const [copied, setCopied] = useState<"address" | "amount" | "">("");
    const [paid, setPaid] = useState<string | null>(null); // where to go once confirmed
    const [checkTrouble, setCheckTrouble] = useState(false);

    // Load the order, and any payment address it already has
    useEffect(() => {
        async function load() {
            if (!orderId) return;
            setLoading(true);

            // Row-level security only returns orders that belong to the signed-in user
            const { data } = await supabase.from("orders").select("*, courses(*)").eq("id", orderId).maybeSingle();
            setOrder(data ?? null);

            if (data && data.status === "pending") {
                const res = await fetch(`/api/payments/usdc/payment?orderId=${encodeURIComponent(orderId)}`);
                const json = res.ok ? await res.json() : { available: false };
                setInfo(json);
                if (json.payment) setPayment(json.payment);
            }
            setLoading(false);
        }
        load();
    }, [orderId, supabase]);

    // QR code for the selected network (wallets that understand it fill in the amount and address)
    const network = payment?.networks[networkIndex];
    useEffect(() => {
        let cancelled = false;
        async function draw() {
            if (!network) return setQr("");
            const QRCode = (await import("qrcode")).default;
            const url = await QRCode.toDataURL(network.uri, { margin: 1, width: 224 });
            if (!cancelled) setQr(url);
        }
        draw();
        return () => {
            cancelled = true;
        };
    }, [network]);

    // Ask the server every few seconds whether the money has arrived
    const check = useCallback(async () => {
        if (!payment) return;
        try {
            const res = await fetch(`/api/payments/usdc/status?paymentId=${encodeURIComponent(payment.id)}`);
            const json = await res.json();
            if (!res.ok) return;
            setCheckTrouble(!!json.checkFailed);
            setPayment((p) => (p ? { ...p, status: json.status, received: json.received, receivedUnits: json.receivedUnits } : p));
            if (json.status === "succeeded") setPaid(json.redirectTo || "/dashboard");
        } catch {
            setCheckTrouble(true);
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
            const res = await fetch("/api/payments/usdc/payment", {
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

    // Development only: skips the real payment so the rest of the flow can be tried
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
            setTimeout(() => setCopied(""), 1500);
        } catch {
            // clipboard blocked: the text is on screen to copy by hand
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING SECURE CHECKOUT...
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">The requested transaction reference is invalid or has expired.</p>
                <Link href="/academy" className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold">
                    Return to Academy Catalogue
                </Link>
            </div>
        );
    }

    if (order.status === "confirmed" || paid) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Payment Received</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">Your USDC payment is confirmed and your course access is active.</p>
                <Link
                    href={paid || `/learn/${order.courses?.slug}/lessons`}
                    className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold"
                >
                    Go to Course
                </Link>
            </div>
        );
    }

    if (order.status !== "pending") {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Order Unavailable</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">This order can no longer be paid. Please start a new enrolment.</p>
                <Link href="/academy" className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold">
                    Return to Academy Catalogue
                </Link>
            </div>
        );
    }

    const total = Number(order.total_amount).toFixed(2);
    const showDevSimulate = process.env.NODE_ENV !== "production";
    const stillOwed =
        payment && payment.receivedUnits > 0 && payment.receivedUnits < payment.amountDueUnits
            ? ((payment.amountDueUnits - payment.receivedUnits) / 1_000_000).toFixed(2)
            : null;

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-12 max-w-4xl mx-auto">
            <div className="mb-8 border-b border-terminal-border pb-6">
                <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">SECURE INSTITUTIONAL CHECKOUT</span>
                <h1 className="text-3xl font-bold mt-2">Pay with USDC</h1>
            </div>

            {(payment?.testMode || info?.testMode) && (
                <div className="mb-6 p-3 rounded border border-terminal-gold/50 bg-terminal-gold/10 text-xs font-mono text-terminal-gold">
                    TEST MODE: this uses a test network and test USDC. No real money is involved.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {/* Order summary */}
                <div className="md:col-span-2 space-y-6">
                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                        <h2 className="font-bold text-sm">Order Summary</h2>
                        <div className="flex justify-between items-center text-xs font-mono text-terminal-muted border-b border-terminal-border/40 pb-3">
                            <span>{order.courses?.title || "Academy Course Access"}</span>
                            <span className="text-terminal-text font-bold">
                                {total} {order.currency}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-mono font-bold text-terminal-gold pt-1">
                            <span>Total Payable</span>
                            <span>{payment?.amountDue || info?.amountDue || total} USDC</span>
                        </div>
                        <p className="text-[11px] text-terminal-muted leading-relaxed">
                            USDC is a dollar-pegged digital currency: 1 USDC is worth 1 US dollar.
                        </p>
                    </div>
                </div>

                {/* Payment panel */}
                <div className="md:col-span-3">
                    {info && !info.available && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border text-xs font-mono text-terminal-gold">
                            USDC payments are not available yet. Please check back soon.
                        </div>
                    )}

                    {info?.available && !payment && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                            <p className="text-xs text-terminal-muted leading-relaxed">
                                We will give you a payment address that belongs to this order only. Send exactly the amount shown
                                from any wallet or exchange, and your course unlocks automatically once the payment is confirmed.
                            </p>
                            {errorMessage && <p className="text-xs font-mono text-red-400">{errorMessage}</p>}
                            <button
                                onClick={startPayment}
                                disabled={starting}
                                className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 disabled:opacity-50"
                            >
                                {starting ? "PLEASE WAIT..." : `SHOW PAYMENT ADDRESS (${info.amountDue} USDC)`}
                            </button>
                        </div>
                    )}

                    {payment && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-5">
                            {payment.networks.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {payment.networks.map((n, i) => (
                                        <button
                                            key={n.id}
                                            onClick={() => setNetworkIndex(i)}
                                            className={`px-3 py-1.5 rounded border text-xs font-mono ${
                                                i === networkIndex
                                                    ? "border-terminal-gold text-terminal-gold"
                                                    : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                                            }`}
                                        >
                                            {n.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-5">
                                <div className="shrink-0 mx-auto sm:mx-0">
                                    {qr ? (
                                        // White background so every phone camera can read it
                                        <img src={qr} alt="Payment QR code" className="w-56 h-56 rounded bg-white p-2" />
                                    ) : (
                                        <div className="w-56 h-56 rounded bg-terminal-bg" />
                                    )}
                                </div>

                                <div className="space-y-4 min-w-0 flex-1">
                                    <div>
                                        <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
                                            Send exactly
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-mono font-bold text-terminal-gold">{payment.amountDue} USDC</span>
                                            <button
                                                onClick={() => copy(payment.amountDue, "amount")}
                                                className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg"
                                            >
                                                {copied === "amount" ? "COPIED" : "COPY"}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
                                            To this address on {network?.name}
                                        </span>
                                        <p className="font-mono text-xs break-all bg-terminal-bg border border-terminal-border rounded p-2">
                                            {payment.address}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => copy(payment.address, "address")}
                                                className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg"
                                            >
                                                {copied === "address" ? "COPIED" : "COPY ADDRESS"}
                                            </button>
                                            {network && (
                                                <a
                                                    href={network.addressUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg"
                                                >
                                                    VIEW ON EXPLORER ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-1.5 list-disc pl-4">
                                <li>
                                    Send <strong>native USDC</strong> on <strong>{network?.name}</strong> only. Other tokens, other
                                    networks, and bridged versions such as USDC.e are not counted.
                                </li>
                                <li>
                                    Sending from an exchange? Exchanges often take a withdrawal fee out of the amount. Add it on top so
                                    at least {payment.amountDue} USDC arrives.
                                </li>
                                <li>This address is for this order only. Always check it matches before you confirm in your wallet.</li>
                            </ul>

                            <div className="p-3 rounded bg-terminal-bg border border-terminal-border text-xs font-mono">
                                {payment.status === "failed" ? (
                                    <span className="text-red-400">This payment was cancelled. Please contact support.</span>
                                ) : stillOwed ? (
                                    <span className="text-terminal-gold">
                                        Received {payment.received} of {payment.amountDue} USDC. Please send the remaining {stillOwed} USDC to the
                                        same address.
                                    </span>
                                ) : (
                                    <span className="text-terminal-muted">
                                        Waiting for your payment… this page updates by itself. You can leave and come back: your course unlocks as
                                        soon as the payment is confirmed.
                                    </span>
                                )}
                                {checkTrouble && (
                                    <span className="block mt-1 text-terminal-muted">
                                        Having trouble reaching the network. Do not worry, we will keep checking.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {errorMessage && payment && <p className="mt-3 text-xs font-mono text-red-400">{errorMessage}</p>}

                    {showDevSimulate && (
                        <button
                            onClick={simulate}
                            disabled={starting}
                            className="mt-4 w-full py-2 rounded border border-dashed border-terminal-border text-[10px] font-mono text-terminal-muted hover:text-terminal-text disabled:opacity-50"
                        >
                            DEV ONLY: SIMULATE PAYMENT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
