import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

// Needed so the social-preview image gets a full web address. Set NEXT_PUBLIC_SITE_URL to your live domain in hosting.
function siteUrl(): URL {
    try {
        return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hedge-fund-ruby.vercel.app/");
    } catch {
        return new URL("https://hedge-fund-ruby.vercel.app/");
    }
}

export const metadata: Metadata = {
    metadataBase: siteUrl(),
    title: "Savanna Capitals | Financial Intelligence & Research",
    description:
        "Independent financial intelligence, African and global market research, professional education, and researched AI work platforms.",
    openGraph: { siteName: "Savanna Capitals", type: "website" },
    twitter: { card: "summary_large_image" },
};

// Tells the browser both themes are supported, so built-in controls, scrollbars and the
// mobile address bar match the device setting.
export const viewport: Viewport = {
    colorScheme: "dark light",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f4f7f6" },
        { media: "(prefers-color-scheme: dark)", color: "#080d12" },
    ],
};

// Runs before first paint: applies the saved choice (Light / Dark) or, when none is saved,
// the device setting. Keep the storage key in sync with ThemeToggle.tsx.
const themeScript = `(function(){try{var m=localStorage.getItem("sc-theme");var t=(m==="light"||m==="dark")?m:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="min-h-dvh flex flex-col">
                <SiteHeader />
                <main className="flex-1 overflow-x-clip">{children}</main>
                <SiteFooter />
            </body>
        </html>
    );
}