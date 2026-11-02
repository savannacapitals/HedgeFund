import { ApiError, createAdminClient, handle, isUuid, json, readJson, requireMember } from "@/lib/ai/server";
import { PROGRESS_STAGES } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

// Self-reported progress. Savanna does not (and cannot) verify hiring or payment outcomes with third parties.
export async function POST(request: Request) {
    try {
        const { user } = await requireMember();
        const body = await readJson(request);
        if (!isUuid(body.platformId)) throw new ApiError("Missing platform.");
        const admin = createAdminClient();

        if (body.stage === null) {
            await admin.from("ai_progress").delete().eq("user_id", user.id).eq("platform_id", body.platformId);
            return json({ stage: null });
        }
        if (!PROGRESS_STAGES.some((s) => s.id === body.stage)) throw new ApiError("Unknown stage.");

        const { data: platform } = await admin.from("ai_platforms").select("id").eq("id", body.platformId).eq("is_published", true).maybeSingle();
        if (!platform) throw new ApiError("Platform not found.", 404);

        const { error } = await admin
            .from("ai_progress")
            .upsert({ user_id: user.id, platform_id: platform.id, stage: body.stage, updated_at: new Date().toISOString() }, { onConflict: "user_id,platform_id" });
        if (error) throw error;
        return json({ stage: body.stage });
    } catch (err) {
        return handle(err);
    }
}
