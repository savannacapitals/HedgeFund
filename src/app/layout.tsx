import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthButtons from "@/components/AuthButtons";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";
import BrandMark from "@/components/BrandMark";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

// Needed so the social-preview image gets a full web address. Set NEXT_PUBLIC_SITE_URL to your live domain in hosting.
function siteUrl(): URL {
    try {
        return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    } catch {
        return new URL("http://localhost:3000");
    }
}

export const metadata: Metadata = {
    metadataBase: siteUrl(),
    title: "Savanna Capitals | Financial Intelligence & Research",
    description:
        "Independent financial intelligence, African and global market research, and professional financial education.",
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

const navigation = [
    { label: "Platform", href: "/#platform" },
    { label: "Research", href: "/research" },
    { label: "Academy", href: "/academy" },
    { label: "AI Opportunities", href: "/ai-opportunities", icon: "ai" },
    { label: "About", href: "/#about" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="min-h-dvh flex flex-col">
                <header className="site-header">
                    <div className="header-inner">
                        <a href="/" className="brand-lockup" aria-label="Savanna Capitals home">
                            <BrandMark />
                            <span className="brand-name">SAVANNA<span>CAPITALS</span></span>
                        </a>
                        <nav className="desktop-nav" aria-label="Main navigation">
                            {navigation.map((item) => (
                                <a href={item.href} key={item.label} className={item.icon ? "nav-with-icon" : undefined}>
                                    {item.icon && (
                                        <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none">
                                            <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                                            <path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                            <circle cx="10" cy="10" r="1.6" fill="currentColor" />
                                        </svg>
                                    )}
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                        <div className="header-actions">
                            <ThemeToggle />
                            <div className="header-auth"><AuthButtons /></div>
                            <MobileMenu navigation={navigation} />
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-clip">{children}</main>
                <footer className="site-footer">
                    <div className="footer-main">
                        <a href="/" className="brand-lockup">
                            <BrandMark />
                            <span className="brand-name">SAVANNA<span>CAPITALS</span></span>
                        </a>
                        <p>Independent thinking. African perspective. Global context.</p>
                        <div className="footer-links"><a href="/research">Research</a><a href="/academy">Academy</a><a href="/ai-opportunities">AI Opportunities</a><a href="/contact">Contact</a></div>
                    </div>
                    <div className="footer-bottom">
                        <span>© {new Date().getFullYear()} Savanna Capitals. All rights reserved.</span>
                        <span>Research and education platform. Not investment advice.</span>
                    </div>
                </footer>
            </body>
        </html>
    );
}