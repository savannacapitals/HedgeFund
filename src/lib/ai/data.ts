import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSummary } from "@/components/ai/PlatformCard";

/** SERVER ONLY. Read helpers for the AI Opportunities pages. They never throw: a missing database just shows an empty directory. */

const SUMMARY = "id, slug, name, logo_url, short_description, category, official_url, verification_status, kenya_eligibility, last_verified, is_featured, created_at";

export async function listPlatforms(): Promise<(PlatformSummary & { official_url: string | null; created_at: string })[]> {
    try {
        const supabase = await createClient();
        const { data } = await supabase.from("ai_platforms").select(SUMMARY).eq("is_published", true).order("name", { ascending: true });
        return (data ?? []) as any;
    } catch (err: any) {
        console.error("AI platforms list failed:", err?.message);
        return [];
    }
}

export async function getPlatformBySlug(slug: string) {
    try {
        const supabase = await createClient();
        const { data } = await supabase.from("ai_platforms").select(SUMMARY).eq("slug", slug).eq("is_published", true).maybeSingle();
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
