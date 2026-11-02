import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";

/** Announcements shown to members on their dashboard. */

export async function GET() {
    try {
        const { admin } = await requireRole(SECTION_ROLES.ai);
        const { data, error } = await admin
            .from("ai_announcements")
            .select("id, title, body, platform_id, is_published, created_at, ai_platforms(name)")
            .order("created_at", { ascending: false })
            .limit(100);
        if (error) throw dbError(error);
        return ok({ announcements: data ?? [] });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.ai);
        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }

        if (body.action === "delete") {
            const { error } = await admin.from("ai_announcements").delete().eq("id", body.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "AI_ANNOUNCEMENT_DELETE", target: String(body.id).slice(0, 8) });
            return ok({ success: true });
        }
        if (body.action === "toggle") {
            const { error } = await admin.from("ai_announcements").update({ is_published: !!body.is_published }).eq("id", body.id);
            if (error) throw dbError(error);
            return ok({ success: true });
        }
        if (body.action !== "create") throw new HttpError("Unknown action.");

        const title = text(body.title, "Title", { max: 140, required: true });
        const message = text(body.body, "Message", { max: 2000, required: true });
        const { error } = await admin.from("ai_announcements").insert({
            title,
            body: message,
            platform_id: body.platform_id || null,
            is_published: true,
            created_by: userId,
        });
        if (error) throw dbError(error);
        await logAudit(admin, { actorId: userId, action: "AI_ANNOUNCEMENT_CREATE", target: title });
        return ok({ success: true });
    } catch (err) {
        return fail(err);
    }
}
