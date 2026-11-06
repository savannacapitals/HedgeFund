"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import DashboardShell, { type ShellNavItem } from "@/components/dashboard/DashboardShell";
import { canAccess, type SectionKey } from "@/lib/auth/roles";

const ALL_ITEMS: { section: SectionKey; label: string; href: string }[] = [
    { section: "overview", label: "Overview", href: "/admin/dashboard" },
    { section: "content", label: "Research & Content", href: "/admin/content" },
    { section: "academy", label: "Academy", href: "/admin/academy" },
    { section: "ai", label: "AI Opportunities", href: "/admin/ai" },
    { section: "users", label: "Users & Roles", href: "/admin/users" },
    { section: "orders", label: "Orders & Payments", href: "/admin/orders" },
    { section: "promotions", label: "Promotions", href: "/admin/promotions" },
];

type AdminShellProps = {
    role?: string;
    children: ReactNode;
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
};

export default function AdminShell({ role, children, title, subtitle, actions }: AdminShellProps) {
    const navItems: ShellNavItem[] = ALL_ITEMS.filter((i) => canAccess(role, i.section)).map((i) => ({
        label: i.label,
        href: i.href,
        section: i.section,
    }));

    // Always offer a way back to the member experience and the public site.
    navItems.push({ label: "Member Dashboard", href: "/dashboard" });
    navItems.push({ label: "View Site", href: "/" });

    return (
        <DashboardShell
            navItems={navItems}
            title={title}
            subtitle={subtitle}
            roleLabel={role ? role.replace("_", " ") : undefined}
            topRight={
                <Link
                    href="/dashboard"
                    className="text-[11px] font-mono text-terminal-muted hover:text-terminal-gold transition-colors"
                >
                    Exit admin →
                </Link>
            }
            actions={actions}
        >
            {children}
        </DashboardShell>
    );
}
