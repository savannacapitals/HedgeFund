import { NextResponse } from "next/server";
import { getStaffAccess } from "@/lib/auth/staff";
import { ADMIN_AREA_ROLES } from "@/lib/auth/roles";

/**
 * Tells the browser where a signed-in person should land.
 * Editors and administrators go to the admin dashboard; everyone else goes to the member dashboard.
 * This is only a convenience: /admin is still protected by its own server-side check.
 */
export async function GET() {
    const access = await getStaffAccess(ADMIN_AREA_ROLES);

    if (access.status === "anonymous") {
        return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const isStaff = access.status === "ok";
    return NextResponse.json(
        { isStaff, destination: isStaff ? "/admin/dashboard" : "/dashboard" },
        { headers: { "Cache-Control": "no-store" } }
    );
}
