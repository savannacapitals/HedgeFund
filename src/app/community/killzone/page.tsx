import Link from "next/link";
import KillzoneCard from "@/components/KillzoneCard";

export const metadata = { title: "The Killzone Journal | Savanna Capital" };

export default function KillzonePage() {
    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-16 max-w-2xl mx-auto">
            <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">Savanna Academy</span>
            <h1 className="text-3xl font-bold mt-2">The Killzone Journal</h1>
            <p className="text-sm text-terminal-muted mt-3 mb-8">
                A private Telegram community where traders come together and analyse the markets. Free for every paid
                course student; everyone else can unlock it once.
            </p>
            <KillzoneCard />
            <div className="mt-8">
                <Link href="/dashboard" className="font-mono text-xs text-terminal-muted hover:text-terminal-text">
                    ← BACK TO DASHBOARD
                </Link>
            </div>
        </div>
    );
}
