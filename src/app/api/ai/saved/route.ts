import { ApiError, createAdminClient, handle, isUuid, json, readJson, requireMember } from "@/lib/ai/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { user } = await requireMember();
        const body = await readJson(request);
        if (!isUuid(body.platformId)) throw new ApiError("Missing platform.");
        const admin = createAdminClient();

        if (body.saved === false) {
            await admin.from("ai_saved_platforms").delete().eq("user_id", user.id).eq("platform_id", body.platformId);
            return json({ saved: false });
        }
        const { data: platform } = await admin.from("ai_platforms").select("id").eq("id", body.platformId).eq("is_published", true).maybeSingle();
        if (!platform) throw new ApiError("Platform not found.", 404);
        const { error } = await admin
            .from("ai_saved_platforms")
            .upsert({ user_id: user.id, platform_id: platform.id }, { onConflict: "user_id,platform_id", ignoreDuplicates: true });
        if (error) throw error;
        return json({ saved: true });
    } catch (err) {
        return handle(err);
    }
}
