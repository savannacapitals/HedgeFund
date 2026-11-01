"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AccessState {
    hasAccess: boolean;
    reason: "paid_course" | "unlock_fee" | "manual" | null;
    price: number;
}

/**
 * The Killzone Journal (Telegram) card.
 *  - Paid-course students (or anyone who paid the unlock fee): active link.
 *  - Everyone else: still clickable, but it starts the one-time unlock checkout.
 * The Telegram URL itself never reaches the browser; the button opens /api/community/killzone/join.
 */
export default function KillzoneCard() {
    const router = useRouter();
    const [state, setState] = useState<AccessState | null>(null);
    const [signedOut, setSignedOut] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/community/killzone", { cache: "no-store" })
            .then(async (res) => {
                if (res.status === 401) return !cancelled && setSignedOut(true);
                if (!res.ok) throw new Error();
                const json = await res.json();
                if (!cancelled) setState(json);
            })
            .catch(() => !cancelled && setError("Could not check your community access."));
        return () => {
            cancelled = true;
        };
    }, []);

    async function unlock() {
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/community/killzone/unlock", { method: "POST" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Could not start the unlock.");
            router.push(json.redirectTo);
        } catch (err: any) {
            setError(err.message);
            setBusy(false);
        }
    }

    const shell = "p-4 rounded-lg border border-terminal-gold/30 bg-terminal-gold/10 flex flex-wrap items-center justify-between gap-4";
    const button = "px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-50";

    if (signedOut) {
        return (
            <div className={shell}>
                <span className="text-xs font-mono text-terminal-gold">Sign in to join The Killzone Journal.</span>
                <Link href="/login" className={button}>SIGN IN</Link>
            </div>
        );
    }

    if (!state) {
        return (
            <div className={shell}>
                <span className="text-xs font-mono text-terminal-muted">{error || "CHECKING COMMUNITY ACCESS..."}</span>
            </div>
        );
    }

    return (
        <div className={shell}>
            <div className="min-w-0">
                <span className="font-mono text-[11px] tracking-widest uppercase text-terminal-gold">Premium community</span>
                <h3 className="text-base font-bold mt-0.5">The Killzone Journal</h3>
                <p className="text-xs text-terminal-muted mt-1">
                    {state.hasAccess
                        ? "Your seat is active. Join the traders analysing the markets together on Telegram."
                        : `Included free with any paid course. Unlock it with a one-time $${state.price} payment.`}
                </p>
                {error && <p className="text-xs font-mono text-red-400 mt-2">{error}</p>}
            </div>

            {state.hasAccess ? (
                <a href="/api/community/killzone/join" target="_blank" rel="noopener noreferrer" className={button}>
                    JOIN ON TELEGRAM →
                </a>
            ) : (
                <button onClick={unlock} disabled={busy} className={button}>
                    {busy ? "OPENING CHECKOUT..." : `JOIN · UNLOCK FOR $${state.price}`}
                </button>
            )}
        </div>
    );
}
