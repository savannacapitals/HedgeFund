"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The sign-in area of the site header. Shows Dashboard and Sign out once signed in.
export default function AuthButtons() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [signedIn, setSignedIn] = useState(false);
    const [isStaff, setIsStaff] = useState(false);

    // Ask the server whether this person is staff, so the Admin link only shows for them.
    async function checkStaff() {
        try {
            const res = await fetch("/api/auth/landing", { cache: "no-store" });
            setIsStaff(res.ok ? !!(await res.json()).isStaff : false);
        } catch {
            setIsStaff(false);
        }
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setSignedIn(!!data.user);
            if (data.user) checkStaff();
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSignedIn(!!session);
            if (session) checkStaff();
            else setIsStaff(false);
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    async function handleSignOut(e: React.MouseEvent) {
        e.preventDefault();
        await supabase.auth.signOut();
        setSignedIn(false);
        setIsStaff(false);
        router.push("/");
        router.refresh();
    }

    if (signedIn) {
        return (
            <>
                {isStaff && <a href="/admin/dashboard" className="sign-in-link">Admin</a>}
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
