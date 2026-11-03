import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSummary } from "@/components/ai/PlatformCard";
import { freePlatformLimit } from "@/lib/ai/config";

/** SERVER ONLY. Read helpers for the AI Opportunities pages. They never throw: a missing database just shows an empty directory. */

const SUMMARY = "id, slug, name, logo_url, short_description, category, official_url, verification_status, kenya_eligibility, last_verified, is_featured, created_at";

export async function listPlatforms(): Promise<(PlatformSummary & { official_url: string | null; created_at: string })[]> {
    try {
        const { data } = await createAdminClient().from("ai_platforms").select(SUMMARY).eq("is_published", true).order("name", { ascending: true });
        return (data ?? []) as any;
    } catch (err: any) {
        console.error("AI platforms list failed:", err?.message);
        return [];
    }
}

export async function getPlatformBySlug(slug: string) {
    try {
        const { data } = await createAdminClient().from("ai_platforms").select(SUMMARY).eq("slug", slug).eq("is_published", true).maybeSingle();
        return (data as any) ?? null;
    } catch {
        return null;
    }
}

/** Members-only. Call it only after getAiMembership() says active. */
export async function getGuide(platformId: string) {
    const admin = createAdminClient();
    const { data } = await admin.from("ai_platform_guides").select("*").eq("platform_id", platformId).maybeSingle();
    return (data as any) ?? null;
}

export async function getSignedInUser() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}


type Listed = PlatformSummary & { official_url: string | null; created_at: string };

/** The free sample: featured platforms first, then the oldest listings. Stable, so the same platforms are always free. */
function rankForSample(all: Listed[]): Listed[] {
    return [...all].sort((a, b) => {
        const f = Number(!!b.is_featured) - Number(!!a.is_featured);
        if (f) return f;
        if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

export async function getFreePlatformIds(): Promise<string[]> {
    return rankForSample(await listPlatforms()).slice(0, freePlatformLimit()).map((p) => p.id);
}

export interface ViewerDirectory {
    /** Only what this visitor is allowed to see. Hidden platforms never leave the server. */
    visible: Listed[];
    /** Hidden platforms reduced to their category: no name, slug or details. */
    lockedCategories: string[];
    /** Totals across the whole directory (numbers only). */
    totals: { all: number; verified: number; kenya: number; byCategory: Record<string, number> };
    limit: number;
}

export async function listPlatformsForViewer(isMember: boolean): Promise<ViewerDirectory> {
    const all = await listPlatforms();
    const limit = freePlatformLimit();
    const byCategory: Record<string, number> = {};
    for (const p of all) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    const totals = {
        all: all.length,
        verified: all.filter((p) => p.verification_status === "verified").length,
        kenya: all.filter((p) => p.kenya_eligibility === "yes" || p.kenya_eligibility === "conditional").length,
        byCategory,
    };
    if (isMember) return { visible: all, lockedCategories: [], totals, limit };

    const ranked = rankForSample(all);
    const freeIds = new Set(ranked.slice(0, limit).map((p) => p.id));
    return {
        visible: all.filter((p) => freeIds.has(p.id)),
        lockedCategories: ranked.slice(limit).map((p) => p.category),
        totals,
        limit,
    };
}
