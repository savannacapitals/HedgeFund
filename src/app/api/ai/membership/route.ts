import { handle, json, requireUser } from "@/lib/ai/server";
import { openMembershipOrder } from "@/lib/ai/membership-order";

export const dynamic = "force-dynamic";

// Starts (or renews) the membership purchase. The price comes from the server, never from the browser.
// Access is NOT granted here: it is granted only when the order is confirmed by a verified payment
// (Pochi SMS match, on-chain payment or an administrator reconciling it in /admin/orders).
export async function POST() {
    try {
        const user = await requireUser();
        const orderId = await openMembershipOrder(user.id);
        return json({ redirectTo: `/checkout/${orderId}` });
    } catch (err) {
        return handle(err);
    }
}
