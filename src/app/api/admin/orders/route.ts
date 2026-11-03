import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";
import { completeOrder } from "@/lib/payments/fulfil";

/**
 * Order reconciliation. Administrators and finance operators only.
 * Every action needs a written reason and is saved to the audit log.
 * NOTE: "refund" records the refund and removes course access. It does not send money back;
 * return the funds from your own wallet or exchange.
 */

const STATUSES = ["pending", "confirmed", "failed", "refunded"];

export async function GET(request: Request) {
    try {
        const { admin } = await requireRole(SECTION_ROLES.orders);
        const url = new URL(request.url);

        let query = admin
            .from("orders")
            .select("id, user_id, course_id, kind, total_amount, currency, status, created_at, updated_at")
            .order("created_at", { ascending: false })
            .limit(300);
        const status = url.searchParams.get("status");
        if (status && STATUSES.includes(status)) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) throw dbError(error);

        const ids = (data ?? []).map((o) => o.id);

        // Looked up separately (not embedded) so this page keeps working even if the database
        // relationship between orders and profiles/courses is missing or the API cache is stale.
        const userIds = Array.from(new Set((data ?? []).map((o: any) => o.user_id).filter(Boolean)));
        const courseIds = Array.from(new Set((data ?? []).map((o: any) => o.course_id).filter(Boolean)));
        const profileById = new Map<string, any>();
        const courseById = new Map<string, any>();
        if (userIds.length) {
            const { data: profs } = await admin.from("profiles").select("id, email, full_name").in("id", userIds);
            for (const p of profs ?? []) profileById.set(p.id, p);
        }
        if (courseIds.length) {
            const { data: crs } = await admin.from("courses").select("id, title").in("id", courseIds);
            for (const c of crs ?? []) courseById.set(c.id, c);
        }

        const latestPayment = new Map<string, any>();
        if (ids.length) {
            const { data: pays } = await admin
                .from("payments")
                .select("order_id, status, paid_network, paid_token, paid_at, created_at")
                .in("order_id", ids)
                .order("created_at", { ascending: false });
            for (const p of pays ?? []) if (!latestPayment.has(p.order_id)) latestPayment.set(p.order_id, p);

            // Pochi la Biashara and bank-transfer payments: the newest of either kind is shown
            const { data: manual } = await admin
                .from("manual_payments")
                .select("order_id, method, status, provider_ref, payer_name, reference, amount, currency, paid_at, created_at")
                .in("order_id", ids)
                .order("created_at", { ascending: false });
            const seen = new Set<string>();
            for (const m of manual ?? []) {
                if (seen.has(m.order_id)) continue;
                seen.add(m.order_id);
                const existing = latestPayment.get(m.order_id);
                if (existing && new Date(existing.created_at) > new Date(m.created_at)) continue;
                const name = m.method === "pochi" ? "Pochi la Biashara" : "Bank transfer";
                latestPayment.set(m.order_id, {
                    order_id: m.order_id,
                    status: m.status,
                    paid_at: m.paid_at,
                    created_at: m.created_at,
                    label: `${m.status} · ${name} · ${Number(m.amount).toLocaleString("en-KE")} ${m.currency}${
                        m.provider_ref ? ` · code/ref ${m.provider_ref}` : " · no code yet"
                    }${m.payer_name ? ` · ${m.payer_name}` : ""} · ${m.reference}`,
                });
            }
        }

        const orders = (data ?? []).map((o: any) => {
            const pay = latestPayment.get(o.id);
            return {
                id: o.id,
                status: o.status,
                total_amount: Number(o.total_amount),
                currency: o.currency,
                created_at: o.created_at,
                updated_at: o.updated_at,
                customer: profileById.get(o.user_id)?.email || "unknown",
                customerName: profileById.get(o.user_id)?.full_name || null,
                course:
                    courseById.get(o.course_id)?.title ||
                    ({ ai_membership: "AI Opportunities · Membership", ai_assistance: "AI Opportunities · Account assistance", community: "Killzone Journal" } as Record<string, string>)[o.kind] ||
                    null,
                payment: pay
                    ? { status: pay.status, network: pay.paid_network, token: pay.paid_token, paidAt: pay.paid_at, label: pay.label ?? null }
                    : null,
            };
        });
        return ok({ orders });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.orders);

        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }
        if (!["confirm", "fail", "refund"].includes(body.action)) throw new HttpError("Unknown action.");

        const note = text(body.note, "Reason", { max: 500, required: true });
        if (note.length < 5) throw new HttpError("Please write a short reason (at least 5 characters).");

        const { data: order } = await admin
            .from("orders")
            .select("id, user_id, course_id, status, total_amount, currency")
            .eq("id", body.orderId)
            .maybeSingle();
        if (!order) throw new HttpError("Order not found.", 404);

        const { data: profile } = await admin.from("profiles").select("email").eq("id", order.user_id).maybeSingle();
        const email = profile?.email || "unknown";
        const label = `Order ${order.id.slice(0, 8)} (${Number(order.total_amount).toFixed(2)} ${order.currency}, ${email})`;
        const now = new Date().toISOString();

        if (body.action === "confirm") {
            if (order.status !== "pending") throw new HttpError(`Only pending orders can be confirmed (this one is ${order.status}).`, 409);
            const result = await completeOrder(order.id);
            if (!result.ok) throw new HttpError(result.message || "Could not confirm the order.", 422);
            // Pochi / bank payments: the admin has seen the money, so close the open manual payment as paid
            await admin
                .from("manual_payments")
                .update({ status: "succeeded", paid_at: now, updated_at: now })
                .eq("order_id", order.id)
                .in("status", ["awaiting", "submitted"]);
            await logAudit(admin, { actorId: userId, action: "ORDER_RECONCILE", target: label, details: { note } });
            return ok({ success: true });
        }

        if (body.action === "fail") {
            if (order.status !== "pending") throw new HttpError(`Only pending orders can be marked failed (this one is ${order.status}).`, 409);
            const { error } = await admin.from("orders").update({ status: "failed", updated_at: now }).eq("id", order.id).eq("status", "pending");
            if (error) throw dbError(error);
            // Close any open payment so its amount can be reused
            await admin.from("payments").update({ status: "expired", updated_at: now }).eq("order_id", order.id).eq("status", "pending");
            await admin.from("manual_payments").update({ status: "expired", updated_at: now }).eq("order_id", order.id).in("status", ["awaiting", "submitted"]);
            // An unpaid assistance request has nothing left to wait for
            await admin.from("ai_assistance_requests").update({ status: "cancelled", updated_at: now }).eq("order_id", order.id).eq("status", "payment_pending");
            await logAudit(admin, { actorId: userId, action: "ORDER_FAIL", target: label, details: { note } });
            return ok({ success: true });
        }

        // refund
        if (order.status !== "confirmed") throw new HttpError(`Only confirmed orders can be refunded (this one is ${order.status}).`, 409);
        const { error } = await admin.from("orders").update({ status: "refunded", updated_at: now }).eq("id", order.id).eq("status", "confirmed");
        if (error) throw dbError(error);
        if (order.course_id) {
            await admin
                .from("course_enrolments")
                .update({ status: "revoked" })
                .eq("user_id", order.user_id)
                .eq("course_id", order.course_id);
        }
        await logAudit(admin, { actorId: userId, action: "ORDER_REFUND", target: label, details: { note } });
        return ok({ success: true });
    } catch (err) {
        return fail(err);
    }
}
