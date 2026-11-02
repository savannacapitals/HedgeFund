import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";

/**
 * Membership records and headline statistics.
 * Viewing: editors and administrators. Granting or revoking free access: administrators only.
 * Paid memberships are never created here: they come only from a confirmed order.
 */

export async function GET() {
    try {
        const { admin } = await requireRole(SECTION_ROLES.ai);
        const nowIso = new Date().toISOString();
        const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

        const { data: periods, error } = await admin
            .from("ai_membership_periods")
            .select("order_id, user_id, starts_at, ends_at, created_at, orders!inner(status), profiles(email, full_name)")
            .order("ends_at", { ascending: false })
            .limit(500);
        if (error) throw dbError(error);

        const { data: grants } = await admin
            .from("ai_membership_grants")
            .select("id, user_id, ends_at, note, revoked, created_at, profiles!ai_membership_grants_user_id_fkey(email, full_name)")
            .order("created_at", { ascending: false })
            .limit(200);

        const one = (v: any) => (Array.isArray(v) ? v[0] : v);
        const byUser = new Map<string, any>();
        for (const p of periods ?? []) {
            const confirmed = one((p as any).orders)?.status === "confirmed";
            const row = byUser.get(p.user_id) ?? {
                userId: p.user_id,
                email: one((p as any).profiles)?.email || "unknown",
                name: one((p as any).profiles)?.full_name || null,
                paidPeriods: 0,
                expiresAt: null as string | null,
            };
            if (confirmed) {
                row.paidPeriods += 1;
                if (!row.expiresAt || p.ends_at > row.expiresAt) row.expiresAt = p.ends_at;
            }
            byUser.set(p.user_id, row);
        }
        const members = [...byUser.values()].filter((m) => m.expiresAt).sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1));

        const activeGrantUsers = (grants ?? []).filter((g: any) => !g.revoked && g.ends_at > nowIso).map((g: any) => g.user_id);
        const activeUsers = new Set([...members.filter((m) => m.expiresAt > nowIso).map((m) => m.userId), ...activeGrantUsers]);
        const expiring = new Set([
            ...members.filter((m) => m.expiresAt > nowIso && m.expiresAt <= in7).map((m) => m.userId),
            ...(grants ?? []).filter((g: any) => !g.revoked && g.ends_at > nowIso && g.ends_at <= in7).map((g: any) => g.user_id),
        ]);

        const countBy = async (table: string, column: string, values: string[]) => {
            const out: Record<string, number> = {};
            for (const v of values) {
                const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, v);
                out[v] = count ?? 0;
            }
            return out;
        };
        const requestCounts = await countBy("ai_assistance_requests", "status", ["payment_pending", "request_received", "in_progress", "awaiting_customer", "completed", "cancelled"]);
        const platformCounts = await countBy("ai_platforms", "verification_status", ["verified", "conditional", "restricted", "under_review"]);
        const { count: paidCount } = await admin.from("ai_membership_periods").select("order_id", { count: "exact", head: true });

        return ok({
            stats: { activeMembers: activeUsers.size, expiringIn7Days: expiring.size, paidMembershipPeriods: paidCount ?? 0, requests: requestCounts, platforms: platformCounts },
            members: members.slice(0, 200),
            grants: (grants ?? []).map((g: any) => ({ id: g.id, email: one(g.profiles)?.email || "unknown", endsAt: g.ends_at, note: g.note, revoked: g.revoked })),
        });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId, isAdmin } = await requireRole(SECTION_ROLES.ai);
        if (!isAdmin) throw new HttpError("Only administrators can grant or revoke free access.", 403);
        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }

        if (body.action === "revoke") {
            const note = text(body.note, "Reason", { max: 300, required: true });
            const { error } = await admin.from("ai_membership_grants").update({ revoked: true }).eq("id", body.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "AI_MEMBERSHIP_REVOKE", target: String(body.id).slice(0, 8), details: { note } });
            return ok({ success: true });
        }
        if (body.action !== "grant") throw new HttpError("Unknown action.");

        const email = text(body.email, "Email", { max: 200, required: true }).toLowerCase();
        const note = text(body.note, "Reason", { max: 300, required: true });
        const days = Number(body.days);
        if (!Number.isInteger(days) || days < 1 || days > 365) throw new HttpError("Days must be a whole number from 1 to 365.");

        const { data: profile } = await admin.from("profiles").select("id, email").ilike("email", email).maybeSingle();
        if (!profile) throw new HttpError("No registered user has that email. They need to sign up first.", 404);

        const { error } = await admin.from("ai_membership_grants").insert({
            user_id: profile.id,
            ends_at: new Date(Date.now() + days * 86_400_000).toISOString(),
            note,
            granted_by: userId,
        });
        if (error) throw dbError(error);
        await logAudit(admin, { actorId: userId, action: "AI_MEMBERSHIP_GRANT", target: profile.email, details: { days, note } });
        return ok({ success: true });
    } catch (err) {
        return fail(err);
    }
}
