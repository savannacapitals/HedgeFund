"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

export default function CertificatePage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [certificate, setCertificate] = useState<any>(null);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);

        async function load() {
            if (!slug) return;
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: courseData } = await supabase
                .from("courses")
                .select("id, title, slug")
                .eq("slug", slug)
                .maybeSingle();
            setCourse(courseData);

            if (courseData) {
                // Row-level security only returns the signed-in user's own certificate
                const { data: cert } = await supabase
                    .from("certificates")
                    .select("verification_code, holder_name, issued_at")
                    .eq("user_id", user.id)
                    .eq("course_id", courseData.id)
                    .maybeSingle();
                setCertificate(cert);
            }
            setLoading(false);
        }
        load();
    }, [slug, supabase, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING CERTIFICATE...
            </div>
        );
    }

    if (!course || !certificate) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">No Certificate Yet</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">
                    Complete every lesson in the course to earn your certificate.
                </p>
                <Link
                    href={`/learn/${slug}/lessons`}
                    className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold"
                >
                    Back to Lessons
                </Link>
            </div>
        );
    }

    const issued = new Date(certificate.issued_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const verifyUrl = `${origin}/verify/${certificate.verification_code}`;

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-10">
            {/* Hides the site header and footer when printing */}
            <style>{`
                @page { size: A4 landscape; margin: 10mm; }
                @media print {
                    header, footer { display: none !important; }
                    body { background: #ffffff !important; }
                }
            `}</style>

            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <Link href={`/learn/${slug}/lessons`} className="font-mono text-xs text-terminal-muted hover:text-terminal-text">
                    ← BACK TO LESSONS
                </Link>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90"
                >
                    PRINT / SAVE AS PDF
                </button>
            </div>

            {/* Light card so it prints cleanly on paper */}
            <div className="max-w-4xl mx-auto bg-[#FBF8F0] text-[#1A1A1A] border-8 border-double border-[#B8962E] p-10 md:p-16 text-center">
                <BrandMark height={64} tone="light" centered className="mb-4" />
                <p className="font-mono text-xs tracking-[0.3em] text-[#8A6D1B] uppercase">Savanna Academy</p>
                <h1 className="text-3xl md:text-4xl font-bold mt-4 tracking-wide">Certificate of Completion</h1>

                <p className="mt-10 text-sm text-[#555]">This certifies that</p>
                <p className="mt-3 text-3xl md:text-4xl font-bold border-b border-[#B8962E] inline-block px-8 pb-2">
                    {certificate.holder_name}
                </p>

                <p className="mt-8 text-sm text-[#555]">has successfully completed the course</p>
                <p className="mt-3 text-2xl font-bold">{course.title}</p>

                <div className="mt-12 flex flex-col md:flex-row md:justify-between items-center gap-6 text-xs">
                    <div className="text-left">
                        <p className="font-mono text-[#8A6D1B] uppercase tracking-wider">Date issued</p>
                        <p className="mt-1 text-sm">{issued}</p>
                    </div>
                    <div className="md:text-right">
                        <p className="font-mono text-[#8A6D1B] uppercase tracking-wider">Verification code</p>
                        <p className="mt-1 font-mono text-sm font-bold">{certificate.verification_code}</p>
                        <p className="mt-1 text-[#555] break-all">Verify at {verifyUrl}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
