import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthButtons from "@/components/AuthButtons";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
    title: "Savanna Capitals | Financial Intelligence & Research",
    description:
        "Independent financial intelligence, African and global market research, and professional financial education.",
};

const navigation = [
    { label: "Platform", href: "/#platform" },
    { label: "Research", href: "/research" },
    { label: "Academy", href: "/academy" },
    { label: "About", href: "/#about" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
            <body className="min-h-screen flex flex-col">
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
                            <AuthButtons />
                        </div>
                    </div>
                </header>
                <main className="flex-1">{children}</main>
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
