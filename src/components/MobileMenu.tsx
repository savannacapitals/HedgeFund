"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AuthButtons from "@/components/AuthButtons";

type NavItem = { label: string; href: string; icon?: string };

// Hamburger menu for screens narrower than 900px, where the desktop navigation is hidden.
// On very small phones (480px and below) the Sign in / Get started buttons move in here too.
export default function MobileMenu({ navigation }: { navigation: NavItem[] }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close after navigating to another page.
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // While open: Escape closes, and so does growing the window past the mobile breakpoint.
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        const wide = window.matchMedia("(min-width: 901px)");
        const onChange = () => {
            if (wide.matches) setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        wide.addEventListener("change", onChange);
        return () => {
            document.removeEventListener("keydown", onKey);
            wide.removeEventListener("change", onChange);
        };
    }, [open]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className="menu-toggle"
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((value) => !value)}
            >
                {open ? (
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                        <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                )}
            </button>

            {open && (
                <>
                    {/* Invisible layer so a tap anywhere outside the menu closes it. */}
                    <div className="menu-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
                    <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
                        {navigation.map((item) => (
                            <a href={item.href} key={item.label} className="menu-link" onClick={() => setOpen(false)}>
                                {item.label}
                            </a>
                        ))}
                        <div className="menu-auth">
                            <AuthButtons />
                        </div>
                    </nav>
                </>
            )}
        </>
    );
}
