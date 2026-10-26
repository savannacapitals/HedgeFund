import type { Config } from "tailwind-css";

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
                    bg: "#0A0B0E",       // Near-black background
                    surface: "#12141A",  // Charcoal card surface
                    border: "#1E222D",   // Subtle dark border
                    muted: "#8A93A6",    // Muted text
                    text: "#E2E8F0",     // Main crisp white text
                    gold: "#D4AF37",     // Restrained gold accent
                    emerald: "#10B981",  // Green positive indicator
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;