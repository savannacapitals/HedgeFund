"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setNotice(null);
        setNeedsConfirmation(false);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                const msg = signInError.message.toLowerCase();
                if (msg.includes("email not confirmed")) {
                    setNeedsConfirmation(true);
                    setError("Please confirm your email address first. Check your inbox for the confirmation link.");
                } else if (msg.includes("invalid login credentials")) {
                    setError("Incorrect email or password.");
                } else {
                    setError(signInError.message);
                }
                setLoading(false);
                return;
            }

            // Signed in. Staff (editors and administrators) land on the admin dashboard,
            // everyone else on the member dashboard. If the lookup fails, fall back to the member one.
            let destination = "/dashboard";
            try {
                const res = await fetch("/api/auth/landing", { cache: "no-store" });
                if (res.ok) {
                    const json = await res.json();
                    if (typeof json.destination === "string" && json.destination.startsWith("/")) {
                        destination = json.destination;
                    }
                }
            } catch {
                // keep the default
            }

            // Refresh so server pages see the new session
            router.push(destination);
            router.refresh();
        } catch (err: any) {
            console.error("Sign-in failed:", err);
            setError("Could not reach the sign-in service. Check your connection and try again.");
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim() });
        if (resendError) setError(resendError.message);
        else setNotice("Confirmation email sent. Check your inbox (and spam folder).");
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md p-8 rounded-lg bg-terminal-surface border border-terminal-border">
                <div className="text-center mb-8">
                    <span className="font-mono text-xs text-terminal-gold">TERMINAL ACCESS</span>
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Sign In to Savanna</h1>
                    <p className="text-xs text-terminal-muted mt-2">Access your research subscriptions and academy portal</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                        {error}
                        {needsConfirmation && (
                            <button type="button" onClick={handleResend} className="block mt-2 text-terminal-gold hover:underline">
                                Resend confirmation email
                            </button>
                        )}
                    </div>
                )}
                {notice && (
                    <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">
                        {notice}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-mono text-terminal-muted mb-2">EMAIL ADDRESS</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="analyst@institution.com"
                            className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text placeholder-terminal-muted/50 text-sm focus:outline-none focus:border-terminal-gold font-mono"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-mono text-terminal-muted">PASSWORD</label>
                            <Link href="/reset-password" className="inline-block py-2 -my-2 text-xs font-mono text-terminal-gold hover:underline">
                                Forgot?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text placeholder-terminal-muted/50 text-sm focus:outline-none focus:border-terminal-gold font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-sm hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? "AUTHENTICATING..." : "SIGN IN"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-terminal-muted font-mono">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="inline-block py-2 -my-2 text-terminal-gold hover:underline">
                        Register Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
