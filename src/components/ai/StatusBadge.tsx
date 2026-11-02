import { kenyaLabel, statusLabel } from "@/lib/ai/config";

export function StatusBadge({ status }: { status: string }) {
    return <span className={`aio-badge ${status}`}>{statusLabel(status)}</span>;
}

export function KenyaBadge({ value }: { value: string }) {
    return <span className="aio-badge plain">{kenyaLabel(value)}</span>;
}

/** Monogram tile. Real logos are shown only when staff set an address in the admin screen: nothing is pulled from third-party sites. */
export function PlatformMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
    const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "AI";
    return (
        <div className="aio-mark" aria-hidden="true">
            {logoUrl ? <img src={logoUrl} alt="" loading="lazy" /> : initials}
        </div>
    );
}
