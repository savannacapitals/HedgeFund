import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiMembership } from "@/lib/ai/membership";

/** SERVER ONLY. Small helpers shared by the /api/ai/* routes. */
export class ApiError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

export async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser(); // verified with Supabase, not just read from the cookie
    if (!user) throw new ApiError("Please sign in.", 401);
    return user;
}

export async function requireMember() {
    const user = await requireUser();
    const membership = await getAiMembership(user.id);
    if (!membership.active) throw new ApiError("An active AI Opportunities membership is required.", 403);
    return { user, membership };
}

export async function readJson(request: Request): Promise<any> {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? body : {};
    } catch {
        throw new ApiError("Invalid request.");
    }
}

export const isUuid = (v: any): v is string =>
    typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function json(data: any, status = 200) {
    return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function handle(err: any) {
    if (err instanceof ApiError) return json({ error: err.message }, err.status);
    console.error("AI Opportunities API error:", err?.message || err);
    return json({ error: "Something went wrong. Please try again." }, 500);
}

export { createAdminClient };
