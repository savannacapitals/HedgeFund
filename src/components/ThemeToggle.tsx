"use client";

import { useCallback, useEffect, useState } from "react";

// Theme preference: follow the device ("system") or force one theme.
// Stored in localStorage under THEME_KEY; the inline script in layout.tsx applies it before first paint.
type Mode = "system" | "light" | "dark";

const THEME_KEY = "sc-theme";
const ORDER: Mode[] = ["system", "light", "dark"];
const LABEL: Record<Mode, string> = { system: "Device", light: "Light", dark: "Dark" };

function readMode(): Mode {
    try {
        const stored = localStorage.getItem(THEME_KEY);
        return stored === "light" || stored === "dark" ? stored : "system";
    } catch {
        return "system";
    }
}

function applyTheme(mode: Mode) {
    const resolved =
        mode === "system"
            ? window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
            : mode;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
}

const icons: Record<Mode, React.ReactNode> = {
    system: (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 17h6M10 13.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    light: (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    dark: (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M16.5 11.6A6.5 6.5 0 0 1 8.4 3.5a6.5 6.5 0 1 0 8.1 8.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    ),
};

export default function ThemeToggle() {
    const [mode, setMode] = useState<Mode>("system");
    const [mounted, setMounted] = useState(false);

    // Pick up the saved choice once we are on the client (keeps server and client markup identical on first render).
    useEffect(() => {
        setMode(readMode());
        setMounted(true);
    }, []);

    // While following the device, react live when the OS switches between light and dark.
    useEffect(() => {
        if (mode !== "system") return;
        const query = window.matchMedia("(prefers-color-scheme: light)");
        const onChange = () => applyTheme("system");
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, [mode]);

    // Keep several open tabs in step.
    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== THEME_KEY) return;
            const next = readMode();
            setMode(next);
            applyTheme(next);
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const cycle = useCallback(() => {
        const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
        setMode(next);
        applyTheme(next);
        try {
            if (next === "system") localStorage.removeItem(THEME_KEY);
            else localStorage.setItem(THEME_KEY, next);
        } catch {
            /* storage unavailable (private mode): the choice simply lasts for this page view */
        }
    }, [mode]);

    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={cycle}
            aria-label={mounted ? `Theme: ${LABEL[mode]}. Switch to ${LABEL[next]}.` : "Change theme"}
            title={mounted ? `Theme: ${LABEL[mode]} (click for ${LABEL[next]})` : "Change theme"}
        >
            {icons[mounted ? mode : "system"]}
        </button>
    );
}
