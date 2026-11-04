import Link from "next/link";

export default function NotFound() {
    return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-6 py-20">
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">404</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-terminal-text">This page is not on Savanna.</h1>
            <p className="mt-4 text-sm leading-7 text-terminal-muted">
                The address may have changed, or the report may not be published yet. Try one of the live sections below.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/" className="rounded-lg bg-terminal-gold px-4 py-2.5 text-xs font-bold uppercase tracking-[.12em] text-terminal-bg">
                    Home
                </Link>
                <Link href="/research" className="rounded-lg border border-terminal-border px-4 py-2.5 text-xs font-semibold text-terminal-text">
                    Research
                </Link>
                <Link href="/academy" className="rounded-lg border border-terminal-border px-4 py-2.5 text-xs font-semibold text-terminal-text">
                    Academy
                </Link>
                <Link href="/ai-opportunities" className="rounded-lg border border-terminal-border px-4 py-2.5 text-xs font-semibold text-terminal-text">
                    AI Opportunities
                </Link>
            </div>
        </div>
    );
}
