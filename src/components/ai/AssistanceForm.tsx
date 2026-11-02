"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option { id: string; name: string }

export default function AssistanceForm({ platforms, preselectId, signedIn }: { platforms: Option[]; preselectId?: string; signedIn: boolean }) {
    const router = useRouter();
    const [platformId, setPlatformId] = useState(preselectId && platforms.some((p) => p.id === preselectId) ? preselectId : "");
    const [challenge, setChallenge] = useState("");
    const [contact, setContact] = useState("");
    const [ack, setAck] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!signedIn) return router.push("/login");
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/ai/assistance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ platformId, challenge, contactPreference: contact, acknowledged: ack }),
            });
            const json = await res.json();
            if (res.status === 401) return router.push("/login");
            if (!res.ok) throw new Error(json.error || "Could not submit your request.");
            router.push(json.redirectTo);
        } catch (err: any) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="aio-card" style={{ display: "grid", gap: 18 }}>
            <div>
                <label className="aio-label" htmlFor="ap">Platform you need help with</label>
                <select id="ap" className="aio-select" required value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                    <option value="" disabled>Choose a platform</option>
                    {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div>
                <label className="aio-label" htmlFor="ac">What is your registration challenge?</label>
                <textarea id="ac" className="aio-textarea" required minLength={10} maxLength={2000} value={challenge} onChange={(e) => setChallenge(e.target.value)}
                    placeholder="For example: I do not understand which account type to choose, or my profile keeps failing a verification step." />
                <p style={{ fontSize: 11.5, color: "var(--sc-fg-4)", marginTop: 6 }}>
                    Never include passwords, one-time codes, PINs, card numbers or ID numbers. Savanna will never ask for them.
                </p>
            </div>
            <div>
                <label className="aio-label" htmlFor="acp">How should we reach you? (optional)</label>
                <input id="acp" className="aio-input" maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or WhatsApp number" />
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: "var(--sc-fg-2)" }}>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} required style={{ marginTop: 4 }} />
                <span>
                    I understand the USD 15 fee pays for Savanna&apos;s guidance, not for guaranteed account approval, project access or employment. I will keep control of my own email, passwords, one-time codes, identity verification and payment details.
                </span>
            </label>
            {error && <div className="aio-notice bad" role="alert">{error}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <button type="submit" className="aio-btn gold" disabled={busy}>
                    {busy ? "Please wait…" : signedIn ? "Continue to payment · USD 15" : "Sign in to continue"}
                </button>
                <span style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>You pay on the next screen. Nothing starts until the payment is confirmed.</span>
            </div>
        </form>
    );
}
