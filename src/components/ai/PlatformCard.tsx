import Link from "next/link";
import { AI_BASE, categoryLabel } from "@/lib/ai/config";
import { KenyaBadge, PlatformMark, StatusBadge } from "@/components/ai/StatusBadge";

export interface PlatformSummary {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    short_description: string;
    category: string;
    verification_status: string;
    kenya_eligibility: string;
    last_verified: string | null;
    is_featured?: boolean;
}

export default function PlatformCard({ p, saved }: { p: PlatformSummary; saved?: boolean }) {
    return (
        <Link href={`${AI_BASE}/platforms/${p.slug}`} className="aio-card" style={{ display: "block" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <PlatformMark name={p.name} logoUrl={p.logo_url} />
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ overflowWrap: "anywhere" }}>{p.name}{saved ? <span style={{ color: "var(--sc-gold)", marginLeft: 8 }} title="Saved">★</span> : null}</h3>
                    <div style={{ fontSize: 12, color: "var(--sc-fg-4)", marginTop: 2 }}>{categoryLabel(p.category)}</div>
                </div>
            </div>
            <p>{p.short_description || "Research in progress."}</p>
            <div className="aio-meta">
                <StatusBadge status={p.verification_status} />
                <KenyaBadge value={p.kenya_eligibility} />
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--sc-fg-5)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                {p.last_verified ? `Last verified ${p.last_verified}` : "Not yet verified by Savanna"}
            </div>
        </Link>
    );
}
