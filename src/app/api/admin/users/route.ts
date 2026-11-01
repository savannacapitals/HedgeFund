import { ALL_ROLES, SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";

/** Users and roles. Administrators only. Roles can only be changed here (or in the SQL editor). */

const cleanSearch = (q: string) => q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);

export async function GET(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.users);
        const url = new URL(request.url);

        let query = admin
            .from("profiles")
            .select("id, email, full_name, role, created_at")
            .order("created_at", { ascending: false })
            .limit(200);
        const role = url.searchParams.get("role");
        if (role && (ALL_ROLES as readonly string[]).includes(role)) query = query.eq("role", role);
        const q = cleanSearch(url.searchParams.get("q") || "");
        if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);

        const [{ data, error }, ...counts] = await Promise.all([
            query,
            ...ALL_ROLES.map((r) => admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", r)),
        ]);
        if (error) throw dbError(error);

        const roleCounts: Record<string, number> = {};
        ALL_ROLES.forEach((r, i) => (roleCounts[r] = counts[i].count ?? 0));

        return ok({ users: data ?? [], roleCounts, me: userId });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.users);

        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }
        if (body.action !== "set_role") throw new HttpError("Unknown action.");

        const newRole = String(body.role || "");
        if (!(ALL_ROLES as readonly string[]).includes(newRole)) throw new HttpError("Unknown role.");
        if (body.userId === userId) {
            throw new HttpError("You cannot change your own role. Ask another administrator.", 403);
        }

        const { data: target } = await admin.from("profiles").select("id, email, role").eq("id", body.userId).maybeSingle();
        if (!target) throw new HttpError("User not found.", 404);
        if (target.role === newRole) return ok({ success: true, unchanged: true });

        // Never leave the site without an administrator
        if (target.role === "administrator") {
            const { count } = await admin
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .eq("role", "administrator");
            if ((count ?? 0) <= 1) throw new HttpError("There must always be at least one administrator.", 409);
        }

        const { error } = await admin
            .from("profiles")
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq("id", target.id);
        if (error) throw dbError(error);

        await logAudit(admin, {
            actorId: userId,
            action: "ROLE_CHANGE",
            target: `${target.email}: ${target.role} -> ${newRole}`,
            details: { userId: target.id, from: target.role, to: newRole },
        });
        return ok({ success: true });
    } catch (err) {
        return fail(err);
    }
}
