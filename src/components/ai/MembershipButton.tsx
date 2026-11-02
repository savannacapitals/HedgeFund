"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Starts the KES membership checkout. Signed-out visitors are sent to sign in first. */
export default function MembershipButton({ label, className = "aio-btn primary" }: { label: string; className?: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function start() {
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/ai/membership", { method: "POST" });
            if (res.status === 401) return router.push("/login");
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Could not start checkout.");
            router.push(json.redirectTo);
        } catch (e: any) {
            setError(e.message);
            setBusy(false);
        }
    }

    return (
        <div>
            <button type="button" className={className} onClick={start} disabled={busy}>
                {busy ? "Opening checkout…" : label}
            </button>
            {error && <p role="alert" style={{ color: "#e07a7a", fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>
    );
}
