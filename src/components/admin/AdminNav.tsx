"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccess, type SectionKey } from "@/lib/auth/roles";

const ITEMS: { section: SectionKey; label: string; href: string }[] = [
    { section: "overview", label: "OVERVIEW", href: "/admin/dashboard" },
    { section: "content", label: "CONTENT", href: "/admin/content" },
    { section: "academy", label: "ACADEMY", href: "/admin/academy" },
    { section: "users", label: "USERS & ROLES", href: "/admin/users" },
    { section: "orders", label: "ORDERS", href: "/admin/orders" },
];

/** The tab bar across the top of every /admin page. Only shows what the role can open. */
export default function AdminNav({ role }: { role?: string }) {
    const pathname = usePathname() || "";

    return (
        <nav aria-label="Admin sections" className="border-b border-terminal-border bg-terminal-surface/60">
            <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
                {ITEMS.filter((i) => canAccess(role, i.section)).map((i) => {
                    const active = pathname === i.href || pathname.startsWith(i.href + "/");
                    return (
                        <Link
                            key={i.href}
                            href={i.href}
                            className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                active
                                    ? "border-terminal-gold text-terminal-gold font-bold"
                                    : "border-transparent text-terminal-muted hover:text-terminal-text"
                            }`}
                        >
                            {i.label}
                        </Link>
                    );
                })}
                <Link href="/" className="ml-auto px-4 py-3 whitespace-nowrap text-terminal-muted hover:text-terminal-text">
                    VIEW SITE &rarr;
                </Link>
            </div>
        </nav>
    );
}
