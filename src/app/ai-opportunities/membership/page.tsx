import type { Metadata } from "next";
import Link from "next/link";
import { AI_BASE, DISPLAY_MEMBERSHIP, membershipDays } from "@/lib/ai/config";
import { getSignedInUser } from "@/lib/ai/data";
import { getAiMembership } from "@/lib/ai/membership";
import { niceDate } from "@/lib/ai/format";
import MembershipButton from "@/components/ai/MembershipButton";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Membership | Savanna AI Opportunities" };

export default async function MembershipPage() {
    const user = await getSignedInUser();
    const m = user ? await getAiMembership(user.id) : null;
    const days = membershipDays();

    return (
        <div className="aio-wrap" style={{ padding: "64px 0 88px", maxWidth: 860 }}>
            <Link href={AI_BASE} style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← AI Opportunities</Link>
            <span className="aio-eyebrow" style={{ display: "block", marginTop: 20 }}>Membership</span>
            <h1 className="aio-h2" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>Platform access, {DISPLAY_MEMBERSHIP}.</h1>

            {m?.active && (
                <div className="aio-notice" style={{ marginTop: 22 }} role="status">
                    <strong style={{ color: "var(--sc-green)" }}>Your membership is active.</strong> It runs until <strong>{niceDate(m.expiresAt)}</strong> ({m.daysLeft} day{m.daysLeft === 1 ? "" : "s"} left). Renewing now adds {days} days after that date, so no paid time is lost.
                </div>
            )}
            {m && !m.active && m.expiresAt && (
                <div className="aio-notice warn" style={{ marginTop: 22 }} role="status">Your membership expired on <strong>{niceDate(m.expiresAt)}</strong>. Renew to read the platform guides again.</div>
            )}

            <div className="aio-card aio-plan feature" style={{ marginTop: 28 }}>
                <div className="aio-price">{DISPLAY_MEMBERSHIP}<small>for {days} days of access</small></div>
                <ul className="aio-list">
                    <li>Complete directory of researched platforms</li>
                    <li>Detailed platform guides with eligibility and country requirements</li>
                    <li>Step-by-step registration instructions</li>
                    <li>Device and software requirements</li>
                    <li>Assessment preparation guidance</li>
                    <li>Payment and withdrawal information</li>
                    <li>Common registration mistakes and troubleshooting</li>
                    <li>Scam warnings and safety recommendations</li>
                    <li>New platform listings and updates</li>
                </ul>
                <div style={{ marginTop: 26 }}>
                    <MembershipButton label={m?.active ? `Renew now — ${DISPLAY_MEMBERSHIP}` : m?.expiresAt ? `Renew — ${DISPLAY_MEMBERSHIP}` : `Become a Member — ${DISPLAY_MEMBERSHIP}`} />
                </div>
                {!user && <p style={{ fontSize: 12.5, marginTop: 12 }}>You will be asked to <Link href="/login" style={{ color: "var(--sc-green)" }}>sign in</Link> or <Link href="/register" style={{ color: "var(--sc-green)" }}>create an account</Link> first.</p>}
            </div>

            <div className="aio-grid c2" style={{ marginTop: 20 }}>
                <div className="aio-card">
                    <h3>How payment works</h3>
                    <p>You pay on the secure Savanna checkout with Pochi la Biashara (M-Pesa), bank transfer, or USDC/USDT. Your membership starts only after the payment is verified. We never activate access on a promise or a screenshot.</p>
                </div>
                <div className="aio-card">
                    <h3>What this fee is not</h3>
                    <p>It is not a payment to Outlier, Mercor, or any other listed platform, and it does not buy an account, approval, projects or income. It pays for Savanna&apos;s research and guides only.</p>
                </div>
            </div>
            <div style={{ marginTop: 36 }}><Disclaimer /></div>
        </div>
    );
}
