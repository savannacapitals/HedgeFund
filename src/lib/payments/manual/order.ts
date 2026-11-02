import { createClient } from "@/lib/supabase/server";
import { ManualPaymentError } from "@/lib/payments/manual/config";

/** The signed-in user's own pending order. Row-level security only returns orders that belong to them. */
export async function loadPayableOrder(orderId: string | null | undefined) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ManualPaymentError("Please sign in.", 401);
    if (!orderId) throw new ManualPaymentError("Missing order.", 400);

    const { data: order } = await supabase
        .from("orders")
        .select("id, user_id, total_amount, currency, status")
        .eq("id", orderId)
        .maybeSingle();

    if (!order) throw new ManualPaymentError("Order not found.", 404);
    if (order.status !== "pending") throw new ManualPaymentError("This order is not awaiting payment.", 409);
    return { user, order };
}
