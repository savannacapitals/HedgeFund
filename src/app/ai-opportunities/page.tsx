import Link from "next/link";
import type { Metadata } from "next";
import { AI_BASE, CATEGORIES, DISPLAY_ASSISTANCE, DISPLAY_MEMBERSHIP, membershipDays, membershipPriceKes } from "@/lib/ai/config";
import { getSignedInUser, listPlatforms } from "@/lib/ai/data";
import { getAiMembership } from "@/lib/ai/membership";
import PlatformCard from "@/components/ai/PlatformCard";
import { KenyaBadge, StatusBadge } from "@/components/ai/StatusBadge";
import MembershipButton from "@/components/ai/MembershipButton";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "AI Opportunities | Savanna Capitals",
    description:
        "Know which AI training and data work platforms are real, which accept Kenyan applicants, and exactly how to register and prepare. Independent research from Savanna Capitals.",
};

const FAQ: [string, string][] = [
    ["Is Savanna AI Opportunities a job board or an employer?", "No. We are an independent research and guidance platform. We research third-party AI work platforms and explain how they work. We do not hire you, place you or represent any listed company."],
    ["Does the membership guarantee I get work?", "No. Membership pays for access to our research, guides and updates. Whether a platform accepts you, assigns you projects or pays you is decided only by that platform. Anyone who promises otherwise is a red flag."],
    ["Will I pay a platform when I register with it?", "You should not need to. Our membership fee is paid to Savanna only and is separate from anything a third-party platform asks. Treat any request to pay for access to work with caution and read our scam warnings."],
    ["What does the USD 15 account assistance cover?", "Personal guidance through one platform's registration: understanding requirements, completing forms and your profile, and basic onboarding troubleshooting. You keep control of your own email, passwords, one-time codes, identity checks and payment details."],
    ["Do you promise a platform accepts Kenyan applicants?", "No. We separate four things: whether a platform is accepting registrations, whether it accepts Kenyan applicants, whether it currently has projects, and whether it actually pays contributors in Kenya. Where we cannot confirm something we say it is not independently verified."],
    ["How do I pay, and when does access start?", "You pay on the Savanna checkout with Pochi la Biashara (M-Pesa), bank transfer, or USDC/USDT. Access starts only after the payment is verified. We never activate access on a promise or a screenshot."],
    ["How long does membership last?", `Each payment gives ${membershipDays()} days of access. Your expiry date is shown on your dashboard and you can renew at any time. Renewing early adds time after your current period ends.`],
];

const GUIDE_SECTIONS = [
    "Eligibility and country requirements",
    "Step-by-step registration",
    "Device and software requirements",
    "Assessment preparation",
    "Payments and withdrawals",
    "Common mistakes and scam warnings",
];

const VALUE = [
    { t: "A researched directory", d: "Every platform is labelled Verified, Conditional, Restricted or Under Review, with a separate Kenya eligibility flag, so you stop guessing.", i: "M4 6h16M4 12h16M4 18h10" },
    { t: "Registration, step by step", d: "Numbered guides that follow the platform's own official site, so you do not get stuck on forms or profile steps.", i: "M5 12l4 4L19 7" },
    { t: "Assessment preparation", d: "Know what the screening tests, what they expect and how to prepare before you spend your one attempt.", i: "M9 4h6M12 4v16M6 20h12" },
    { t: "Payments and withdrawals", d: "How contributors are paid, which methods exist and what to check before you start working.", i: "M3 7h18v10H3zM3 11h18" },
    { t: "Scam shield", d: "Red flags, fake-recruiter patterns and the rule we repeat everywhere: real work never charges you to start.", i: "M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z" },
    { t: "New listings and updates", d: "New platforms and status changes are added to the directory, so your 30 days stay useful.", i: "M12 5v14M5 12h14" },
];

function Ico({ d }: { d: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export default async function AiOpportunitiesPage() {
    const [platforms, user] = await Promise.all([listPlatforms(), getSignedInUser()]);
    const membership = user ? await getAiMembership(user.id).catch(() => null) : null;
    const isMember = !!membership?.active;

    const featured = platforms.filter((p) => p.is_featured).slice(0, 3);
    const recent = [...platforms].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 3);
    const verifiedCount = platforms.filter((p) => p.verification_status === "verified").length;
    const kenyaCount = platforms.filter((p) => p.kenya_eligibility === "yes" || p.kenya_eligibility === "conditional").length;
    const countFor = (id: string) => platforms.filter((p) => p.category === id).length;
    const sample = featured[0] ?? platforms[0] ?? null;
    const days = membershipDays();
    const perDay = (membershipPriceKes() / days).toFixed(2);

    const stats = [
        { n: platforms.length, l: "platforms researched" },
        { n: verifiedCount, l: "marked Verified" },
        { n: kenyaCount, l: "accept or conditionally accept Kenya" },
        { n: CATEGORIES.length, l: "categories of AI work" },
    ];
    const showStats = platforms.length > 0;

    const primaryCta = isMember ? (
        <Link href={`${AI_BASE}/platforms`} className="aio-btn primary">Open the directory →</Link>
    ) : (
        <MembershipButton label={`Unlock full access — ${DISPLAY_MEMBERSHIP}`} />
    );

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    };

    return (
        <div className={isMember ? undefined : "aio-hasbar"}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

            {/* 1. HERO */}
            <section className="aio-hero">
                <div className="aio-wrap aio-herogrid">
                    <div>
                        <span className="aio-eyebrow">Savanna AI Opportunities</span>
                        <h1 className="aio-h1">Find the AI work platforms that actually <em>accept you.</em></h1>
                        <p className="aio-lede">
                            AI training, data annotation and evaluation work is real, and so are the scams around it. We research the platforms, check Kenya eligibility, and give you the exact steps to register and prepare, so you stop burning weeks on dead ends.
                        </p>
                        <div className="aio-actions">
                            {primaryCta}
                            <Link href={`${AI_BASE}/platforms`} className="aio-btn ghost">Browse the directory free</Link>
                        </div>
                        <div className="aio-trust">
                            <span>{DISPLAY_MEMBERSHIP} for {days} days</span>
                            <span>Paid to Savanna only, never to a platform</span>
                            <span>Access starts after payment is verified</span>
                        </div>
                    </div>

                    {/* Locked guide preview: the free part (status) is real, the paid part is visibly behind the door. */}
                    <div className="aio-preview" aria-label="Preview of a platform guide">
                        <div className="aio-preview-head">
                            <span className="aio-eyebrow">{sample ? "Free to see" : "Inside every guide"}</span>
                            <h3 style={{ marginTop: 8 }}>{sample ? sample.name : "A platform guide"}</h3>
                            <div className="aio-meta">
                                {sample ? (
                                    <>
                                        <StatusBadge status={sample.verification_status} />
                                        <KenyaBadge value={sample.kenya_eligibility} />
                                    </>
                                ) : (
                                    <span className="aio-chip">Status · Kenya eligibility · Requirements</span>
                                )}
                            </div>
                        </div>
                        {GUIDE_SECTIONS.map((s, i) => (
                            <div key={s} className={`aio-lockrow ${isMember ? "open" : "locked"}`}>
                                <span className="aio-num">{String(i + 1).padStart(2, "0")}</span>
                                <span>{s}</span>
                                <em>{isMember ? "Unlocked" : "🔒 Members"}</em>
                            </div>
                        ))}
                        <div className="aio-preview-foot">
                            <p>{isMember ? "Your membership is active. Open any platform to read the full guide." : "The directory and each platform's status are free. The full guides unlock with membership."}</p>
                            {isMember ? (
                                <Link href={`${AI_BASE}/dashboard`} className="aio-btn primary">Go to my dashboard</Link>
                            ) : (
                                <MembershipButton label={`Unlock the guides — ${DISPLAY_MEMBERSHIP}`} />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Sticky section navigation */}
            <div className="aio-subnav">
                <div className="aio-wrap">
                    <nav aria-label="On this page">
                        <a href="#why">Why it matters</a>
                        <a href="#inside">What you get</a>
                        <a href="#categories">Categories</a>
                        <a href="#platforms">Platforms</a>
                        <a href="#how">How it works</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#faq">FAQ</a>
                    </nav>
                    {isMember ? (
                        <Link href={`${AI_BASE}/dashboard`} className="aio-btn primary sm">My dashboard</Link>
                    ) : (
                        <MembershipButton label={`Join — ${DISPLAY_MEMBERSHIP}`} className="aio-btn primary sm" />
                    )}
                </div>
            </div>

            {/* 2. PROOF STRIP (live numbers from the directory, nothing invented) */}
            {showStats && (
                <section className="aio-section" style={{ paddingBlock: 40, borderTop: 0 }}>
                    <div className="aio-wrap">
                        <div className="aio-stats">
                            {stats.map((s) => (
                                <div key={s.l}><b>{s.n}</b><span>{s.l}</span></div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 3. THE PROBLEM */}
            <section className="aio-section aio-anchor" id="why">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Why it matters</span>
                    <h2 className="aio-h2">Most people lose weeks before they earn a shilling.</h2>
                    <p className="aio-lede">The work exists. The hard part is knowing where to spend your time. Here is the difference research makes.</p>
                    <div className="aio-split" style={{ marginTop: 32 }}>
                        <div className="aio-card aio-col bad">
                            <h3>Going in blind</h3>
                            <ul className="aio-xlist no">
                                <li>Registering on platforms that do not accept your country</li>
                                <li>Failing an assessment you could only take once</li>
                                <li>Falling for fake recruiters who ask for a fee</li>
                                <li>Not knowing whether a platform pays in Kenya until after the work</li>
                                <li>Scattered forum advice that is out of date</li>
                            </ul>
                        </div>
                        <div className="aio-card aio-col good">
                            <h3>With Savanna research</h3>
                            <ul className="aio-xlist yes">
                                <li>Status and Kenya eligibility stated before you start</li>
                                <li>Assessment preparation, so your first attempt counts</li>
                                <li>Scam red flags and safety advice in one place</li>
                                <li>Payment and withdrawal information up front</li>
                                <li>Listings updated, with the last verified date shown</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHAT YOU GET */}
            <section className="aio-section alt aio-anchor" id="inside">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">What you get</span>
                    <h2 className="aio-h2">Everything you need to go from curious to registered.</h2>
                    <div className="aio-grid c3" style={{ marginTop: 32 }}>
                        {VALUE.map((v) => (
                            <div key={v.t} className="aio-card aio-feature">
                                <div className="aio-ico"><Ico d={v.i} /></div>
                                <div>
                                    <h3>{v.t}</h3>
                                    <p>{v.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="aio-actions">{primaryCta}</div>
                </div>
            </section>

            {/* 5. CATEGORIES */}
            <section className="aio-section aio-anchor" id="categories">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Opportunity categories</span>
                    <h2 className="aio-h2">Six ways the AI economy hires.</h2>
                    <div className="aio-grid c3" style={{ marginTop: 32 }}>
                        {CATEGORIES.map((c, i) => (
                            <Link key={c.id} href={`${AI_BASE}/platforms?category=${c.id}`} className="aio-card" style={{ display: "block" }}>
                                <span className="aio-num">{String(i + 1).padStart(2, "0")}</span>
                                <h3 style={{ marginTop: 10 }}>{c.label}</h3>
                                <p>{c.blurb}</p>
                                <div style={{ marginTop: 14, fontSize: 12, color: "var(--sc-fg-4)" }}>{countFor(c.id)} platform{countFor(c.id) === 1 ? "" : "s"} listed →</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. PLATFORMS */}
            {(featured.length > 0 || recent.length > 0) && (
                <section className="aio-section alt aio-anchor" id="platforms">
                    <div className="aio-wrap">
                        {featured.length > 0 && (
                            <>
                                <span className="aio-eyebrow">Featured platforms</span>
                                <h2 className="aio-h2">Where our research starts.</h2>
                                <p className="aio-lede" style={{ marginTop: 12 }}>Featured does not mean endorsed. Check each platform&apos;s verification status and Kenya eligibility before you spend time on it.</p>
                                <div className="aio-grid c3" style={{ marginTop: 32 }}>{featured.map((p) => <PlatformCard key={p.id} p={p} />)}</div>
                            </>
                        )}
                        {recent.length > 0 && (
                            <div style={{ marginTop: featured.length > 0 ? 64 : 0 }}>
                                <span className="aio-eyebrow">Recently added</span>
                                <h2 className="aio-h2">Newest research listings.</h2>
                                <div className="aio-grid c3" style={{ marginTop: 32 }}>{recent.map((p) => <PlatformCard key={p.id} p={p} />)}</div>
                            </div>
                        )}
                        <div style={{ marginTop: 28 }}><Link href={`${AI_BASE}/platforms`} className="aio-btn ghost">View the full directory</Link></div>
                    </div>
                </section>
            )}

            {/* 7. HOW IT WORKS */}
            <section className="aio-section aio-anchor" id="how">
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
                    <p style={{ marginTop: 20, fontSize: 12.5, color: "var(--sc-fg-4)", maxWidth: 680 }}>
                        Track your own progress from Interested to First Payment Received on your member dashboard.
                    </p>
                </div>
            </section>

            {/* 8. PRICING */}
            <section className="aio-section alt aio-anchor" id="pricing">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">Pricing</span>
                    <h2 className="aio-h2">Two services. Clearly separate.</h2>
                    <div className="aio-grid c2" style={{ marginTop: 32 }}>
                        <div className="aio-card aio-plan feature">
                            <span className="aio-badge plain aio-ribbon">Start here</span>
                            <h3>Membership: platform access</h3>
                            <div className="aio-price" style={{ marginTop: 18 }}>{DISPLAY_MEMBERSHIP}<small>/ {days} days</small></div>
                            <div className="aio-perday">≈ KES {perDay} per day</div>
                            <ul className="aio-list">
                                <li>Complete directory of researched platforms</li>
                                <li>Detailed guides, eligibility and registration steps</li>
                                <li>Device and software requirements</li>
                                <li>Assessment preparation guidance</li>
                                <li>Payment and withdrawal information</li>
                                <li>Common mistakes, scam warnings and safety advice</li>
                                <li>New platform listings and updates</li>
                            </ul>
                            <div style={{ marginTop: 24 }}>
                                {isMember ? <Link href={`${AI_BASE}/membership`} className="aio-btn primary">Renew or extend</Link> : <MembershipButton label={`Become a Member — ${DISPLAY_MEMBERSHIP}`} />}
                            </div>
                            <p style={{ fontSize: 12 }}>This fee is paid to Savanna only. It is not a payment to any third-party platform. Pay with Pochi la Biashara (M-Pesa), bank transfer, or USDC/USDT.</p>
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

            {/* 9. FAQ */}
            <section className="aio-section aio-anchor" id="faq">
                <div className="aio-wrap">
                    <span className="aio-eyebrow">FAQ</span>
                    <h2 className="aio-h2">Straight answers.</h2>
                    <div className="aio-faq" style={{ marginTop: 24 }}>
                        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
                    </div>
                </div>
            </section>

            {/* 10. FINAL CTA */}
            <section className="aio-section alt">
                <div className="aio-wrap">
                    <div className="aio-final">
                        <span className="aio-eyebrow">Ready when you are</span>
                        <h2 className="aio-h2">Start with research, not guesswork.</h2>
                        <p className="aio-lede">{DISPLAY_MEMBERSHIP} for {days} days of access to every guide. No work or income is promised, only clear, verified information to help you decide where to apply.</p>
                        <div className="aio-actions" style={{ justifyContent: "center" }}>
                            {primaryCta}
                            <Link href={`${AI_BASE}/platforms`} className="aio-btn ghost">Browse the directory</Link>
                        </div>
                    </div>
                    <div style={{ marginTop: 40 }}><Disclaimer /></div>
                </div>
            </section>

            {/* Mobile sticky buy bar (hidden for members and on desktop) */}
            {!isMember && (
                <div className="aio-stickybar">
                    <div><strong>{DISPLAY_MEMBERSHIP}</strong><small>{days} days · paid to Savanna only</small></div>
                    <MembershipButton label="Unlock access" className="aio-btn primary sm" />
                </div>
            )}
        </div>
    );
}
