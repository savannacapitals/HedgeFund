import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthButtons from "@/components/AuthButtons";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
    title: "Savanna Capitals | Financial Intelligence & Research",
    description:
        "Independent financial intelligence, African and global market research, and professional financial education.",
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
    { label: "About", href: "/#about" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="min-h-screen min-h-dvh flex flex-col">
                <header className="site-header">
                    <div className="header-inner">
                        <a href="/" className="brand-lockup" aria-label="Savanna Capitals home">
                            <span className="brand-mark"><i /><i /><i /></span>
                            <span className="brand-name">SAVANNA<span>CAPITALS</span></span>
                        </a>
                        <nav className="desktop-nav" aria-label="Main navigation">
                            {navigation.map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
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
                            <span className="brand-mark"><i /><i /><i /></span>
                            <span className="brand-name">SAVANNA<span>CAPITALS</span></span>
                        </a>
                        <p>Independent thinking. African perspective. Global context.</p>
                        <div className="footer-links"><a href="/research">Research</a><a href="/academy">Academy</a><a href="/contact">Contact</a></div>
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
