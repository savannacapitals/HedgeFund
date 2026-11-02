import { ApiError, createAdminClient, handle, isUuid, json, readJson, requireUser } from "@/lib/ai/server";
import { assistancePriceUsd } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

// Words that suggest the customer is about to paste a secret. Savanna never needs these.
const SECRET_HINT = /\b(password|passcode|passwd|otp|one[- ]time (code|pin)|verification code|pin\b|cvv|card number|secret key|seed phrase)\b\s*(is|:|=)/i;

// Creates an assistance request and its USD order, then sends the customer to the normal checkout.
export async function POST(request: Request) {
    try {
        const user = await requireUser();
        const body = await readJson(request);

        const challenge = typeof body.challenge === "string" ? body.challenge.trim() : "";
        if (challenge.length < 10) throw new ApiError("Please describe your challenge in at least 10 characters.");
        if (challenge.length > 2000) throw new ApiError("Please keep the description under 2000 characters.");
        if (SECRET_HINT.test(challenge)) {
            throw new ApiError(
                "Please remove passwords, one-time codes and PINs from your message. Savanna never needs them and never stores them."
            );
        }
        const contact = typeof body.contactPreference === "string" ? body.contactPreference.trim().slice(0, 200) : "";
        if (body.acknowledged !== true) {
            throw new ApiError("Please confirm that you understand what the fee covers.");
        }
        if (!isUuid(body.platformId)) throw new ApiError("Please choose a platform.");

        const admin = createAdminClient();
        const { data: platform } = await admin
            .from("ai_platforms")
            .select("id, name")
            .eq("id", body.platformId)
            .eq("is_published", true)
            .maybeSingle();
        if (!platform) throw new ApiError("That platform is not available.", 404);

        // One unpaid request per platform: send them back to its checkout
        const { data: existing } = await admin
            .from("ai_assistance_requests")
            .select("id, order_id")
            .eq("user_id", user.id)
            .eq("platform_id", platform.id)
            .eq("status", "payment_pending")
            .maybeSingle();
        if (existing?.order_id) return json({ redirectTo: `/checkout/${existing.order_id}` });

        const { count } = await admin
            .from("ai_assistance_requests")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "payment_pending");
        if ((count ?? 0) >= 5) throw new ApiError("You have several unpaid requests. Please finish or cancel one first.", 429);

        const { data: order, error: orderError } = await admin
            .from("orders")
            .insert({ user_id: user.id, kind: "ai_assistance", total_amount: assistancePriceUsd(), currency: "USD", status: "pending" })
            .select("id")
            .single();
        if (orderError || !order) throw new Error(orderError?.message || "Could not create the order.");

        const { error } = await admin.from("ai_assistance_requests").insert({
            user_id: user.id,
            platform_id: platform.id,
            platform_name: platform.name,
            challenge,
            contact_preference: contact || null,
            order_id: order.id,
            status: "payment_pending",
        });
        if (error) {
            // Do not leave a payable order that has no request behind it
            await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
            throw new Error(error.message);
        }
        return json({ redirectTo: `/checkout/${order.id}` });
    } catch (err) {
        return handle(err);
    }
}
