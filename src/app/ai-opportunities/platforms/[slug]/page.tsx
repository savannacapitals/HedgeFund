import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AI_BASE, DISPLAY_ASSISTANCE, DISPLAY_MEMBERSHIP, NOT_VERIFIED, categoryLabel, yesNoLabel } from "@/lib/ai/config";
import { getFreePlatformIds, getGuide, getPlatformBySlug, getSignedInUser, listPlatforms } from "@/lib/ai/data";
import { getAiMembership } from "@/lib/ai/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { KenyaBadge, PlatformMark, StatusBadge } from "@/components/ai/StatusBadge";
import MembershipButton from "@/components/ai/MembershipButton";
import PlatformActions from "@/components/ai/PlatformActions";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const p = await getPlatformBySlug(slug);
    if (!p) return { title: "Platform | Savanna AI Opportunities" };
    const user = await getSignedInUser();
    const m = user ? await getAiMembership(user.id).catch(() => null) : null;
    const allowed = !!m?.active || (await getFreePlatformIds()).includes(p.id);
    return allowed
        ? { title: `${p.name} | Savanna AI Opportunities` }
        : { title: "Members-only platform | Savanna AI Opportunities", robots: { index: false, follow: false } };
}

const val = (v: any) => (v === null || v === undefined || v === "" ? NOT_VERIFIED : v);
const joined = (a: string[] | null | undefined) => (a && a.length ? a.join(", ") : NOT_VERIFIED);

function Block({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
    return (
        <section className="aio-block" id={id}>
            <h2><span className="aio-num">{String(n).padStart(2, "0")}</span>{title}</h2>
            {children}
        </section>
    );
}
const Ol = ({ items, empty }: { items?: string[]; empty: string }) =>
    items && items.length ? <ol>{items.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p>{empty}</p>;
const Ul = ({ items, empty }: { items?: string[]; empty: string }) =>
    items && items.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>{empty}</p>;

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const p = await getPlatformBySlug(slug);
    if (!p) notFound();

    const user = await getSignedInUser();
    const membership = user ? await getAiMembership(user.id) : null;
    const isMember = !!membership?.active;

    // Visitors without a membership can open only the free sample platforms. Everything else shows no platform details at all.
    if (!isMember && !(await getFreePlatformIds()).includes(p.id)) {
        const total = (await listPlatforms()).length;
        return (
            <div className="aio-wrap" style={{ padding: "56px 0 88px" }}>
                <Link href={`${AI_BASE}/platforms`} style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← Directory</Link>
                <div className="aio-card aio-lock" style={{ marginTop: 28 }}>
                    <span className="aio-eyebrow">Members only</span>
                    <h1 className="aio-h2">This platform is part of the members&apos; directory</h1>
                    <p className="aio-lede" style={{ margin: "14px auto 0" }}>
                        Membership unlocks all {total} researched platforms, each with its verification status, Kenya eligibility and a step-by-step registration guide.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 26 }}>
                        <MembershipButton label={`Unlock the full directory — ${DISPLAY_MEMBERSHIP}`} />
                        {!user && <Link href="/login" className="aio-btn ghost">Sign in</Link>}
                    </div>
                    <p style={{ fontSize: 12, marginTop: 14 }}>
                        {user && membership?.expiresAt ? "Your membership has expired. Renew to see this platform." : `${DISPLAY_MEMBERSHIP} for 30 days. Paid to Savanna only, never to a platform.`}
                    </p>
                </div>
                <div style={{ marginTop: 56 }}><Disclaimer /></div>
            </div>
        );
    }

    let guide: any = null;
    let saved = false;
    let stage: string | null = null;
    if (isMember && user) {
        guide = await getGuide(p.id);
        const admin = createAdminClient();
        // Remember what they looked at (powers "Recently viewed" on the dashboard)
        await admin.from("ai_platform_views").upsert({ user_id: user.id, platform_id: p.id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,platform_id" });
        const [{ data: s }, { data: pr }] = await Promise.all([
            admin.from("ai_saved_platforms").select("platform_id").eq("user_id", user.id).eq("platform_id", p.id).maybeSingle(),
            admin.from("ai_progress").select("stage").eq("user_id", user.id).eq("platform_id", p.id).maybeSingle(),
        ]);
        saved = !!s;
        stage = pr?.stage ?? null;
    }

    const g = guide ?? {};
    const sources: { label: string; url: string }[] = Array.isArray(g.sources) ? g.sources : [];
    const resources: { label: string; url: string }[] = Array.isArray(g.resources) ? g.resources : [];

    const toc = [
        ["overview", "Platform Overview"], ["eligibility", "Eligibility Requirements"], ["account", "Account Creation Guide"],
        ["assessment", "Assessment and Qualification"], ["earning", "Earning Structure"], ["payments", "Payments and Withdrawals"],
        ["mistakes", "Common Mistakes"], ["recommendations", "Savanna Recommendations"], ["resources", "Official Resources"], ["assistance", "Request Account Assistance"],
    ];

    return (
        <div className="aio-wrap" style={{ padding: "56px 0 88px" }}>
            <Link href={`${AI_BASE}/platforms`} style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← Directory</Link>

            <header style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
                    <PlatformMark name={p.name} logoUrl={p.logo_url} />
                    <div style={{ minWidth: 0 }}>
                        <h1 className="aio-h2" style={{ marginTop: 0, overflowWrap: "anywhere" }}>{p.name}</h1>
                        <div style={{ fontSize: 13, color: "var(--sc-fg-4)", marginTop: 4 }}>{categoryLabel(p.category)}</div>
                    </div>
                </div>
                <div className="aio-meta" style={{ marginTop: 0 }}>
                    <StatusBadge status={p.verification_status} />
                    <KenyaBadge value={p.kenya_eligibility} />
                </div>
            </header>

            <p className="aio-lede" style={{ marginTop: 18 }}>{p.short_description || "Research in progress."}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 16, fontSize: 12, color: "var(--sc-fg-4)" }}>
                <span>{p.last_verified ? `Last verified ${p.last_verified}` : "Not yet verified by Savanna"}</span>
                {p.official_url && <a href={p.official_url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--sc-green)" }}>Official website ↗</a>}
            </div>

            {!isMember && (
                <div className="aio-card aio-lock" style={{ marginTop: 36 }}>
                    <span className="aio-eyebrow">Members only</span>
                    <h2 className="aio-h2">The full research guide for {p.name}</h2>
                    <p className="aio-lede" style={{ margin: "14px auto 0" }}>
                        Eligibility, step-by-step registration, assessment preparation, payment and withdrawal information, common mistakes and Savanna&apos;s recommendations.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 26 }}>
                        <MembershipButton label={`Become a Member — ${DISPLAY_MEMBERSHIP}`} />
                        {!user && <Link href="/login" className="aio-btn ghost">Sign in</Link>}
                    </div>
                    <p style={{ fontSize: 12, marginTop: 14 }}>
                        {user && membership?.expiresAt ? "Your membership has expired. Renew to read this guide." : `${DISPLAY_MEMBERSHIP} for 30 days. Paid to Savanna only, never to ${p.name}.`}
                    </p>
                </div>
            )}

            {isMember && (
                <>
                    <div style={{ marginTop: 26 }}><PlatformActions platformId={p.id} saved={saved} stage={stage} /></div>

                    <div className="aio-guide" style={{ marginTop: 32 }}>
                        <nav className="aio-toc" aria-label="Guide sections">
                            {toc.map(([id, label], i) => <a key={id} href={`#${id}`}>{i + 1}. {label}</a>)}
                        </nav>

                        <article>
                            <div className="aio-notice warn" style={{ marginBottom: 8 }}>
                                Four separate questions: is the platform accepting registrations, does it accept Kenyan applicants, does it have projects right now, and does it actually pay contributors in Kenya? Each can have a different answer.
                                <dl className="aio-kv">
                                    <div><dt>Accepting registrations</dt><dd>{yesNoLabel(g.accepting_registrations ?? "unknown")}</dd></div>
                                    <div><dt>Accepts Kenyan applicants</dt><dd>{p.kenya_eligibility === "yes" ? "Yes" : p.kenya_eligibility === "no" ? "No" : p.kenya_eligibility === "conditional" ? "Conditional" : NOT_VERIFIED}</dd></div>
                                    <div><dt>Projects currently available</dt><dd>{yesNoLabel(g.has_projects ?? "unknown")}</dd></div>
                                    <div><dt>Pays contributors in Kenya</dt><dd>{yesNoLabel(g.pays_in_kenya ?? "unknown")}</dd></div>
                                </dl>
                            </div>

                            <Block n={1} id="overview" title="Platform Overview">
                                <p>{val(g.overview)}</p>
                                <dl className="aio-kv">
                                    <div><dt>Category</dt><dd>{categoryLabel(p.category)}</dd></div>
                                    <div><dt>Application availability</dt><dd>{val(g.application_availability)}</dd></div>
                                </dl>
                            </Block>

                            <Block n={2} id="eligibility" title="Eligibility Requirements">
                                {g.eligibility_notes && <p>{g.eligibility_notes}</p>}
                                <dl className="aio-kv">
                                    <div><dt>Supported countries</dt><dd>{val(g.country_eligibility)}</dd></div>
                                    <div><dt>Minimum age</dt><dd>{g.min_age ? `${g.min_age}+` : NOT_VERIFIED}</dd></div>
                                    <div><dt>Equipment</dt><dd>{joined(g.required_equipment)}</dd></div>
                                    <div><dt>Skills</dt><dd>{joined(g.required_skills)}</dd></div>
                                </dl>
                                <p style={{ marginTop: 14 }}><strong>Registration requirements</strong></p>
                                <Ul items={g.registration_requirements} empty={NOT_VERIFIED} />
                                {(p.verification_status === "restricted" || g.restriction_notes) && (
                                    <div className={`aio-notice ${p.verification_status === "restricted" ? "bad" : "warn"}`} style={{ marginTop: 16 }}>
                                        <strong>Restrictions: </strong>{val(g.restriction_notes)}
                                    </div>
                                )}
                                <p style={{ fontSize: 12.5 }}>Only register with accurate personal details from your real location. Savanna does not recommend VPNs, false identities or location manipulation. They breach most platforms&apos; rules and commonly lead to permanent bans and withheld payments.</p>
                            </Block>

                            <Block n={3} id="account" title="Account Creation Guide">
                                <Ol items={g.account_steps} empty={`A step-by-step guide has not been verified yet. Use the official website and ask for account assistance if you need help.`} />
                                <p style={{ fontSize: 12.5 }}>Always create your account through the platform&apos;s own official website. Never share your password or one-time codes with anyone, including Savanna.</p>
                            </Block>

                            <Block n={4} id="assessment" title="Assessment and Qualification">
                                <dl className="aio-kv"><div><dt>Assessment requirements</dt><dd>{val(g.assessment_requirements)}</dd></div></dl>
                                {g.assessment_notes && <p>{g.assessment_notes}</p>}
                            </Block>

                            <Block n={5} id="earning" title="Earning Structure">
                                <dl className="aio-kv"><div><dt>Officially published compensation</dt><dd>{val(g.compensation)}</dd></div></dl>
                                {g.earning_notes && <p>{g.earning_notes}</p>}
                                <p style={{ fontSize: 12.5 }}>Savanna does not estimate or promise earnings. Pay depends on the platform, the project, your qualifications and your work.</p>
                            </Block>

                            <Block n={6} id="payments" title="Payments and Withdrawals">
                                <dl className="aio-kv"><div><dt>Payment methods</dt><dd>{joined(g.payment_methods)}</dd></div></dl>
                                {g.payments_notes && <p>{g.payments_notes}</p>}
                            </Block>

                            <Block n={7} id="mistakes" title="Common Mistakes">
                                <Ul items={g.common_mistakes} empty="No verified list of common mistakes has been published for this platform yet." />
                            </Block>

                            <Block n={8} id="recommendations" title="Savanna Recommendations">
                                <Ul items={g.recommendations} empty="No recommendations have been published for this platform yet." />
                            </Block>

                            <Block n={9} id="resources" title="Official Resources">
                                {resources.length ? (
                                    <ul>{resources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.label} ↗</a></li>)}</ul>
                                ) : p.official_url ? (
                                    <ul><li><a href={p.official_url} target="_blank" rel="noopener noreferrer nofollow">Official website ↗</a></li></ul>
                                ) : <p>No official links have been confirmed yet.</p>}
                                <p style={{ marginTop: 18 }}><strong>Sources and verification</strong></p>
                                {sources.length ? (
                                    <ul>{sources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.label} ↗</a></li>)}</ul>
                                ) : <p>No source links yet. Treat the details above as {NOT_VERIFIED.toLowerCase()}.</p>}
                                <p style={{ fontSize: 12.5 }}>Last verified: {p.last_verified ?? "not yet verified"}. Platforms change their rules often, so confirm on the official site before you act.</p>
                            </Block>

                            <Block n={10} id="assistance" title="Request Account Assistance">
                                <div className="aio-card" style={{ marginTop: 14 }}>
                                    <h3>Need help getting started?</h3>
                                    <p>Get personal assistance from Savanna Capitals.</p>
                                    <div className="aio-price" style={{ marginTop: 16 }}>{DISPLAY_ASSISTANCE}</div>
                                    <p style={{ fontSize: 12.5 }}>You keep control of your own email, passwords, one-time codes, identity checks and payment details. The fee pays for our help, not for guaranteed approval or employment.</p>
                                    <div style={{ marginTop: 18 }}>
                                        <Link href={`${AI_BASE}/assistance?platform=${p.slug}`} className="aio-btn gold">Request Account Assistance</Link>
                                    </div>
                                </div>
                            </Block>
                        </article>
                    </div>
                </>
            )}

            <div style={{ marginTop: 56 }}><Disclaimer /></div>
        </div>
    );
}
