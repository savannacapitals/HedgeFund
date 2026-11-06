type ProgressBarProps = {
    value: number; // 0–100
    size?: "sm" | "md";
    showLabel?: boolean;
    className?: string;
};

export function ProgressBar({ value, size = "md", showLabel = false, className = "" }: ProgressBarProps) {
    const clamped = Math.max(0, Math.min(100, value));
    const height = size === "sm" ? "h-1" : "h-1.5";

    return (
        <div className={`w-full ${className}`}>
            {showLabel && (
                <div className="flex justify-between mb-1.5 text-[10px] font-mono text-terminal-muted">
                    <span>Progress</span>
                    <span className="text-terminal-text">{clamped}%</span>
                </div>
            )}
            <div className={`w-full ${height} rounded-full bg-terminal-border/60 overflow-hidden`}>
                <div
                    className={`${height} rounded-full bg-terminal-gold transition-[width] duration-500 ease-out`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    );
}
