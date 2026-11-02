"use client";

import { useState } from "react";
import { PROGRESS_STAGES } from "@/lib/ai/config";

/** Save button and the member's own progress tracker for one platform. Self-reported: Savanna does not verify it. */
export default function PlatformActions({ platformId, saved: initialSaved, stage: initialStage }: { platformId: string; saved: boolean; stage: string | null }) {
    const [saved, setSaved] = useState(initialSaved);
    const [stage, setStage] = useState<string>(initialStage ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function post(url: string, body: any) {
        setBusy(true);
        setError("");
        try {
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Could not save that.");
            return json;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button
                type="button"
                className="aio-btn ghost sm"
                aria-pressed={saved}
                disabled={busy}
                onClick={async () => {
                    const r = await post("/api/ai/saved", { platformId, saved: !saved });
                    if (r) setSaved(r.saved);
                }}
            >
                {saved ? "★ Saved" : "☆ Save platform"}
            </button>
            <label style={{ fontSize: 12, color: "var(--sc-fg-4)" }} htmlFor={`stage-${platformId}`}>My progress</label>
            <select
                id={`stage-${platformId}`}
                className="aio-select"
                style={{ width: "auto", minHeight: 34, padding: "4px 10px", fontSize: 12 }}
                value={stage}
                disabled={busy}
                onChange={async (e) => {
                    const next = e.target.value;
                    const r = await post("/api/ai/progress", { platformId, stage: next || null });
                    if (r) setStage(next);
                }}
            >
                <option value="">Not tracking</option>
                {PROGRESS_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {error && <span role="alert" style={{ color: "#e07a7a", fontSize: 12 }}>{error}</span>}
        </div>
    );
}
