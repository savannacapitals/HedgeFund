"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The sign-in area of the site header. Shows Dashboard and Sign out once signed in.
export default function AuthButtons() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [signedIn, setSignedIn] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
        return () => subscription.unsubscribe();
    }, [supabase]);

    async function handleSignOut(e: React.MouseEvent) {
        e.preventDefault();
        await supabase.auth.signOut();
        setSignedIn(false);
        router.push("/");
        router.refresh();
    }

    if (signedIn) {
        return (
            <>
                <a href="/dashboard" className="sign-in-link">Dashboard</a>
                <a href="/" onClick={handleSignOut} className="header-cta">Sign out</a>
            </>
        );
    }

    return (
        <>
            <a href="/login" className="sign-in-link">Sign in</a>
            <a href="/register" className="header-cta">Get started <span>↗</span></a>
        </>
    );
}
