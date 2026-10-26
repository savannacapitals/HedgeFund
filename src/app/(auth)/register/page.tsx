"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function RegisterPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            // Successfully registered and logged in — redirect to dashboard
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md p-8 rounded-lg bg-terminal-surface border border-terminal-border">
                <div className="text-center mb-8">
                    <span className="font-mono text-xs text-terminal-gold">NEW REGISTRATION</span>
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Create Account</h1>
                    <p className="text-xs text-terminal-muted mt-2">Join Savanna Capitals for intelligence and education</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono text-terminal-muted mb-2">FULL NAME</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Brian Angwenyi"
                            className="w-full px-4 py-2.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text placeholder-terminal-muted/50 text-sm focus:outline-none focus:border-terminal-gold font-mono"
                        />
                    </div>

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
                        <label className="block text-xs font-mono text-terminal-muted mb-2">PASSWORD</label>
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
                        className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-sm hover:bg-terminal-gold/90 transition-colors disabled:opacity-50 mt-2"
                    >
                        {loading ? "INITIALIZING ACCOUNT..." : "CREATE ACCOUNT"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-terminal-muted font-mono">
                    Already have an account?{" "}
                    <Link href="/login" className="text-terminal-gold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}