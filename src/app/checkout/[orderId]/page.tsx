"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

const POLL_EVERY_MS = 8000;

interface Token { symbol: "USDC" | "USDT"; id: string; uri: string }
interface Network { id: string; name: string; family: string; address: string; addressUrl: string; warning: string | null; tokens: Token[] }
interface PaymentView {
    id: string;
    status: string;
    amountDue: string;
    expiresAt: string;
    networks: Network[];
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

    useEffect(() => {
        async function load() {
            if (!orderId) return;
            setLoading(true);

            // Row-level security only returns orders that belong to the signed-in user
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

    // Networks that accept the chosen coin
    const networks = useMemo(
        () => (payment ? payment.networks.filter((n) => n.tokens.some((t) => t.symbol === coin)) : []),
        [payment, coin]
    );

    // Keep the selected network valid when the coin changes
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

    // Ask the server every few seconds whether the money has arrived
    const check = useCallback(async () => {
        if (!payment) return;
        try {
            const res = await fetch(`/api/payments/stablecoin/status?paymentId=${encodeURIComponent(payment.id)}`);
            const json = await res.json();
            if (!res.ok) return;
            setPayment((p) => (p ? { ...p, status: json.status } : p));
            if (json.status === "succeeded") setPaid(json.redirectTo || "/dashboard");
        } catch {
            // network blip: try again next time
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

    const shell = (title: string, text: string, action?: React.ReactNode) => (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
            <BrandMark height={56} centered className="mb-6" />
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <p className="text-terminal-muted text-xs mb-6 font-mono">{text}</p>
            {action}
        </div>
    );
    const goldLink = "px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold";

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING SECURE CHECKOUT...
            </div>
        );
    }
    if (!order) return shell("Order Not Found", "The requested transaction reference is invalid or has expired.", <Link href="/academy" className={goldLink}>Return to Academy Catalogue</Link>);
    if (order.status === "confirmed" || paid) {
        return order.kind === "community"
            ? shell("Payment Received", "Your payment is confirmed and your Killzone Journal access is active.", <Link href={paid || "/community/killzone"} className={goldLink}>Join The Killzone Journal</Link>)
            : shell("Payment Received", "Your payment is confirmed and your course access is active.", <Link href={paid || `/learn/${order.courses?.slug}/lessons`} className={goldLink}>Go to Course</Link>);
    }
    if (order.status !== "pending") return shell("Order Unavailable", "This order can no longer be paid. Please start a new enrolment.", <Link href="/academy" className={goldLink}>Return to Academy Catalogue</Link>);
    if (payment && payment.status === "expired") {
        return shell("Payment window closed", "This payment expired before it was received. Please start a new enrolment. If you already sent money, contact support with your transaction ID.", <Link href="/academy" className={goldLink}>Return to Academy Catalogue</Link>);
    }

    const total = Number(order.total_amount).toFixed(2);
    const showDevSimulate = process.env.NODE_ENV !== "production";

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-12 max-w-4xl mx-auto">
            <div className="mb-8 border-b border-terminal-border pb-6">
                <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">SECURE INSTITUTIONAL CHECKOUT</span>
                <h1 className="text-3xl font-bold mt-2">Pay with USDC or USDT</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                        <h2 className="font-bold text-sm">Order Summary</h2>
                        <div className="flex justify-between items-center text-xs font-mono text-terminal-muted border-b border-terminal-border/40 pb-3">
                            <span>{order.kind === "community" ? "The Killzone Journal · Community Access" : order.courses?.title || "Academy Course Access"}</span>
                            <span className="text-terminal-text font-bold">{total} {order.currency}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-mono font-bold text-terminal-gold">
                            <span>Total Payable</span>
                            <span>{payment ? payment.amountDue : info?.approxAmount || total}</span>
                        </div>
                        <p className="text-[11px] text-terminal-muted leading-relaxed">
                            USDC and USDT are dollar-pegged digital currencies: 1 coin is worth 1 US dollar.
                        </p>
                    </div>
                </div>

                <div className="md:col-span-3">
                    {info && !info.available && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border text-xs font-mono text-terminal-gold">
                            Crypto payments are not available yet. Please check back soon.
                        </div>
                    )}

                    {info?.available && !payment && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                            <p className="text-xs text-terminal-muted leading-relaxed">
                                We will give you an exact amount to send. The last few digits are unique to your order, so please send
                                it exactly as shown. Your {order.kind === "community" ? "Killzone Journal access" : "course"} unlocks automatically once the payment is confirmed.
                            </p>
                            {errorMessage && <p className="text-xs font-mono text-red-400">{errorMessage}</p>}
                            <button
                                onClick={startPayment}
                                disabled={starting}
                                className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 disabled:opacity-50"
                            >
                                {starting ? "PLEASE WAIT..." : "SHOW PAYMENT DETAILS"}
                            </button>
                        </div>
                    )}

                    {payment && (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-5">
                            <div className="flex gap-2">
                                {(["USDT", "USDC"] as const).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCoin(c)}
                                        className={`px-4 py-1.5 rounded border text-xs font-mono font-bold ${coin === c ? "border-terminal-gold text-terminal-gold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {networks.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => setNetworkId(n.id)}
                                        className={`px-3 py-1.5 rounded border text-xs font-mono ${n.id === networkId ? "border-terminal-gold text-terminal-gold" : "border-terminal-border text-terminal-muted hover:text-terminal-text"}`}
                                    >
                                        {n.name}
                                    </button>
                                ))}
                            </div>

                            {network && token && (
                                <>
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
                                                <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">Send exactly</span>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-2xl font-mono font-bold text-terminal-gold">{payment.amountDue} {coin}</span>
                                                    <button onClick={() => copy(payment.amountDue, "amount")} className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg">
                                                        {copied === "amount" ? "COPIED" : "COPY"}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-terminal-gold mt-1">Do not round the amount. All six decimals identify your order.</p>
                                            </div>

                                            <div>
                                                <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">To this address on {network.name}</span>
                                                <p className="font-mono text-xs break-all bg-terminal-bg border border-terminal-border rounded p-2">{network.address}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <button onClick={() => copy(network.address, "address")} className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg">
                                                        {copied === "address" ? "COPIED" : "COPY ADDRESS"}
                                                    </button>
                                                    <a href={network.addressUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded border border-terminal-border text-[10px] font-mono hover:bg-terminal-bg">
                                                        VIEW ON EXPLORER ↗
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {network.warning && <p className="text-[11px] text-terminal-gold">{network.warning}</p>}

                                    <ul className="text-[11px] text-terminal-muted leading-relaxed space-y-1.5 list-disc pl-4">
                                        <li>Send <strong>{coin}</strong> on the <strong>{network.name}</strong> network only. Other coins, other networks and bridged versions (such as USDC.e) will not be recognised.</li>
                                        <li>Sending from an exchange? Exchanges often take a withdrawal fee out of the amount. Add it on top so that exactly <strong>{payment.amountDue}</strong> arrives.</li>
                                        <li>If you sent a different amount, contact support with your transaction ID and we will sort it out.</li>
                                    </ul>
                                </>
                            )}

                            <div className="p-3 rounded bg-terminal-bg border border-terminal-border text-xs font-mono text-terminal-muted">
                                Waiting for your payment… this page updates by itself. You can leave and come back: your {order.kind === "community" ? "Killzone Journal access" : "course"} unlocks as soon as the payment is confirmed on the network.
                            </div>
                        </div>
                    )}

                    {errorMessage && payment && <p className="mt-3 text-xs font-mono text-red-400">{errorMessage}</p>}

                    {showDevSimulate && (
                        <button onClick={simulate} disabled={starting} className="mt-4 w-full py-2 rounded border border-dashed border-terminal-border text-[10px] font-mono text-terminal-muted hover:text-terminal-text disabled:opacity-50">
                            DEV ONLY: SIMULATE PAYMENT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
