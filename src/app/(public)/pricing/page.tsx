import Link from "next/link";
import type { Metadata } from "next";
import { DISPLAY_ASSISTANCE, DISPLAY_MEMBERSHIP, membershipDays } from "@/lib/ai/config";

export const metadata: Metadata = {
    title: "Pricing | Savanna Capitals",
    description: "What is free on Savanna Capitals, what you pay for, and how checkout works.",
};

const TIERS = [
    {
        id: "ai",
        name: "AI Opportunities",
        price: DISPLAY_MEMBERSHIP,
        cadence: `${membershipDays()} days`,
        description: "Unlock the full researched directory of AI work platforms, Kenya eligibility notes and step-by-step registration guides.",
        features: [
            "Full platform directory and status labels",
            "Kenya eligibility checked separately from “verified”",
            "Registration, assessment and payout notes",
            "Scam warnings and member dashboard",
            `Optional account assistance: ${DISPLAY_ASSISTANCE}`,
        ],
        popular: true,
        cta: `Become a member — ${DISPLAY_MEMBERSHIP}`,
        href: "/ai-opportunities/membership",
    },
    {
        id: "academy",
        name: "Savanna Academy",
        price: "Per course",
        cadence: "one-time",
        description: "Structured financial education. Each course has its own price, shown on the catalogue. Free courses stay free.",
        features: [
            "Self-paced lessons and quizzes",
            "Progress saved to your dashboard",
            "Certificate of completion where offered",
            "Killzone Journal access with paid courses",
        ],
        popular: false,
        cta: "Browse Academy courses",
        href: "/academy",
    },
    {
        id: "research",
        name: "Research library",
        price: "Free to read",
        cadence: "published briefs",
        description: "Independent market notes published on this site. There is no research paywall today. Institutional work is scoped separately.",
        features: [
            "Published macroeconomic and market notes",
            "Africa-first lens with global context",
            "No live trading signals or managed accounts",
            "Custom desk work by conversation, not a listed SKU",
        ],
        popular: false,
        cta: "Open the library",
        href: "/research",
    },
];

export default function PricingPage() {
    return (
        <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="mx-auto mb-16 max-w-3xl text-center">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-terminal-gold">Pricing</p>
                <h1 className="mb-4 text-3xl font-semibold tracking-[-.04em] text-terminal-text md:text-5xl">
                    Pay only for what is actually for sale.
                </h1>
                <p className="text-base text-terminal-muted md:text-lg">
                    Membership and courses are confirmed after payment. We never take investment deposits. Checkout accepts Pochi la Biashara (M-Pesa), bank transfer, and USDC/USDT.
                </p>
            </div>

            <div className="mb-16 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
                {TIERS.map((tier) => (
                    <div
                        key={tier.id}
                        className={`relative flex flex-col justify-between rounded-2xl border bg-terminal-surface p-8 ${tier.popular ? "border-terminal-gold shadow-xl shadow-terminal-gold/5" : "border-terminal-border"}`}
                    >
                        {tier.popular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-terminal-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-terminal-bg">
                                Live product
                            </span>
                        )}
                        <div>
                            <h2 className="mb-2 text-xl font-semibold text-terminal-text">{tier.name}</h2>
                            <p className="mb-6 text-sm text-terminal-muted">{tier.description}</p>
                            <div className="mb-6 flex items-baseline gap-2">
                                <span className="text-4xl font-semibold tracking-tight text-terminal-text">{tier.price}</span>
                                <span className="text-xs text-terminal-muted">/ {tier.cadence}</span>
                            </div>
                            <ul className="mb-8 space-y-3 text-sm text-terminal-text">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex gap-2">
                                        <span className="text-terminal-gold">✓</span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link
                            href={tier.href}
                            className={`block rounded-lg py-3 text-center text-sm font-semibold transition ${tier.popular ? "bg-terminal-gold text-terminal-bg hover:bg-terminal-gold/90" : "border border-terminal-border bg-terminal-bg text-terminal-text hover:border-terminal-gold/50"}`}
                        >
                            {tier.cta}
                        </Link>
                    </div>
                ))}
            </div>

            <div className="mx-auto max-w-4xl rounded-2xl border border-terminal-border bg-terminal-surface/50 p-6 text-center text-xs leading-relaxed text-terminal-muted">
                <span className="font-semibold text-terminal-gold">Please note: </span>
                Savanna Capitals provides research, education and independent guidance only. We do not accept investment deposits, pool capital, manage live accounts or custody assets. AI Opportunities does not hire you, sell you a platform account, or guarantee work.
                Need a custom conversation? <Link href="/contact" className="text-terminal-gold hover:underline">Contact us</Link>.
            </div>
        </div>
    );
}
