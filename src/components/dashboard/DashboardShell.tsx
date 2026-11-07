"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

export type ShellNavItem = {
    label: string;
    href: string;
    section?: string;
    badge?: string | number;
};

type DashboardShellProps = {
    children: ReactNode;
    navItems: ShellNavItem[];
    title?: string;
    subtitle?: string;
    roleLabel?: string;
    topRight?: ReactNode;
    /** Optional secondary actions under the title */
    actions?: ReactNode;
};

/**
 * Shared institutional shell for all role dashboards.
 * Collapsible sidebar on desktop, drawer on mobile.
 * Keeps visual language consistent across Admin, Learner, AI, Research.
 */
export default function DashboardShell({
    children,
    navItems,
    title,
    subtitle,
    roleLabel,
    topRight,
    actions,
}: DashboardShellProps) {
    const pathname = usePathname() || "";
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + "/");

    const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
        <nav className="flex flex-col gap-0.5 px-2">
            {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`
                            group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium
                            transition-colors
                            ${
                                active
                                    ? "bg-terminal-gold/15 text-terminal-gold border border-terminal-gold/30"
                                    : "text-terminal-muted hover:text-terminal-text hover:bg-terminal-surface border border-transparent"
                            }
                        `}
                    >
                        <span className="truncate">{item.label}</span>
                        {item.badge != null && (
                            <span className="ml-auto text-[10px] font-mono tabular-nums opacity-80">
                                {item.badge}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text flex">
            {/* Desktop sidebar */}
            <aside
                className={`
                    hidden lg:flex flex-col border-r border-terminal-border bg-terminal-surface/40
                    transition-[width] duration-200 ease-out
                    ${collapsed ? "w-[72px]" : "w-[240px]"}
                `}
            >
                <div className="h-14 flex items-center px-4 border-b border-terminal-border shrink-0">
                    <Link href="/" className="flex items-center min-w-0" aria-label="Savanna Capitals home">
                        {collapsed ? <BrandMark variant="tree" height={18} /> : <BrandMark height={44} />}
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {!collapsed && (
                        <p className="px-5 mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-muted">
                            Workspace
                        </p>
                    )}
                    <NavList />
                </div>

                <div className="p-3 border-t border-terminal-border">
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="w-full flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs text-terminal-muted hover:text-terminal-text hover:bg-terminal-surface transition-colors"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <span className="font-mono">{collapsed ? "»" : "«"}</span>
                        {!collapsed && <span>Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-14 shrink-0 border-b border-terminal-border bg-terminal-bg/90 backdrop-blur-sm sticky top-0 z-30">
                    <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-4">
                        {/* Mobile menu trigger */}
                        <button
                            type="button"
                            className="lg:hidden p-2 -ml-2 rounded-md text-terminal-muted hover:text-terminal-text hover:bg-terminal-surface"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                        </button>

                        <div className="min-w-0 flex-1">
                            {title && (
                                <div>
                                    <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                                        {title}
                                    </h1>
                                    {subtitle && (
                                        <p className="text-[11px] text-terminal-muted font-mono truncate">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {roleLabel && (
                                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded border border-terminal-border bg-terminal-surface text-[10px] font-mono text-terminal-gold uppercase tracking-wider">
                                    {roleLabel}
                                </span>
                            )}
                            {topRight}
                        </div>
                    </div>
                </header>

                {/* Page actions row */}
                {actions && (
                    <div className="border-b border-terminal-border bg-terminal-surface/30">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
                            {actions}
                        </div>
                    </div>
                )}

                {/* Content */}
                <main className="flex-1">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
                </main>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-terminal-bg border-r border-terminal-border flex flex-col lg:hidden">
                        <div className="h-14 flex items-center justify-between px-4 border-b border-terminal-border">
                            <Link href="/" className="flex items-center" aria-label="Savanna Capitals home" onClick={() => setMobileOpen(false)}>
                                <BrandMark height={44} />
                            </Link>
                            <button
                                type="button"
                                className="p-2 text-terminal-muted hover:text-terminal-text"
                                onClick={() => setMobileOpen(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-4">
                            <NavList onNavigate={() => setMobileOpen(false)} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
