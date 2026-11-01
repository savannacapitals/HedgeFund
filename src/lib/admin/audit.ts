import { headers } from "next/headers";

/**
 * SERVER ONLY. Adds one row to the append-only audit_events table.
 * Best effort: if it fails the error is logged, and the action that already happened is not undone.
 * metadata.target is what the dashboard shows in the TARGET column.
 */
export async function logAudit(
    admin: any,
    entry: { actorId: string; action: string; target: string; details?: Record<string, any> }
) {
    try {
        const h = await headers();
        const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;

        const { error } = await admin.from("audit_events").insert({
            actor_id: entry.actorId,
            action: entry.action,
            metadata: { target: entry.target, ...(entry.details || {}) },
            ip_address: ip,
        });
        if (error) console.error("Audit log write failed:", error.message);
    } catch (err) {
        console.error("Audit log write failed:", err);
    }
}
