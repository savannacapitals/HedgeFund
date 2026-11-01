"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordRequestPage() {
    const supabase = useMemo(() => createClient(), []);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password/update`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
            return;
        }

        // Same message whether or not the email has an account, so nobody can probe for accounts
        setSent(true);
        setLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md p-8 rounded-lg bg-terminal-surface border border-terminal-border">
                <div className="text-center mb-8">
                    <span className="font-mono text-xs text-terminal-gold">ACCOUNT RECOVERY</span>
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Reset your password</h1>
                    <p className="text-xs text-terminal-muted mt-2">We will email you a link to choose a new one.</p>
                </div>

                {sent ? (
                    <div className="p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">
                        If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                                {error}
                            </div>
                        )}
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
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-sm hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "SENDING..." : "SEND RESET LINK"}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-xs text-terminal-muted font-mono">
                    <Link href="/login" className="inline-block py-2 -my-2 text-terminal-gold hover:underline">
                        &larr; Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
