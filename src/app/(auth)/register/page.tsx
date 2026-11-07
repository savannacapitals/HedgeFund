"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import BrandMark from "@/components/BrandMark";
import GoogleButton from "@/components/GoogleButton";
import { rememberNextPath, safeNextPath } from "@/lib/auth/next-path";

export default function RegisterPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [next, setNext] = useState("/dashboard");
    const router = useRouter();
    const supabase = createClient();

    // Where to send them once the account exists (for example the membership checkout they were heading to)
    useEffect(() => {
        const n = safeNextPath(new URLSearchParams(window.location.search).get("next"));
        setNext(n);
        rememberNextPath(n); // survives Google sign-in and the confirmation email
    }, []);
    const wantsCheckout = next !== "/dashboard";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setNotice(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    // Confirmation link signs them in and carries on to where they were going (the sc-next cookie)
                    ...(wantsCheckout ? { emailRedirectTo: `${window.location.origin}/auth/callback` } : {}),
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            // With email confirmation switched on, there is no session until the link is clicked
            if (!data.session) {
                setNotice(wantsCheckout ? "Account created. Check your email and click the confirmation link. You will be signed in and taken straight to checkout." : "Account created. Check your email and click the confirmation link, then sign in.");
                setLoading(false);
                return;
            }

            router.push(next);
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
                    <BrandMark height={120} centered className="mb-4" />
                    <h1 className="text-2xl font-bold text-terminal-text mt-1">Create an account</h1>
                    <p className="text-xs text-terminal-muted mt-2">One account for Academy, research and AI Opportunities</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                        {error}
                    </div>
                )}

                {notice && (
                    <div className="mb-4 p-3 rounded bg-terminal-emerald/10 border border-terminal-emerald/30 text-terminal-emerald text-xs font-mono">
                        {notice}
                    </div>
                )}

                <GoogleButton onError={(m) => setError(m || null)} />

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
                            placeholder="you@email.com"
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
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-terminal-muted font-mono">
                    Already have an account?{" "}
                    <Link href={wantsCheckout ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="inline-block py-2 -my-2 text-terminal-gold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}