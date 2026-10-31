import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase login session fresh on every request.
// Without this, a session older than about an hour can stop working on server pages
// (including the /admin pages) until the user signs in again.
export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return response;

    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });

    try {
        await supabase.auth.getUser();
    } catch (err) {
        // If Supabase is unreachable the page should still load
        console.error("Session refresh failed:", err);
    }

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
