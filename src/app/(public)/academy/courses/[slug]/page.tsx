"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/client";
import { formatPrice } from "@/lib/promotions/pricing";

interface Quote {
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
    promotion: { id: string; headline: string; code: string | null; endsAt: string | null } | null;
}

export default function CourseLandingPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [course, setCourse] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [codeInput, setCodeInput] = useState("");
    const [appliedCode, setAppliedCode] = useState("");
    const [codeError, setCodeError] = useState("");
    const [applying, setApplying] = useState(false);

    const supabase = createClient();

    // The server works out the price (including any automatic offer) so what is shown is what is charged
    async function fetchQuote(courseId: string, code?: string) {
        try {
            const res = await fetch("/api/promotions/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId, code }),
            });
            const json = await res.json();
            if (res.ok) {
                setQuote(json.quote);
                setCodeError(json.codeError || "");
                setAppliedCode(code && !json.codeError && json.quote?.promotion?.code === code.toUpperCase() ? code.toUpperCase() : "");
            } else if (code) {
                setCodeError(json.error || "Could not check that code.");
            }
        } catch {
            if (code) setCodeError("Could not check that code. Please try again.");
        }
    }

    async function applyCode() {
        if (!course || !codeInput.trim()) return;
        setApplying(true);
        setCodeError("");
        await fetchQuote(course.id, codeInput.trim());
        setApplying(false);
    }

    useEffect(() => {
        async function loadCourseData() {
            if (!slug) return;
            setLoading(true);

            // 1. Get current user session
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // 2. Fetch course details
            const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("*")
                .eq("slug", slug)
                .single();

            if (courseError || !courseData) {
                console.error("Course not found:", courseError);
                setLoading(false);
                return;
            }

            setCourse(courseData);
            if (Number(courseData.price) > 0) fetchQuote(courseData.id);
            // 3. Fetch modules, then lessons from the safe curriculum view
            const { data: modulesData } = await supabase
                .from("course_modules")
                .select("*")
                .eq("course_id", courseData.id)
                .order("order_index", { ascending: true });

            if (modulesData && modulesData.length > 0) {
                const { data: lessonsData } = await supabase
                    .from("course_curriculum")
                    .select("*")
                    .in("module_id", modulesData.map((m) => m.id))
                    .order("order_index", { ascending: true });

                setModules(
                    modulesData.map((m) => ({
                        ...m,
                        course_lessons: (lessonsData ?? []).filter((l) => l.module_id === m.id),
                    }))
                );
            } else {
                setModules([]);
            }

            // 4. Check if user is enrolled
            if (user) {
                const { data: enrolmentData } = await supabase
                    .from("course_enrolments")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("course_id", courseData.id)
                    .maybeSingle();

                if (enrolmentData) {
                    setIsEnrolled(true);
                }
            }

            setLoading(false);
        }

        loadCourseData();
    }, [slug, supabase]);

    const handleEnrol = async () => {
        if (!user) {
            router.push("/login");
            return;
        }

        setEnrolling(true);
        try {
            // The server checks the price, creates the order and decides where to send the user
            const res = await fetch("/api/academy/enrol", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: course.id, promoCode: appliedCode || undefined }),
            });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to start enrolment.");
            }

            router.push(result.redirectTo);
        } catch (err: any) {
            alert("Enrolment error: " + err.message);
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING COURSE SYLLABUS...
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-3xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">The requested institutional program does not exist or has been unpublished.</p>
                <Link href="/academy" className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold">
                    Return to Academy Catalogue
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-12 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-6 font-mono text-xs text-terminal-muted flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href="/academy" className="hover:text-terminal-gold">ACADEMY</Link>
                <span>/</span>
                <span className="text-terminal-text">{course.category}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Overview & Curriculum */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-terminal-surface border border-terminal-border text-terminal-gold">
                                {course.level || "Professional Level"}
                            </span><span className="font-mono text-xs text-terminal-muted">{course.duration_hours ? `${course.duration_hours} hrs` : "Self-Paced"}</span>

                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{course.title}</h1>
                        <p className="text-terminal-muted text-base leading-relaxed">{course.description}</p>
                    </div>

                    {/* What You'll Learn / Curriculum Preview */}
                    <div className="border-t border-terminal-border pt-8">
                        <h2 className="text-xl font-bold mb-6">Course Curriculum</h2>
                        <div className="space-y-4">
                            {modules.map((module, mIdx) => (
                                <div key={module.id} className="rounded-lg bg-terminal-surface border border-terminal-border p-5">
                                    <h3 className="font-bold text-sm mb-1 text-terminal-text">
                                        Module {mIdx + 1}: {module.title}
                                    </h3>
                                    <p className="text-xs text-terminal-muted mb-3">{module.description || "Structured analytical modules and practical exercises."}</p>

                                    <div className="space-y-2 border-t border-terminal-border/40 pt-3">
                                        {module.course_lessons?.map((lesson: any, lIdx: number) => (
                                            <div key={lesson.id} className="flex justify-between items-center text-xs font-mono text-terminal-muted">
                                                <span>{lIdx + 1}. {lesson.title}</span>
                                                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border">
                                                    {lesson.content_type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Pricing & Enrolment Card */}
                <div>
                    <div className="sticky top-6 p-6 rounded-lg bg-terminal-surface border border-terminal-border space-y-6">
                        <div className="border-b border-terminal-border pb-4">
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-xs text-terminal-muted">PROGRAM TUITION</span>
                                <span className="text-right">
                                    {quote && quote.discount > 0 && (
                                        <span className="block font-mono text-xs text-terminal-muted line-through">{formatPrice(quote.subtotal, quote.currency)}</span>
                                    )}
                                    <span className="text-2xl font-mono font-bold text-terminal-gold">
                                        {Number(course.price) === 0 ? "FREE" : formatPrice(quote ? quote.total : Number(course.price), quote?.currency || course.currency || "USD")}
                                    </span>
                                </span>
                            </div>
                            {quote && quote.discount > 0 && quote.promotion && (
                                <p className="mt-3 rounded border border-terminal-gold/30 bg-terminal-gold/10 px-3 py-2 text-[11px] leading-relaxed text-terminal-gold">
                                    <span className="font-bold">{quote.promotion.headline}</span>
                                    <span className="block font-mono text-terminal-muted">You save {formatPrice(quote.discount, quote.currency)}</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-3 text-xs font-mono text-terminal-muted">
                            <div className="flex justify-between">
                                <span>Access:</span>
                                <span className="text-terminal-text">Lifetime Institutional</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Certificate:</span>
                                <span className="text-terminal-text">Included upon completion</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Format:</span>
                                <span className="text-terminal-text">Applied Video & Readings</span>
                            </div>
                        </div>

                        {isEnrolled ? (
                            <Link
                                href={`/learn/${course.slug}/lessons`}
                                className="block w-full py-3 text-center rounded bg-emerald-600 text-white font-semibold text-xs font-mono tracking-wider hover:bg-emerald-500 transition-colors"
                            >
                                CONTINUE LEARNING
                            </Link>
                        ) : (
                            <>
                            {Number(course.price) > 0 && (
                                <div>
                                    <label htmlFor="promo-code" className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">Promo code</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="promo-code"
                                            value={codeInput}
                                            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === "Enter" && applyCode()}
                                            maxLength={24}
                                            autoComplete="off"
                                            spellCheck={false}
                                            placeholder="Enter code"
                                            className="min-w-0 flex-1 px-3 py-2 rounded bg-terminal-bg border border-terminal-border text-xs font-mono tracking-wider uppercase focus:outline-none focus:border-terminal-gold"
                                        />
                                        <button
                                            type="button"
                                            onClick={applyCode}
                                            disabled={applying || !codeInput.trim()}
                                            className="px-3 py-2 rounded border border-terminal-border text-xs font-mono font-bold hover:border-terminal-gold disabled:opacity-40"
                                        >
                                            {applying ? "..." : "APPLY"}
                                        </button>
                                    </div>
                                    {codeError && <p role="alert" className="mt-2 text-[11px] text-red-400">{codeError}</p>}
                                    {appliedCode && !codeError && <p className="mt-2 text-[11px] text-terminal-emerald">Code {appliedCode} applied.</p>}
                                </div>
                            )}
                            <button
                                onClick={handleEnrol}
                                disabled={enrolling}
                                className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                            >
                                {enrolling ? "PROCESSING..." : Number(course.price) === 0 ? "ENROL FREE" : `ENROL FOR ${formatPrice(quote ? quote.total : Number(course.price), quote?.currency || course.currency || "USD")}`}
                            </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}