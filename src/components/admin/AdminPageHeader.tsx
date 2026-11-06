import { type ReactNode } from "react";

export default function AdminPageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
            <div>
                {eyebrow && (
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                        {eyebrow}
                    </p>
                )}
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">{title}</h2>
                {description && <p className="mt-1 text-sm text-terminal-muted max-w-2xl">{description}</p>}
            </div>
            {actions && <div className="shrink-0 flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
