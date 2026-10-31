import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** The one place that says who counts as staff. Used by the admin pages and the admin API. */
export const STAFF_ROLES = ["editor", "administrator"];

export interface StaffAccess {
    status: "anonymous" | "forbidden" | "ok";
    role?: string;
    userId?: string;
}

/**
 * SERVER ONLY. Checks the signed-in user against the profiles table.
 * Pass a shorter list (for example ["administrator"]) to make a page admin-only.
 */
export async function getStaffAccess(allowed: string[] = STAFF_ROLES): Promise<StaffAccess> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser(); // verified with Supabase, not just read from the cookie

    if (!user) return { status: "anonymous" };

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (!profile || !allowed.includes(profile.role)) return { status: "forbidden" };

    return { status: "ok", role: profile.role, userId: user.id };
}
