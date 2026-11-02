import Link from "next/link";
import { AI_BASE } from "@/lib/ai/config";

export default function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string[]][] }) {
    return (
        <div className="aio-wrap" style={{ padding: "64px 0 88px", maxWidth: 780 }}>
            <Link href={AI_BASE} style={{ fontSize: 12, color: "var(--sc-fg-4)" }}>← AI Opportunities</Link>
            <span className="aio-eyebrow" style={{ display: "block", marginTop: 20 }}>Savanna AI Opportunities</span>
            <h1 className="aio-h2" style={{ fontSize: "clamp(30px,4.5vw,44px)" }}>{title}</h1>
            <p style={{ fontSize: 12, color: "var(--sc-fg-4)", marginTop: 10 }}>Last updated {updated}</p>
            <div className="aio-notice warn" style={{ marginTop: 20 }}>
                This page is a plain-language working draft prepared with the product. Have it reviewed by a Kenyan lawyer (including a check against the Data Protection Act, 2019) before you rely on it.
            </div>
            {sections.map(([h, paras]) => (
                <section key={h} className="aio-block">
                    <h2>{h}</h2>
                    {paras.map((t, i) => <p key={i}>{t}</p>)}
                </section>
            ))}
        </div>
    );
}
