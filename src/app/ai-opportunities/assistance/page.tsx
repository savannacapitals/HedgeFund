import type { Metadata } from "next";
import Link from "next/link";
import { AI_BASE, DISPLAY_ASSISTANCE } from "@/lib/ai/config";
import { getSignedInUser, listPlatforms } from "@/lib/ai/data";
import AssistanceForm from "@/components/ai/AssistanceForm";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account Assistance | Savanna AI Opportunities" };

export default async function AssistancePage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
    const { platform } = await searchParams;
    const [platforms, user] = await Promise.all([listPlatforms(), getSignedInUser()]);
    const preselect = platforms.find((p) => p.slug === platform)?.id;

    return (
        <div className="aio-wrap" style={{ padding: "64px 0 88px", maxWidth: 860 }}>
            <Link href={AI_BASE} style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← AI Opportunities</Link>
            <span className="aio-eyebrow" style={{ display: "block", marginTop: 20 }}>Account assistance</span>
            <h1 className="aio-h2" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>Need help getting started?</h1>
            <p className="aio-lede">Get personal assistance from Savanna Capitals with registration on a platform you have chosen. Fee: <strong>{DISPLAY_ASSISTANCE}</strong> per platform request.</p>

            <div className="aio-grid c2" style={{ margin: "26px 0" }}>
                <div className="aio-card">
                    <h3>What is included</h3>
                    <ul className="aio-list">
                        <li>Individual registration guidance</li>
                        <li>Help understanding application requirements</li>
                        <li>Help navigating registration forms</li>
                        <li>Profile completion guidance</li>
                        <li>Help understanding verification requirements</li>
                        <li>Basic onboarding troubleshooting</li>
                    </ul>
                </div>
                <div className="aio-card">
                    <h3>What stays with you</h3>
                    <p>You keep control of your own email, passwords, one-time codes, identity verification and payment details. We never ask for or store third-party passwords or authentication codes, and we do not create accounts for you in ways that break a platform&apos;s terms.</p>
                    <p>The fee pays for Savanna&apos;s assistance. It does not buy guaranteed account approval, project access or employment.</p>
                </div>
            </div>

            <AssistanceForm platforms={platforms.map((p) => ({ id: p.id, name: p.name }))} preselectId={preselect} signedIn={!!user} />
            <div style={{ marginTop: 36 }}><Disclaimer compact /></div>
        </div>
    );
}
