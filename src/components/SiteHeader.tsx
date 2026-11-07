"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButtons from "@/components/AuthButtons";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";
import BrandMark from "@/components/BrandMark";
import { MAIN_NAV, navItemIsActive } from "@/lib/nav";

export default function SiteHeader() {
    const pathname = usePathname() || "/";

    return (
        <header className="site-header">
            <div className="header-inner">
                <Link href="/" className="brand-lockup" aria-label="Savanna Capitals home">
                    <BrandMark />
                </Link>
                <nav className="desktop-nav" aria-label="Main navigation">
                    {MAIN_NAV.map((item) =>
                        item.highlight ? (
                            <Link
                                href={item.href}
                                key={item.label}
                                className={`nav-ai-btn${navItemIsActive(item.href, pathname) ? " is-active" : ""}`}
                                aria-label="AI Opportunities"
                                aria-current={navItemIsActive(item.href, pathname) ? "page" : undefined}
                            >
                                <span className="nav-ai-chip" aria-hidden="true">
                                    <svg viewBox="0 0 20 20" width="13" height="13" fill="none">
                                        <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <circle cx="10" cy="10" r="1.7" fill="currentColor" />
                                    </svg>
                                    AI
                                </span>
                                <span className="nav-ai-text">Opportunities</span>
                                <span className="nav-ai-dot" aria-hidden="true" />
                            </Link>
                        ) : (
                            <Link
                                href={item.href}
                                key={item.label}
                                className={navItemIsActive(item.href, pathname) ? "is-active" : undefined}
                                aria-current={navItemIsActive(item.href, pathname) ? "page" : undefined}
                            >
                                {item.label}
                            </Link>
                        ),
                    )}
                </nav>
                <div className="header-actions">
                    <ThemeToggle />
                    <div className="header-auth">
                        <AuthButtons />
                    </div>
                    <MobileMenu navigation={MAIN_NAV} />
                </div>
            </div>
        </header>
    );
}
