import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, STATUSES } from "@/lib/ai/config";
import { getSignedInUser, listPlatformsForViewer } from "@/lib/ai/data";
import { getAiMembership } from "@/lib/ai/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import Directory from "@/components/ai/Directory";
import Disclaimer from "@/components/ai/Disclaimer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Platform Directory | Savanna AI Opportunities" };

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const { category } = await searchParams;
    const initialCategory = CATEGORIES.some((c) => c.id === category) ? category : "all";
    const user = await getSignedInUser();
    const membership = user ? await getAiMembership(user.id).catch(() => null) : null;
    const { visible: platforms, lockedCategories } = await listPlatformsForViewer(!!membership?.active);
    let savedIds: string[] = [];
    if (user) {
        const { data } = await createAdminClient().from("ai_saved_platforms").select("platform_id").eq("user_id", user.id);
        savedIds = (data ?? []).map((r: any) => r.platform_id);
    }
    return (
        <div className="aio-wrap" style={{ padding: "64px 0 80px" }}>
            <Link href="/ai-opportunities" style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← AI Opportunities</Link>
            <span className="aio-eyebrow" style={{ display: "block", marginTop: 20 }}>Platform directory</span>
            <h1 className="aio-h2" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>Researched AI work platforms.</h1>
            <p className="aio-lede">
                These are research targets, not endorsements. A platform listed here is not confirmed to accept Kenyan applicants unless its status says so. Free visitors can see a sample of the directory; membership unlocks every platform and its detailed guide.
            </p>

            <div className="aio-grid c4" style={{ marginTop: 26 }}>
                {STATUSES.map((s) => (
                    <div key={s.id} className="aio-card" style={{ padding: 16 }}>
                        <span className={`aio-badge ${s.id}`}>{s.label}</span>
                        <p style={{ marginTop: 10, fontSize: 12.5 }}>{s.help}</p>
                    </div>
                ))}
            </div>

            <Directory platforms={platforms as any} savedIds={savedIds} initialCategory={initialCategory} lockedCategories={lockedCategories} signedIn={!!user} />
            <div style={{ marginTop: 48 }}><Disclaimer /></div>
        </div>
    );
}
