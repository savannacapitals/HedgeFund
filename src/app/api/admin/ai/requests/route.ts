import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";
import { REQUEST_STATUSES } from "@/lib/ai/config";

/** Account assistance requests. Editors and administrators. */

export async function GET() {
    try {
        const { admin } = await requireRole(SECTION_ROLES.ai);
        const { data, error } = await admin
            .from("ai_assistance_requests")
            .select("*, profiles(email, full_name), orders(status, total_amount, currency)")
            .order("created_at", { ascending: false })
            .limit(300);
        if (error) throw dbError(error);
        const one = (v: any) => (Array.isArray(v) ? v[0] : v);
        return ok({
            requests: (data ?? []).map((r: any) => ({
                id: r.id,
                platform: r.platform_name,
                challenge: r.challenge,
                contact: r.contact_preference,
                status: r.status,
                staffNote: r.staff_note,
                internalNote: r.internal_note,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                customer: one(r.profiles)?.email || "unknown",
                customerName: one(r.profiles)?.full_name || null,
                orderStatus: one(r.orders)?.status || null,
            })),
        });
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
        if (!REQUEST_STATUSES.some((s) => s.id === body.status)) throw new HttpError("Choose a status.");

        const { data: row } = await admin
            .from("ai_assistance_requests")
            .select("id, status, platform_name, order_id, orders(status)")
            .eq("id", body.id)
            .maybeSingle();
        if (!row) throw new HttpError("Request not found.", 404);

        // Work must not start on money that has not been confirmed
        const orderStatus = (Array.isArray((row as any).orders) ? (row as any).orders[0] : (row as any).orders)?.status;
        const needsPayment = ["request_received", "in_progress", "awaiting_customer", "completed"].includes(body.status);
        if (needsPayment && orderStatus !== "confirmed") {
            throw new HttpError("This request's payment is not confirmed yet. Confirm the order in Orders first.", 409);
        }
        if (body.status === "payment_pending" && orderStatus === "confirmed") {
            throw new HttpError("The payment is already confirmed, so this cannot go back to Payment Pending.", 409);
        }

        const update = {
            status: body.status,
            staff_note: text(body.staffNote, "Note to customer", { max: 1500 }) || null,
            internal_note: text(body.internalNote, "Internal note", { max: 3000 }) || null,
            updated_at: new Date().toISOString(),
        };
        const { error } = await admin.from("ai_assistance_requests").update(update).eq("id", row.id);
        if (error) throw dbError(error);

        await logAudit(admin, {
            actorId: userId,
            action: "AI_ASSISTANCE_UPDATE",
            target: `${row.platform_name} request ${row.id.slice(0, 8)}`,
            details: { from: row.status, to: body.status },
        });
        return ok({ success: true });
    } catch (err) {
        return fail(err);
    }
}
