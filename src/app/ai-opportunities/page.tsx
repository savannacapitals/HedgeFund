import Link from "next/link";
import type { Metadata } from "next";
import { AI_BASE, AI_TAGLINE, CATEGORIES, DISPLAY_ASSISTANCE, DISPLAY_MEMBERSHIP, membershipDays } from "@/lib/ai/config";
import { listPlatforms } from "@/lib/ai/data";
import PlatformCard from "@/components/ai/PlatformCard";
import MembershipButton from "@/components/ai/MembershipButton";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "AI Opportunities | Savanna Capitals",
    description: "Discover legitimate AI training platforms, understand their requirements and prepare your application. Independent research from Savanna Capitals.",
};

const FAQ = [
    ["Is Savanna AI Opportunities a job board or an employer?", "No. We are an independent research and guidance platform. We research third-party AI work platforms and explain how they work. We do not hire you, place you or represent any listed company."],
    ["Does a KES 100 membership guarantee I get work?", "No. Membership pays for access to our research, guides and updates. Whether a platform accepts you, assigns you projects or pays you is decided only by that platform."],
    ["Will I pay a platform when I register with it?", "You should not need to. Our membership fee is paid to Savanna only and is separate from anything a third-party platform asks. Treat any request to pay for access to work with caution and read our scam warnings."],
    ["What does the USD 15 account assistance cover?", "Personal guidance through one platform's registration: understanding requirements, completing forms and your profile, and basic onboarding troubleshooting. You keep control of your own email, passwords, one-time codes, identity checks and payment details."],
    ["Do you promise a platform accepts Kenyan applicants?", "No. We separate four things: whether a platform is accepting registrations, whether it accepts Kenyan applicants, whether it currently has projects, and whether it actually pays contributors in Kenya. Where we cannot confirm something we say it is not independently verified."],
    ["How long does membership last?", `Each payment gives ${membershipDays()} days of access. Your expiry date is shown on your dashboard and you can renew at any time. Renewing early adds time after your current period ends.`],
];

export default async function AiOpportunitiesPage() {
    const platforms = await listPlatforms();
    const featured = platforms.filter((p) => p.is_featured).slice(0, 3);
    const recent = [...platforms].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 3);
    const verifiedCount = platforms.filter((p) => p.verification_status === "verified").length;
    const countFor = (id: string) => platforms.filter((p) => p.category === id).length;

    return (
        <div>
            <section className="aio-hero">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Savanna AI Opportunities</span>
                    <h1 className="aio-h1">Access the Opportunities of the <em>AI Economy.</em></h1>
                    <p className="aio-lede">
                        Discover legitimate AI training platforms, understand their requirements and learn how to position yourself for opportunities in the global digital workforce.
                    </p>
                    <div className="aio-actions">
                        <Link href={`${AI_BASE}/platforms`} className="aio-btn primary">Explore Opportunities →</Link>
                        <Link href={`${AI_BASE}/membership`} className="aio-btn ghost">Become a Member — {DISPLAY_MEMBERSHIP}</Link>
                    </div>
                    <div className="aio-tagline" aria-label="Tagline">
                        {AI_TAGLINE.split(". ").map((w) => <span key={w}><b>▸</b> {w.replace(/\.$/, "")}</span>)}
                    </div>
                    <p style={{ marginTop: 28, fontSize: 12, color: "var(--sc-fg-4)" }}>
                        {platforms.length} platforms under research · {verifiedCount} verified · Prioritising Kenya, built for Africa
                    </p>
                </div>
            </section>

            <section className="aio-section" id="categories">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Opportunity categories</span>
                    <h2 className="aio-h2">Six ways the AI economy hires.</h2>
                    <div className="aio-grid c3" style={{ marginTop: 32 }}>
                        {CATEGORIES.map((c, i) => (
                            <Link key={c.id} href={`${AI_BASE}/platforms?category=${c.id}`} className="aio-card" style={{ display: "block" }}>
                                <span className="aio-num">{String(i + 1).padStart(2, "0")}</span>
                                <h3 style={{ marginTop: 10 }}>{c.label}</h3>
                                <p>{c.blurb}</p>
                                <div style={{ marginTop: 14, fontSize: 12, color: "var(--sc-fg-4)" }}>{countFor(c.id)} platform{countFor(c.id) === 1 ? "" : "s"} listed</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {featured.length > 0 && (
                <section className="aio-section alt">
                    <div className="aio-wrap">
                        <span className="aio-eyebrow">Featured platforms</span>
                        <h2 className="aio-h2">Where our research starts.</h2>
                        <p className="aio-lede" style={{ marginTop: 12 }}>Featured does not mean endorsed. Check each platform&apos;s verification status and Kenya eligibility before you spend time on it.</p>
                        <div className="aio-grid c3" style={{ marginTop: 32 }}>{featured.map((p) => <PlatformCard key={p.id} p={p} />)}</div>
                    </div>
                </section>
            )}

            {recent.length > 0 && (
                <section className="aio-section">
                    <div className="aio-wrap">
                        <span className="aio-eyebrow">Recently added</span>
                        <h2 className="aio-h2">Newest research listings.</h2>
                        <div className="aio-grid c3" style={{ marginTop: 32 }}>{recent.map((p) => <PlatformCard key={p.id} p={p} />)}</div>
                        <div style={{ marginTop: 28 }}><Link href={`${AI_BASE}/platforms`} className="aio-btn ghost">View the full directory</Link></div>
                    </div>
                </section>
            )}

            <section className="aio-section alt" id="how">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">How it works</span>
                    <h2 className="aio-h2">Discover. Qualify. Apply. Earn.</h2>
                    <div className="aio-grid c4" style={{ marginTop: 32 }}>
                        {[
                            ["Discover", "Browse researched platforms and filter by category, country eligibility and verification status."],
                            ["Qualify", "Read requirements, equipment, skills and assessment preparation before you apply."],
                            ["Apply", "Follow the numbered registration guide through the platform's own official website."],
                            ["Earn", "Understand payment methods and withdrawals. Any income depends entirely on the platform and your work."],
                        ].map(([t, d], i) => (
                            <div key={t} className="aio-card">
                                <span className="aio-num">STEP {i + 1}</span>
                                <h3 style={{ marginTop: 10 }}>{t}</h3>
                                <p>{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="aio-section" id="pricing">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Pricing</span>
                    <h2 className="aio-h2">Two services. Clearly separate.</h2>
                    <div className="aio-grid c2" style={{ marginTop: 32 }}>
                        <div className="aio-card aio-plan feature">
                            <span className="aio-badge plain aio-ribbon">Membership</span>
                            <h3>Platform access</h3>
                            <div className="aio-price" style={{ marginTop: 18 }}>{DISPLAY_MEMBERSHIP}<small>/ {membershipDays()} days</small></div>
                            <ul className="aio-list">
                                <li>Complete directory of researched platforms</li>
                                <li>Detailed guides, eligibility and registration steps</li>
                                <li>Device and software requirements</li>
                                <li>Assessment preparation guidance</li>
                                <li>Payment and withdrawal information</li>
                                <li>Common mistakes, scam warnings and safety advice</li>
                                <li>New platform listings and updates</li>
                            </ul>
                            <div style={{ marginTop: 24 }}><MembershipButton label={`Become a Member — ${DISPLAY_MEMBERSHIP}`} /></div>
                            <p style={{ fontSize: 12 }}>This fee is paid to Savanna only. It is not a payment to any third-party platform.</p>
                        </div>
                        <div className="aio-card aio-plan">
                            <span className="aio-badge plain aio-ribbon">Optional</span>
                            <h3>Account assistance</h3>
                            <div className="aio-price" style={{ marginTop: 18 }}>{DISPLAY_ASSISTANCE}<small>/ platform request</small></div>
                            <ul className="aio-list">
                                <li>Individual registration guidance</li>
                                <li>Help understanding application requirements</li>
                                <li>Help navigating registration forms</li>
                                <li>Profile completion guidance</li>
                                <li>Help understanding verification requirements</li>
                                <li>Basic onboarding troubleshooting</li>
                            </ul>
                            <div style={{ marginTop: 24 }}><Link href={`${AI_BASE}/assistance`} className="aio-btn ghost">Request Account Assistance</Link></div>
                            <p style={{ fontSize: 12 }}>You keep control of your email, passwords, one-time codes, identity checks and payment details. The fee pays for our help, not for guaranteed approval or employment.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="aio-section alt" id="faq">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">FAQ</span>
                    <h2 className="aio-h2">Straight answers.</h2>
                    <div className="aio-faq" style={{ marginTop: 24 }}>
                        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
                    </div>
                </div>
            </section>

            <section className="aio-section">
                <div className="aio-wrap" style={{ textAlign: "center" }}>
                    <h2 className="aio-h2">Start with research, not guesswork.</h2>
                    <div className="aio-actions" style={{ justifyContent: "center" }}>
                        <MembershipButton label={`Become a Member — ${DISPLAY_MEMBERSHIP}`} />
                        <Link href={`${AI_BASE}/platforms`} className="aio-btn ghost">Browse the directory</Link>
                    </div>
                    <div style={{ marginTop: 40, textAlign: "left" }}><Disclaimer /></div>
                </div>
            </section>
        </div>
    );
}
