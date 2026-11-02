import { ApiError, createAdminClient, handle, isUuid, json, readJson, requireUser } from "@/lib/ai/server";

export const dynamic = "force-dynamic";

// A customer can withdraw a request only while it is still unpaid.
export async function POST(request: Request) {
    try {
        const user = await requireUser();
        const body = await readJson(request);
        if (!isUuid(body.requestId)) throw new ApiError("Missing request.");

        const admin = createAdminClient();
        const { data: row } = await admin
            .from("ai_assistance_requests")
            .select("id, order_id, status")
            .eq("id", body.requestId)
            .eq("user_id", user.id)
            .maybeSingle();
        if (!row) throw new ApiError("Request not found.", 404);
        if (row.status !== "payment_pending") throw new ApiError("Only unpaid requests can be cancelled here. Contact support for anything else.", 409);

        const now = new Date().toISOString();
        await admin.from("ai_assistance_requests").update({ status: "cancelled", updated_at: now }).eq("id", row.id).eq("status", "payment_pending");
        if (row.order_id) {
            await admin.from("orders").update({ status: "failed", updated_at: now }).eq("id", row.order_id).eq("status", "pending");
            await admin.from("manual_payments").update({ status: "expired", updated_at: now }).eq("order_id", row.order_id).eq("status", "awaiting");
        }
        return json({ success: true });
    } catch (err) {
        return handle(err);
    }
}
