import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyCertificatePage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;
    const normalized = decodeURIComponent(code).trim().toUpperCase();

    const supabase = await createClient();
    const { data } = await supabase.rpc("verify_certificate", { p_code: normalized });
    const cert = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-16 max-w-xl mx-auto">
            <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">
                CERTIFICATE VERIFICATION
            </span>

            {cert ? (
                <div className="mt-4 p-6 rounded-lg bg-terminal-surface border border-terminal-emerald/40 space-y-4">
                    <h1 className="text-2xl font-bold text-terminal-emerald">Valid certificate</h1>
                    <dl className="space-y-3 text-sm">
                        <div>
                            <dt className="font-mono text-xs text-terminal-muted uppercase">Awarded to</dt>
                            <dd className="font-bold">{cert.holder_name}</dd>
                        </div>
                        <div>
                            <dt className="font-mono text-xs text-terminal-muted uppercase">Course</dt>
                            <dd>{cert.course_title}</dd>
                        </div>
                        <div>
                            <dt className="font-mono text-xs text-terminal-muted uppercase">Date issued</dt>
                            <dd>
                                {new Date(cert.issued_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-mono text-xs text-terminal-muted uppercase">Code</dt>
                            <dd className="font-mono">{normalized}</dd>
                        </div>
                    </dl>
                    <p className="text-xs text-terminal-muted">Issued by Savanna Academy.</p>
                </div>
            ) : (
                <div className="mt-4 p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-3">
                    <h1 className="text-2xl font-bold">Certificate not found</h1>
                    <p className="text-xs text-terminal-muted font-mono">
                        No certificate matches the code {normalized}. Check the code and try again.
                    </p>
                    <Link href="/verify" className="inline-block text-xs font-mono text-terminal-gold">
                        ← Try another code
                    </Link>
                </div>
            )}
        </div>
    );
}
