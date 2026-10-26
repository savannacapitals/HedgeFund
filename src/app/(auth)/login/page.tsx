"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Authentication flow will connect to Supabase client here
        setTimeout(() => setLoading(false), 1000);
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md p-8 rounded-lg bg-terminal-surface border border-terminal-border">
                <div className="text-center mb-8">
                    <span className="font-mono text-xs text-terminal-gold">TERMINAL ACCESS</span>
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Sign In to Savanna</h1>
                    <p className="text-xs text-terminal-muted mt-2">Access your research subscriptions and academy portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-mono text-terminal-muted mb-2">EMAIL ADDRESS</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="analyst@institution.com"
                            className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text placeholder-terminal-muted/50 text-sm focus:outline-none focus:border-terminal-gold font-mono"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-mono text-terminal-muted">PASSWORD</label>
                            <Link href="/reset-password" className="text-xs font-mono text-terminal-gold hover:underline">
                                Forgot?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
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
                    <Link href="/register" className="text-terminal-gold hover:underline">
                        Register Account
                    </Link>
                </div>
            </div>
        </div>
    );
}