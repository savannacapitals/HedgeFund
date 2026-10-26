import Link from "next/link";

interface PricingTier {
    id: string;
    name: string;
    price: string;
    cadence: string;
    description: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
    ctaLink: string;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: "tier-research",
        name: "Research Intelligence Pass",
        price: "$49",
        cadence: "per month",
        description: "Full access to institutional macroeconomic research reports, yield curve analysis, and fixed income commentaries.",
        features: [
            "All Macroeconomic & Fixed Income Reports",
            "Weekly Market Intelligence Briefs",
            "Watchlist & Portfolio Tracking Tools",
            "Secure Crypto & Fiat Checkout",
        ],
        ctaText: "Subscribe to Research",
        ctaLink: "/register?plan=research",
    },
    {
        id: "tier-academy",
        name: "Savanna Academy Access",
        price: "$199",
        cadence: "one-time per course",
        description: "Comprehensive professional education modules covering quantitative finance, python modeling, and market structure.",
        features: [
            "Full Course Video & Text Curriculum",
            "Downloadable Python & Excel Models",
            "Quizzes & Progress Tracking",
            "Certificate of Completion",
        ],
        isPopular: true,
        ctaText: "Browse Academy Courses",
        ctaLink: "/academy",
    },
    {
        id: "tier-institutional",
        name: "Institutional Desk",
        price: "Custom",
        cadence: "annual license",
        description: "Dedicated research support, customized quantitative data feeds, and advisory access for corporate entities and funds.",
        features: [
            "Custom Macroeconomic Data Feeds",
            "Direct Analyst Q&A Sessions",
            "Multi-User Team Entitlements",
            "Invoice & Bank Wire Support",
        ],
        ctaText: "Contact Sales",
        ctaLink: "/contact",
    },
];

export default function PricingPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center space-x-2 text-xs font-mono text-terminal-gold mb-3">
                    <span>CATALOGUE // PRICING & ENTITLEMENTS</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-terminal-text tracking-tight mb-4">
                    Transparent Research & Education Pricing
                </h1>
                <p className="text-terminal-muted text-base md:text-lg">
                    Clear subscription tiers and course access packages. Digital payments and crypto accepted strictly for educational products and research publications.
                </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
                {PRICING_TIERS.map((tier) => (
                    <div
                        key={tier.id}
                        className={`p-8 rounded-lg bg-terminal-surface border flex flex-col justify-between relative ${tier.isPopular ? "border-terminal-gold shadow-xl shadow-terminal-gold/5" : "border-terminal-border"
                            }`}
                    >
                        {tier.isPopular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-terminal-gold text-terminal-bg text-[10px] font-mono font-bold px-3 py-1 rounded">
                                MOST POPULAR
                            </span>
                        )}

                        <div>
                            <h2 className="text-xl font-bold text-terminal-text mb-2">{tier.name}</h2>
                            <p className="text-sm text-terminal-muted mb-6">{tier.description}</p>

                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold font-mono text-terminal-text mr-2">{tier.price}</span>
                                <span className="text-xs font-mono text-terminal-muted">/ {tier.cadence}</span>
                            </div>

                            <ul className="space-y-3 mb-8 text-sm text-terminal-muted font-mono">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                        <span className="text-terminal-gold mr-2">✓</span>
                                        <span className="text-terminal-text">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Link
                            href={tier.ctaLink}
                            className={`w-full py-3 rounded text-center font-semibold text-sm transition-colors block ${tier.isPopular
                                    ? "bg-terminal-gold text-terminal-bg hover:bg-terminal-gold/90"
                                    : "bg-terminal-bg border border-terminal-border text-terminal-text hover:border-terminal-gold/50"
                                }`}
                        >
                            {tier.ctaText}
                        </Link>
                    </div>
                ))}
            </div>

            {/* Regulatory Disclaimer Notice */}
            <div className="p-6 rounded-lg bg-terminal-surface/50 border border-terminal-border max-w-4xl mx-auto text-xs font-mono text-terminal-muted leading-relaxed text-center">
                <span className="text-terminal-gold font-bold">COMPLIANCE NOTICE:</span> Savanna Capitals provides financial research, market intelligence, and educational courses only. We do not accept investment deposits, pool investor capital, manage live investment accounts, or custody customer assets. Crypto payments are restricted exclusively to educational products and research subscriptions.
            </div>
        </div>
    );
}