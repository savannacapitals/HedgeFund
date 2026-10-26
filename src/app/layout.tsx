import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
    title: "Savanna Capitals — Institutional Financial Intelligence",
    description: "African financial intelligence, quantitative research, and professional education academy.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
            <body className="min-h-screen flex flex-col bg-terminal-bg text-terminal-text">
                <header className="border-b border-terminal-border bg-terminal-surface/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="font-mono text-terminal-gold font-bold tracking-wider">SAVANNA CAPITALS</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-terminal-border text-terminal-muted font-mono">TERMINAL v1.0</span>
                    </div>
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-terminal-muted">
                        <a href="/research" className="hover:text-terminal-text transition-colors">Research</a>
                        <a href="/academy" className="hover:text-terminal-text transition-colors">Academy</a>
                        <a href="/pricing" className="hover:text-terminal-text transition-colors">Pricing</a>
                    </nav>
                    <div className="flex items-center space-x-4">
                        <a href="/login" className="text-sm text-terminal-muted hover:text-terminal-text transition-colors">Sign In</a>
                        <a href="/register" className="text-sm bg-terminal-gold text-terminal-bg font-semibold px-4 py-2 rounded hover:bg-terminal-gold/90 transition-colors">Get Started</a>
                    </div>
                </header>
                <main className="flex-1">{children}</main>
                <footer className="border-t border-terminal-border bg-terminal-surface px-6 py-6 text-center text-xs text-terminal-muted font-mono">
                    <p>© {new Date().getFullYear()} Savanna Capitals. All rights reserved. Research and educational platform.</p>
                </footer>
            </body>
        </html>
    );
}