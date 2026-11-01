const ArrowUpRight = () => (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowRight = () => (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M3.5 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

function MarketVisual() {
    return (
        <div className="market-visual">
            <div className="visual-topline">
                <div>
                    <span className="eyebrow">SAVANNA / INTELLIGENCE</span>
                    <p className="visual-heading">Markets, in context.</p>
                </div>
                <span className="visual-status"><i /> RESEARCH VIEW</span>
            </div>

            <div className="visual-tabs">
                <span className="active">OVERVIEW</span><span>AFRICA</span><span>MACRO</span>
                <span className="visual-period">ILLUSTRATIVE VIEW</span>
            </div>

            <div className="visual-chart">
                <div className="chart-y-labels"><span>HIGH</span><span>MID</span><span>LOW</span></div>
                <svg viewBox="0 0 620 220" role="img" aria-label="Illustrative market trend line" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--sc-chart-area)" stopOpacity=".22" />
                            <stop offset="100%" stopColor="var(--sc-chart-area)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--sc-chart-line-a)" />
                            <stop offset="100%" stopColor="var(--sc-chart-line-b)" />
                        </linearGradient>
                    </defs>
                    {[35, 90, 145, 200].map((y) => <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="var(--sc-chart-grid)" strokeDasharray="3 7" />)}
                    <path d="M0 168 C35 160 48 178 76 151 S118 139 145 148 S184 119 211 132 S250 91 278 111 S315 120 344 88 S382 104 410 78 S452 88 479 57 S520 72 548 45 S590 53 620 22 L620 220 L0 220Z" fill="url(#areaFill)" />
                    <path d="M0 168 C35 160 48 178 76 151 S118 139 145 148 S184 119 211 132 S250 91 278 111 S315 120 344 88 S382 104 410 78 S452 88 479 57 S520 72 548 45 S590 53 620 22" fill="none" stroke="url(#lineStroke)" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
                    <circle cx="620" cy="22" r="5" fill="var(--sc-chart-line-b)" stroke="var(--sc-chart-dot-ring)" strokeWidth="3" />
                </svg>
                <div className="chart-x-labels"><span>RESEARCH</span><span>ANALYSIS</span><span>DECISION</span><span>ALLOCATION</span></div>
            </div>

            <div className="visual-bottom">
                <div><span className="metric-label">OUR LENS</span><strong>Africa + Global</strong></div>
                <div><span className="metric-label">OUR METHOD</span><strong>Evidence-led</strong></div>
                <div><span className="metric-label">OUR FOCUS</span><strong>Long-term value</strong></div>
            </div>
            <p className="visual-disclaimer">Conceptual illustration only. No live market data or investment performance is represented.</p>
        </div>
    );
}

const capabilities = [
    {
        number: "01",
        title: "Market intelligence",
        description: "A structured view of the forces moving African and global markets — from monetary policy and currencies to fixed income and equities.",
        tag: "MARKETS & MACRO",
        href: "/research",
    },
    {
        number: "02",
        title: "Research & insights",
        description: "Independent analysis designed to turn complex economic developments into clear, decision-useful insight.",
        tag: "THOUGHT LEADERSHIP",
        href: "/research",
    },
    {
        number: "03",
        title: "Savanna Academy",
        description: "Practical, structured financial education spanning markets, investment analysis, quantitative methods and risk.",
        tag: "LEARN WITH PURPOSE",
        href: "/academy",
    },
];

export default function Home() {
    return (
        <div className="home-page">
            <section className="hero-section section-shell">
                <div className="hero-copy">
                    <div className="hero-kicker"><span className="kicker-line" /> INDEPENDENT FINANCIAL INTELLIGENCE</div>
                    <h1>Clarity for a more <span>informed</span> financial future.</h1>
                    <p className="hero-description">
                        Research, market intelligence and professional education connecting African opportunity with the global financial landscape.
                    </p>
                    <div className="hero-actions">
                        <a href="/research" className="button button-primary">Explore our research <ArrowUpRight /></a>
                        <a href="/academy" className="button button-secondary">Discover the Academy <ArrowRight /></a>
                    </div>
                    <div className="hero-footnote"><span className="footnote-dot" /> RESEARCH-LED <span className="footnote-divider">/</span> AFRICA-FOCUSED <span className="footnote-divider">/</span> GLOBALLY AWARE</div>
                </div>
                <div className="hero-art"><MarketVisual /></div>
                <div className="hero-orbit orbit-one" />
                <div className="hero-orbit orbit-two" />
            </section>

            <section className="principles-strip">
                <div className="section-shell principles-inner">
                    <span>UNDERSTAND THE ECONOMY</span><i />
                    <span>INTERPRET THE MARKETS</span><i />
                    <span>MAKE BETTER-INFORMED DECISIONS</span>
                </div>
            </section>

            <section className="capabilities-section section-shell" id="platform">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">THE SAVANNA PLATFORM</span>
                        <h2>Intelligence built around <span>what matters.</span></h2>
                    </div>
                    <p>We bring research, learning and market context into one connected environment — built for people who take capital and its allocation seriously.</p>
                </div>
                <div className="capability-grid">
                    {capabilities.map((item) => (
                        <a href={item.href} className="capability-card" key={item.number}>
                            <div className="card-top"><span>{item.number} / 03</span><ArrowUpRight /></div>
                            <div className="card-icon"><span /></div>
                            <span className="card-tag">{item.tag}</span>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                            <span className="card-link">Explore <ArrowRight /></span>
                        </a>
                    ))}
                </div>
            </section>

            <section className="research-section">
                <div className="section-shell research-layout">
                    <div className="research-copy">
                        <span className="eyebrow">01 — RESEARCH & MARKET PERSPECTIVES</span>
                        <h2>See beyond the <span>headline.</span></h2>
                        <p>Markets do not move in isolation. We examine the policy decisions, capital flows, economic data and structural shifts behind them — with an Africa-first perspective and a global frame of reference.</p>
                        <a href="/research" className="text-link">Explore research <ArrowUpRight /></a>
                    </div>
                    <div className="research-topics">
                        {[
                            ["A", "African capital markets", "Equities, fixed income and market development"],
                            ["M", "Macroeconomic analysis", "Rates, inflation, currencies and policy"],
                            ["G", "Global investment themes", "Cross-border trends and asset allocation"],
                            ["Q", "Quantitative research", "Data, models and evidence-led analysis"],
                        ].map(([letter, title, detail]) => (
                            <div className="topic-row" key={title}>
                                <span className="topic-letter">{letter}</span>
                                <div><h3>{title}</h3><p>{detail}</p></div>
                                <ArrowUpRight />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="academy-section section-shell">
                <div className="academy-panel">
                    <div className="academy-content">
                        <span className="eyebrow">02 — SAVANNA ACADEMY</span>
                        <h2>Build the knowledge.<br /><span>Strengthen the judgement.</span></h2>
                        <p>Move from foundational concepts to applied financial skills through structured courses, practical lessons and a clear learning path.</p>
                        <a href="/academy" className="button button-primary">Explore the Academy <ArrowUpRight /></a>
                    </div>
                    <div className="academy-visual" aria-hidden="true">
                        <div className="academy-ring ring-a" /><div className="academy-ring ring-b" />
                        <div className="academy-core"><span>SC</span><small>ACADEMY</small></div>
                        <div className="academy-label label-one">FINANCIAL MARKETS</div>
                        <div className="academy-label label-two">INVESTMENT ANALYSIS</div>
                        <div className="academy-label label-three">RISK & QUANT</div>
                    </div>
                </div>
            </section>

            <section className="closing-section section-shell" id="about">
                <span className="eyebrow">THE LONG VIEW</span>
                <h2>Better insight is the beginning<br />of <span>better capital decisions.</span></h2>
                <p>Explore a more thoughtful approach to understanding markets, building expertise and evaluating opportunity.</p>
                <a href="/research" className="button button-primary">Start exploring <ArrowUpRight /></a>
            </section>
        </div>
    );
}
