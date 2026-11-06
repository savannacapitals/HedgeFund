"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardShell, { type ShellNavItem } from "@/components/dashboard/DashboardShell";

const MEMBER_NAV: ShellNavItem[] = [
    { label: "Overview", href: "/dashboard" },
    { label: "Academy", href: "/academy" },
    { label: "AI Opportunities", href: "/ai-opportunities/dashboard" },
    { label: "Research", href: "/research" },
    { label: "Investor", href: "/investor" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Journal", href: "/journal" },
];

export default function MemberDashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() || "";
    const supabase = useMemo(() => createClient(), []);
    const [role, setRole] = useState<string>("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();
            if (!cancelled) {
                setRole(profile?.role || "learner");
                setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [supabase, router]);

    const isStaff = role === "editor" || role === "administrator" || role === "researcher" || role === "finance_operator";

    const navItems: ShellNavItem[] = [...MEMBER_NAV];
    if (isStaff) {
        navItems.push({ label: "Admin", href: "/admin/dashboard" });
    }

    // Derive a simple page title from the path
    const titleMap: Record<string, string> = {
        "/dashboard": "Learning Dashboard",
        "/watchlist": "Watchlist",
        "/journal": "Journal",
        "/investor": "Investor Workspace",
    };
    const title = titleMap[pathname] || "Workspace";

    if (!ready) {
        return (
            <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
                <p className="text-sm font-mono text-terminal-muted">Loading workspace…</p>
            </div>
        );
    }

    return (
        <DashboardShell
            navItems={navItems}
            title={title}
            subtitle="Savanna Capitals · Member workspace"
            roleLabel={role.replace("_", " ")}
            topRight={
                isStaff ? (
                    <Link
                        href="/admin/dashboard"
                        className="text-[11px] font-mono text-terminal-gold hover:underline"
                    >
                        Admin →
                    </Link>
                ) : (
                    <Link href="/" className="text-[11px] font-mono text-terminal-muted hover:text-terminal-text">
                        Site →
                    </Link>
                )
            }
        >
            {children}
        </DashboardShell>
    );
}
