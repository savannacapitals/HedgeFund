"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/client";

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

    const supabase = createClient();

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
                body: JSON.stringify({ courseId: course.id }),
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
            <div className="mb-6 font-mono text-xs text-terminal-muted flex items-center space-x-2">
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
                        <div className="flex justify-between items-center border-b border-terminal-border pb-4">
                            <span className="font-mono text-xs text-terminal-muted">PROGRAM TUITION</span>
                            <span className="text-2xl font-mono font-bold text-terminal-gold">{Number(course.price) === 0 ? "FREE" : `$${Number(course.price)}`}</span>
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
                            <button
                                onClick={handleEnrol}
                                disabled={enrolling}
                                className="w-full py-3 rounded bg-terminal-gold text-terminal-bg font-semibold text-xs font-mono tracking-wider hover:bg-terminal-gold/90 transition-colors disabled:opacity-50"
                            >
                                {enrolling ? "PROCESSING..." : Number(course.price) === 0 ? "ENROL FREE" : `ENROL FOR $${Number(course.price)}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}