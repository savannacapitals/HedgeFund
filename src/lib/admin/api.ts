import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** SERVER ONLY. Shared plumbing for the /api/admin/* routes. */

export class HttpError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

/** Throws unless the signed-in person has one of the allowed roles. */
export async function requireRole(allowed: readonly string[]) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new HttpError("Please sign in.", 401);

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !allowed.includes(profile.role)) {
        throw new HttpError("You do not have access to this area.", 403);
    }
    return { admin, userId: user.id, role: profile.role as string, isAdmin: profile.role === "administrator" };
}

export function ok(data: any) {
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export function fail(err: any) {
    if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export function dbError(error: any) {
    if (error?.code === "23505") return new HttpError("That value is already in use.", 409);
    console.error("Database error:", error);
    return new HttpError(error?.message || "Database error.", 500);
}

export function text(value: any, label: string, { max, required = false }: { max: number; required?: boolean }) {
    const v = typeof value === "string" ? value.trim() : "";
    if (required && !v) throw new HttpError(`${label} is required.`);
    if (v.length > max) throw new HttpError(`${label} is too long (max ${max} characters).`);
    return v;
}
