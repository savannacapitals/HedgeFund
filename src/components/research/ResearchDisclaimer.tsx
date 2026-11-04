import styles from "./research.module.css";

/** Standard research disclaimer. Wording should be reviewed by the firm's legal or compliance adviser. */
export default function ResearchDisclaimer({ compact = false }: { compact?: boolean }) {
    if (compact) {
        return (
            <p className="max-w-4xl text-xs leading-6 text-terminal-muted">
                <span className="font-semibold text-terminal-text">Important: </span>
                Savanna Capitals research is published for information and education only. It is not investment advice, an offer, or a solicitation to buy or sell any security or digital asset.
            </p>
        );
    }

    return (
        <aside aria-labelledby="disclaimer-heading" className="border border-terminal-border bg-terminal-surface p-6 sm:p-8">
            <h2 id="disclaimer-heading" className={`${styles.display} mb-4 text-2xl font-semibold text-terminal-text`}>
                Research disclaimer
            </h2>
            <div className="space-y-3 text-[13px] leading-6 text-terminal-muted">
                <p>
                    This publication is provided by Savanna Capitals for information and educational purposes only. It is not investment, legal or tax advice, and it is not an offer or a solicitation to buy or sell any security, digital asset or other financial instrument. It does not take into account the objectives, financial situation or needs of any particular reader.
                </p>
                <p>
                    Views and estimates reflect the research desk&rsquo;s judgement at the date of publication and may change without notice. Information is drawn from sources believed to be reliable, but its accuracy and completeness are not guaranteed. Past performance is not a reliable guide to future results, and forecasts are not a guarantee of outcomes.
                </p>
                <p>
                    Investing in emerging and frontier markets and in digital assets carries a high risk of loss, including the loss of the full amount invested. Readers should obtain independent professional advice before making any investment decision.
                </p>
            </div>
        </aside>
    );
}
