"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelRequestButton({ requestId }: { requestId: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    return (
        <span>
            <button
                type="button"
                className="aio-btn ghost sm"
                disabled={busy}
                onClick={async () => {
                    if (!window.confirm("Cancel this unpaid request?")) return;
                    setBusy(true);
                    setError("");
                    const res = await fetch("/api/ai/assistance/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
                    if (res.ok) return router.refresh();
                    const json = await res.json().catch(() => ({}));
                    setError(json.error || "Could not cancel.");
                    setBusy(false);
                }}
            >
                Cancel request
            </button>
            {error && <span role="alert" style={{ color: "#e07a7a", fontSize: 12, marginLeft: 8 }}>{error}</span>}
        </span>
    );
}
