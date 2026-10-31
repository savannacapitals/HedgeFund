"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyIndexPage() {
    const router = useRouter();
    const [code, setCode] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = code.trim().toUpperCase();
        if (cleaned) router.push(`/verify/${encodeURIComponent(cleaned)}`);
    };

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-16 max-w-xl mx-auto">
            <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">
                CERTIFICATE VERIFICATION
            </span>
            <h1 className="text-3xl font-bold mt-2 mb-2">Verify a certificate</h1>
            <p className="text-xs text-terminal-muted mb-6">
                Enter the verification code printed on a Savanna Academy certificate.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SC-XXXXX-XXXXX"
                    className="flex-1 px-3 py-2 rounded bg-terminal-surface border border-terminal-border font-mono text-sm focus:outline-none focus:border-terminal-gold"
                />
                <button
                    type="submit"
                    className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold"
                >
                    VERIFY
                </button>
            </form>
        </div>
    );
}
