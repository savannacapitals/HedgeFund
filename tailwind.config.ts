import type { Config } from "tailwindcss";

// Colours come from CSS variables (defined in src/app/globals.css) so every
// `terminal-*` utility switches with the light / dark theme. The variables hold
// bare RGB channels, which lets opacity modifiers such as bg-terminal-gold/90 work.
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                terminal: {
                    bg: channel("t-bg"),             // Page background
                    surface: channel("t-surface"),   // Card surface
                    border: channel("t-border"),     // Subtle border
                    muted: channel("t-muted"),       // Muted text
                    text: channel("t-text"),         // Main text
                    gold: channel("t-gold"),         // Restrained gold accent
                    emerald: channel("t-emerald"),   // Positive indicator
                },
                // Error colours used across the app. Only these two shades are
                // remapped; the rest of Tailwind's red scale is untouched.
                red: {
                    400: channel("t-danger"),
                    500: channel("t-danger-strong"),
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
                // Research section only (variables are set in app/(public)/research/layout.tsx)
                headline: ["var(--font-headline)", "Georgia", "serif"],
                editorial: ["var(--font-editorial)", "Georgia", "serif"],
            },
        },
    },
    plugins: [],
};

export default config;
