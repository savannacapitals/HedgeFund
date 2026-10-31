import { createClient } from "@supabase/supabase-js";

/**
 * SERVER ONLY. Uses the service role key, which bypasses row-level security.
 * Never import this file from a "use client" component or a page that runs in the browser.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error("Supabase admin credentials are not configured.");
    }

    return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
