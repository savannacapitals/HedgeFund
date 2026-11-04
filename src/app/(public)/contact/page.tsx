import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Contact | Savanna Capitals",
    description: "Reach Savanna Capitals for research, Academy, AI Opportunities and institutional questions.",
};

const DESTINATIONS = [
    {
        title: "AI Opportunities",
        body: "Questions about membership, Kenya eligibility research, or the USD 15 assistance service.",
        href: "/ai-opportunities",
        cta: "Open AI Opportunities",
    },
    {
        title: "Academy",
        body: "Course access, lessons, certificates and the Killzone Journal community.",
        href: "/academy",
        cta: "Browse the Academy",
    },
    {
        title: "Research",
        body: "Published briefs and the research library. Institutional desks can start from pricing.",
        href: "/research",
        cta: "Open the library",
    },
    {
        title: "Payments",
        body: "Checkout uses M-Pesa (Pochi la Biashara), bank transfer or USDC/USDT. Confirmed orders appear on your dashboard.",
        href: "/pricing",
        cta: "See pricing",
    },
];

export default function ContactPage() {
    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";

    return (
        <div className="mx-auto max-w-5xl px-6 py-14">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">Savanna Capitals</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-.04em] text-terminal-text sm:text-5xl">Talk to us about the right part of the platform.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-terminal-muted">
                We publish research, teach through Savanna Academy, and research AI work platforms for Kenyan applicants. We do not take investment deposits, place jobs, or sell platform accounts.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {DESTINATIONS.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="rounded-2xl border border-terminal-border bg-terminal-surface p-6 transition hover:border-terminal-emerald/40"
                    >
                        <h2 className="text-lg font-semibold text-terminal-text">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-terminal-muted">{item.body}</p>
                        <span className="mt-5 inline-block text-xs font-semibold text-terminal-gold">{item.cta} →</span>
                    </Link>
                ))}
            </div>

            <div className="mt-10 rounded-2xl border border-terminal-border bg-terminal-surface p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-terminal-text">Direct message</h2>
                {email ? (
                    <>
                        <p className="mt-3 text-sm leading-6 text-terminal-muted">
                            Write to <a className="text-terminal-gold underline-offset-2 hover:underline" href={`mailto:${email}`}>{email}</a>. Include your Savanna account email if the question is about a payment or membership.
                        </p>
                        <form className="mt-6 grid gap-4" action={`mailto:${email}`} method="post" encType="text/plain">
                            <label className="text-xs font-semibold uppercase tracking-[.14em] text-terminal-muted">
                                Subject
                                <input name="subject" required className="mt-2 w-full rounded-lg border border-terminal-border bg-terminal-bg px-4 py-3 text-sm text-terminal-text outline-none focus:border-terminal-emerald/60" />
                            </label>
                            <label className="text-xs font-semibold uppercase tracking-[.14em] text-terminal-muted">
                                Message
                                <textarea name="body" required rows={5} className="mt-2 w-full rounded-lg border border-terminal-border bg-terminal-bg px-4 py-3 text-sm text-terminal-text outline-none focus:border-terminal-emerald/60" />
                            </label>
                            <button type="submit" className="w-fit rounded-lg bg-terminal-gold px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-terminal-bg">
                                Open email
                            </button>
                        </form>
                    </>
                ) : (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-terminal-muted">
                        For membership and assistance, use the AI Opportunities dashboard after you sign in. For a paid course, continue from the Academy. Staff can also be reached from an order on your account — we reply on the same thread used to confirm payment.
                    </p>
                )}
            </div>
        </div>
    );
}
