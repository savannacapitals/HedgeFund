import { type ReactNode } from "react";

type CardProps = {
    children: ReactNode;
    className?: string;
    padding?: "none" | "sm" | "md" | "lg";
    hover?: boolean;
};

const paddingMap = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
};

/**
 * Institutional card surface used across all dashboards.
 * Subtle border, no heavy shadows, restrained hover.
 */
export function Card({ children, className = "", padding = "md", hover = false }: CardProps) {
    return (
        <div
            className={`
                rounded-lg bg-terminal-surface border border-terminal-border
                ${paddingMap[padding]}
                ${hover ? "transition-colors hover:border-terminal-gold/40" : ""}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 mb-4">
            <div>
                <h3 className="text-sm font-semibold tracking-tight text-terminal-text">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-terminal-muted font-mono">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function MetricCard({
    label,
    value,
    delta,
    deltaTone = "neutral",
    footnote,
}: {
    label: string;
    value: string | number;
    delta?: string;
    deltaTone?: "positive" | "negative" | "neutral";
    footnote?: string;
}) {
    const tone =
        deltaTone === "positive"
            ? "text-terminal-emerald"
            : deltaTone === "negative"
              ? "text-red-400"
              : "text-terminal-muted";

    return (
        <Card>
            <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-terminal-muted mb-1.5">
                {label}
            </span>
            <span className="block text-2xl md:text-3xl font-bold font-mono tabular-nums text-terminal-text tracking-tight">
                {value}
            </span>
            {delta && <span className={`block mt-2 text-xs font-mono ${tone}`}>{delta}</span>}
            {footnote && <span className="block mt-1 text-[10px] font-mono text-terminal-muted">{footnote}</span>}
        </Card>
    );
}
