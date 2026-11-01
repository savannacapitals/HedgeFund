"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the server page every few seconds so its figures stay current.
 * Pauses while the tab is hidden and catches up the moment you come back.
 * It only asks the server to re-render: no data is fetched or stored in the browser.
 */
export default function LiveRefresh({ everyMs = 30000, generatedAt }: { everyMs?: number; generatedAt: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [paused, setPaused] = useState(false);
    const lastRun = useRef(Date.now());

    useEffect(() => {
        const refresh = () => {
            if (document.hidden) return;
            lastRun.current = Date.now();
            setBusy(true);
            router.refresh();
            setTimeout(() => setBusy(false), 800);
        };

        const timer = setInterval(() => {
            if (!paused) refresh();
        }, everyMs);

        const onVisible = () => {
            if (!document.hidden && !paused && Date.now() - lastRun.current > everyMs) refresh();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [router, everyMs, paused]);

    const time = new Date(generatedAt).toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });

    return (
        <div className="flex items-center gap-3 text-[10px] font-mono text-terminal-muted">
            <span className="flex items-center gap-1.5">
                <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                        paused ? "bg-terminal-muted" : busy ? "bg-terminal-gold animate-pulse" : "bg-terminal-emerald"
                    }`}
                />
                {paused ? "PAUSED" : "LIVE"} · UPDATED {time} UTC
            </span>
            <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="px-2 py-0.5 rounded border border-terminal-border hover:border-terminal-gold/50"
            >
                {paused ? "RESUME" : "PAUSE"}
            </button>
        </div>
    );
}
