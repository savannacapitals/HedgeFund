import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AI_BASE, DISPLAY_MEMBERSHIP, PROGRESS_STAGES, categoryLabel, requestStatusLabel, stageLabel } from "@/lib/ai/config";
import { getSignedInUser } from "@/lib/ai/data";
import { getAiMembership } from "@/lib/ai/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { niceDate } from "@/lib/ai/format";
import MembershipButton from "@/components/ai/MembershipButton";
import PlatformActions from "@/components/ai/PlatformActions";
import CancelRequestButton from "@/components/ai/CancelRequestButton";
import { PlatformMark } from "@/components/ai/StatusBadge";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Dashboard | Savanna AI Opportunities", robots: { index: false, follow: false } };

const one = (v: any) => (Array.isArray(v) ? v[0] : v);

export default async function AiDashboardPage() {
    const user = await getSignedInUser();
    if (!user) redirect("/login");

    const admin = createAdminClient();
    const membership = await getAiMembership(user.id);

    const [saved, views, progress, requests, news] = await Promise.all([
        admin.from("ai_saved_platforms").select("created_at, ai_platforms(id, slug, name, logo_url, category, is_published)").eq("user_id", user.id).order("created_at", { ascending: false }),
        admin.from("ai_platform_views").select("viewed_at, ai_platforms(id, slug, name, logo_url, category, is_published)").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(6),
        admin.from("ai_progress").select("stage, updated_at, ai_platforms(id, slug, name, logo_url, category, is_published)").eq("user_id", user.id).order("updated_at", { ascending: false }),
        admin.from("ai_assistance_requests").select("id, platform_name, status, challenge, staff_note, order_id, created_at, updated_at, platform_id, ai_platforms(slug)").eq("user_id", user.id).order("created_at", { ascending: false }),
        membership.active
            ? admin.from("ai_announcements").select("id, title, body, created_at, ai_platforms(name, slug)").eq("is_published", true).order("created_at", { ascending: false }).limit(5)
            : Promise.resolve({ data: [] as any[] }),
    ]);

    const live = (rows: any[] | null | undefined, key = "ai_platforms") => (rows ?? []).filter((r) => one(r[key])?.is_published);
    const savedRows = live(saved.data);
    const savedIds = new Set(savedRows.map((r) => one(r.ai_platforms).id));
    const progressRows = live(progress.data);
    const stageIndex = (s: string) => PROGRESS_STAGES.findIndex((x) => x.id === s);

    return (
        <div className="aio-wrap" style={{ padding: "56px 0 88px" }}>
            <span className="aio-eyebrow">Member dashboard</span>
            <h1 className="aio-h2" style={{ fontSize: "clamp(28px,4vw,42px)" }}>Your AI Opportunities.</h1>

            <section className="aio-grid c3" style={{ marginTop: 28 }} aria-label="Membership status">
                <div className="aio-card" style={{ gridColumn: "span 2" }}>
                    <span className="aio-num">MEMBERSHIP</span>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 12 }}>
                        <span className={`aio-badge ${membership.active ? "verified" : "under_review"}`}>{membership.active ? "Active" : membership.expiresAt ? "Expired" : "Not a member"}</span>
                        {membership.expiresAt && (
                            <span style={{ fontSize: 14, color: "var(--sc-fg-2)" }}>
                                {membership.active ? `Expires ${niceDate(membership.expiresAt)} · ${membership.daysLeft} day${membership.daysLeft === 1 ? "" : "s"} left` : `Expired ${niceDate(membership.expiresAt)}`}
                            </span>
                        )}
                    </div>
                    <div style={{ marginTop: 18 }}>
                        <MembershipButton label={membership.active ? `Renew — ${DISPLAY_MEMBERSHIP}` : membership.expiresAt ? `Renew — ${DISPLAY_MEMBERSHIP}` : `Become a Member — ${DISPLAY_MEMBERSHIP}`} className={membership.active ? "aio-btn ghost" : "aio-btn primary"} />
                    </div>
                </div>
                <div className="aio-card">
                    <span className="aio-num">QUICK LINKS</span>
                    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                        <Link href={`${AI_BASE}/platforms`} className="aio-btn ghost sm">Browse opportunities</Link>
                        <Link href={`${AI_BASE}/assistance`} className="aio-btn ghost sm">Request account assistance</Link>
                    </div>
                </div>
            </section>

            {membership.active && (news.data ?? []).length > 0 && (
                <section style={{ marginTop: 36 }} aria-label="Platform updates">
                    <h2 className="aio-h2" style={{ fontSize: 22 }}>Important platform updates</h2>
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                        {(news.data ?? []).map((n: any) => (
                            <div key={n.id} className="aio-card" style={{ padding: 18 }}>
                                <div style={{ fontSize: 11, color: "var(--sc-fg-4)" }}>{niceDate(n.created_at)}{one(n.ai_platforms)?.name ? ` · ${one(n.ai_platforms).name}` : ""}</div>
                                <h3 style={{ marginTop: 6, fontSize: 15 }}>{n.title}</h3>
                                <p style={{ whiteSpace: "pre-line" }}>{n.body}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {!membership.active && (
                <div className="aio-notice warn" style={{ marginTop: 28 }}>Saved platforms, progress tracking and member updates are available with an active membership.</div>
            )}

            {membership.active && (
                <>
                    <section style={{ marginTop: 40 }} aria-label="Progress tracker">
                        <h2 className="aio-h2" style={{ fontSize: 22 }}>Application progress tracker</h2>
                        <p style={{ fontSize: 13, color: "var(--sc-muted)", marginTop: 8, maxWidth: 680 }}>You record this yourself on each platform&apos;s page or here. Savanna cannot independently verify third-party acceptance, work or payments.</p>
                        {progressRows.length === 0 ? (
                            <div className="aio-card" style={{ marginTop: 16 }}><p>Nothing tracked yet. Open a platform and choose a stage under “My progress”.</p></div>
                        ) : (
                            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                                {progressRows.map((r) => {
                                    const p = one(r.ai_platforms);
                                    const idx = stageIndex(r.stage);
                                    return (
                                        <div key={p.id} className="aio-card" style={{ padding: 18 }}>
                                            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                                                <Link href={`${AI_BASE}/platforms/${p.slug}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                    <PlatformMark name={p.name} logoUrl={p.logo_url} />
                                                    <div><h3 style={{ fontSize: 15 }}>{p.name}</h3><div style={{ fontSize: 12, color: "var(--sc-green)" }}>{stageLabel(r.stage)} · self-reported</div></div>
                                                </Link>
                                                <PlatformActions platformId={p.id} saved={savedIds.has(p.id)} stage={r.stage} />
                                            </div>
                                            <div className="aio-track" aria-hidden="true">{PROGRESS_STAGES.map((s, i) => <span key={s.id} className={i <= idx ? "on" : ""} />)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section style={{ marginTop: 40 }} aria-label="Saved platforms">
                        <h2 className="aio-h2" style={{ fontSize: 22 }}>Saved platforms</h2>
                        {savedRows.length === 0 ? (
                            <div className="aio-card" style={{ marginTop: 16 }}><p>No saved platforms yet.</p></div>
                        ) : (
                            <div className="aio-grid c3" style={{ marginTop: 16 }}>
                                {savedRows.map((r) => {
                                    const p = one(r.ai_platforms);
                                    return (
                                        <Link key={p.id} href={`${AI_BASE}/platforms/${p.slug}`} className="aio-card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 16 }}>
                                            <PlatformMark name={p.name} logoUrl={p.logo_url} />
                                            <div><h3 style={{ fontSize: 15 }}>{p.name}</h3><div style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>{categoryLabel(p.category)}</div></div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section style={{ marginTop: 40 }} aria-label="Recently viewed">
                        <h2 className="aio-h2" style={{ fontSize: 22 }}>Recently viewed</h2>
                        {live(views.data).length === 0 ? (
                            <div className="aio-card" style={{ marginTop: 16 }}><p>Platforms you open will appear here.</p></div>
                        ) : (
                            <div className="aio-grid c3" style={{ marginTop: 16 }}>
                                {live(views.data).map((r) => {
                                    const p = one(r.ai_platforms);
                                    return (
                                        <Link key={p.id} href={`${AI_BASE}/platforms/${p.slug}`} className="aio-card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 16 }}>
                                            <PlatformMark name={p.name} logoUrl={p.logo_url} />
                                            <div><h3 style={{ fontSize: 15 }}>{p.name}</h3><div style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>Viewed {niceDate(r.viewed_at)}</div></div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}

            <section style={{ marginTop: 40, scrollMarginTop: 96 }} id="assistance" aria-label="Account assistance requests">
                <h2 className="aio-h2" style={{ fontSize: 22 }}>Account assistance requests</h2>
                {(requests.data ?? []).length === 0 ? (
                    <div className="aio-card" style={{ marginTop: 16 }}>
                        <p>No requests yet. Account assistance is a separate USD 15 service for one platform.</p>
                        <div style={{ marginTop: 14 }}><Link href={`${AI_BASE}/assistance`} className="aio-btn ghost sm">Request account assistance</Link></div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                        {(requests.data ?? []).map((r: any) => (
                            <div key={r.id} className="aio-card" style={{ padding: 18 }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                                    <h3 style={{ fontSize: 15 }}>{r.platform_name}</h3>
                                    <span className={`aio-badge ${r.status === "completed" ? "verified" : r.status === "cancelled" ? "under_review" : "conditional"}`}>{requestStatusLabel(r.status)}</span>
                                </div>
                                <p style={{ whiteSpace: "pre-line" }}>{r.challenge}</p>
                                {r.staff_note && <div className="aio-notice" style={{ marginTop: 12 }}><strong style={{ color: "var(--sc-text)" }}>Message from Savanna: </strong>{r.staff_note}</div>}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 14, fontSize: 12, color: "var(--sc-fg-4)" }}>
                                    <span>Submitted {niceDate(r.created_at)} · Updated {niceDate(r.updated_at)}</span>
                                    {r.status === "payment_pending" && r.order_id && (
                                        <>
                                            <Link href={`/checkout/${r.order_id}`} className="aio-btn gold sm">Pay USD 15</Link>
                                            <CancelRequestButton requestId={r.id} />
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div style={{ marginTop: 56 }}><Disclaimer /></div>
        </div>
    );
}
