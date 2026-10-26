"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        async function fetchOrder() {
            if (!orderId) return;
            setLoading(true);

            // Fetch order and associated details
            const { data, error } = await supabase
                .from("orders")
                .select("*, courses(*)")
                .eq("id", orderId)
                .single();

            if (error || !data) {
                console.error("Order not found:", error);
            } else {
                setOrder(data);
            }
            setLoading(false);
        }

        fetchOrder();
    }, [orderId, supabase]);

    const handleSimulatedPayment = async () => {
        setProcessing(true);
        try {
            // Simulate successful payment confirmation and enrolment grant
            const { error: updateError } = await supabase
                .from("orders")
                .update({ status: "paid" })
                .eq("id", order.id);

            if (updateError) throw updateError;

            // Grant course enrolment
            await supabase.from("course_enrolments").insert({
                user_id: order.user_id,
                course_id: order.course_id,
                order_id: order.id,
                status: "active"
            });

            router.push(`/academy/courses/${order.courses?.slug}/lessons`);
        } catch (err: any) {
            alert("Payment error: " + err.message);
        } finally {
            setProcessing(false);
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

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-12 max-w-3xl mx-auto">
            <div className="mb-8 border-b border-terminal-border pb-6">
                <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">SECURE INSTITUTIONAL CHECKOUT</span>
                <h1 className="text-3xl font-bold mt-2">Complete Your Enrolment</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                        <h2 className="font-bold text-sm">Order Summary</h2>
                        <div className="flex justify-between items-center text-xs font-mono text-terminal-muted border-b border-terminal-border/40 pb-3">
                            <span>{order.courses?.title || "Academy Course Access"}</span>
                            <span className="text-terminal-text font-bold">${order.amount_usd || 40}.00</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono text-terminal-muted">
                            <span>Tax / Processing Fee</span>
                            <span>$0.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-mono font-bold text-terminal-gold pt-3 border-t border-terminal-border">
                            <span>Total Payable</span>
                            <span>${order.amount_usd || 40}.00 USD</span>
                        </div>
                    </div>

                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
                        <h2 className="font-bold text-sm">Select Payment Method</h2>
                        <div className="space-y-3 font-mono text-xs">
                            <label className="flex items-center space-x-3 p-3 rounded bg-terminal-bg border border-terminal-border cursor-pointer">
                                <input type="radio" name="payment" defaultChecked className="text-terminal-gold" />
                                <span>Secure Card Payment (Stripe / Gateway)</span>
                            </label>
                            <label className="flex items-center space-x-3 p-3 rounded bg-terminal-bg border border-terminal-border cursor-pointer">
                                <input type="radio" name="payment" className="text-terminal-gold" />
                                <span>M-Pesa Mobile Money (East Africa)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-6 sticky top-6">
                        <h3 className="font-bold text-sm">Authorization</h3>
                        <p className="text-xs text-terminal-muted leading-relaxed">
                            Upon payment verification, your institutional access and lifetime course updates will be instantly provisioned.
                        </p>
                        <button
                            onClick={handleSimulatedPayment}
                            disabled={processing}
                            className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                        >
                            {processing ? "PROCESSING..." : `PAY SECURELY ($${order.amount_usd || 40})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}