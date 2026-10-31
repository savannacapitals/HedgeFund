"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordUpdatePage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The link in the email signs the user in for a moment so they can set a new password.
    // The Supabase client picks that up from the link automatically.
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setStatus("ready");
        });

        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setStatus("ready");
        });

        const timer = setTimeout(() => setStatus((s) => (s === "checking" ? "invalid" : s)), 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Use at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setError("The two passwords do not match.");
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        router.push("/dashboard");
        router.refresh();
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md p-8 rounded-lg bg-terminal-surface border border-terminal-border">
                <div className="text-center mb-8">
                    <span className="font-mono text-xs text-terminal-gold">ACCOUNT RECOVERY</span>
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Choose a new password</h1>
                </div>

                {status === "checking" && (
                    <p className="text-center text-xs font-mono text-terminal-muted">CHECKING YOUR LINK...</p>
                )}

                {status === "invalid" && (
                    <div className="space-y-4 text-center">
                        <p className="text-xs font-mono text-red-400">
                            This reset link is invalid or has expired.
                        </p>
                        <Link href="/reset-password" className="text-xs font-mono text-terminal-gold hover:underline">
                            Request a new link &rarr;
                        </Link>
                    </div>
                )}

                {status === "ready" && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-mono text-terminal-muted mb-2">NEW PASSWORD</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text text-sm focus:outline-none focus:border-terminal-gold font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-terminal-muted mb-2">CONFIRM PASSWORD</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text text-sm focus:outline-none focus:border-terminal-gold font-mono"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-sm hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "SAVING..." : "SAVE NEW PASSWORD"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
