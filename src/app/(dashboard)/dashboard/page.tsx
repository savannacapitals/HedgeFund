"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CourseProgress {
    courseId: string;
    title: string;
    slug: string;
    total: number;
    done: number;
    percent: number;
    certificateCode: string | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<CourseProgress[]>([]);
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();
            setRole(profile?.role || "");

            const { data: enrolments } = await supabase
                .from("course_enrolments")
                .select("course_id, status, courses(id, title, slug)")
                .eq("user_id", user.id)
                .neq("status", "revoked");

            // Unpublished courses come back with no course row, so they are skipped
            const rows = (enrolments ?? [])
                .map((e: any) => ({ courseId: e.course_id as string, course: Array.isArray(e.courses) ? e.courses[0] : e.courses }))
                .filter((r) => r.course);

            if (rows.length === 0) {
                setCourses([]);
                setLoading(false);
                return;
            }

            const courseIds = rows.map((r) => r.courseId);

            const { data: modules } = await supabase
                .from("course_modules")
                .select("id, course_id")
                .in("course_id", courseIds);

            const moduleIds = (modules ?? []).map((m) => m.id);
            const { data: lessons } = moduleIds.length
                ? await supabase.from("course_curriculum").select("id, module_id").in("module_id", moduleIds)
                : { data: [] as any[] };

            const lessonIds = (lessons ?? []).map((l: any) => l.id);
            const { data: progress } = lessonIds.length
                ? await supabase
                      .from("lesson_progress")
                      .select("lesson_id")
                      .eq("user_id", user.id)
                      .eq("is_completed", true)
                      .in("lesson_id", lessonIds)
                : { data: [] as any[] };

            const { data: certificates } = await supabase
                .from("certificates")
                .select("course_id, verification_code")
                .eq("user_id", user.id);

            const doneIds = new Set((progress ?? []).map((p: any) => p.lesson_id));
            const courseOfModule = new Map((modules ?? []).map((m) => [m.id, m.course_id]));
            const certByCourse = new Map((certificates ?? []).map((c) => [c.course_id, c.verification_code]));

            const built: CourseProgress[] = rows.map((r) => {
                const courseLessons = (lessons ?? []).filter((l: any) => courseOfModule.get(l.module_id) === r.courseId);
                const total = courseLessons.length;
                const done = courseLessons.filter((l: any) => doneIds.has(l.id)).length;
                return {
                    courseId: r.courseId,
                    title: r.course.title,
                    slug: r.course.slug,
                    total,
                    done,
                    percent: total ? Math.round((done / total) * 100) : 0,
                    certificateCode: certByCourse.get(r.courseId) ?? null,
                };
            });

            setCourses(built);
            setLoading(false);
        }
        load();
    }, [supabase, router]);

    const inProgress = courses.filter((c) => c.percent < 100).length;
    const completedCourses = courses.filter((c) => c.total > 0 && c.percent === 100).length;
    const certificateCount = courses.filter((c) => c.certificateCode).length;
    const totalLessons = courses.reduce((n, c) => n + c.total, 0);
    const doneLessons = courses.reduce((n, c) => n + c.done, 0);
    const overallPercent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    const isStaff = role === "editor" || role === "administrator";

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            {/* Overview Header */}
            <div className="border-b border-terminal-border pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center space-x-2 text-xs font-mono text-terminal-gold mb-2">
                        <span>USER TERMINAL // OVERVIEW</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-terminal-text tracking-tight">
                        Account Dashboard
                    </h1>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                    {isStaff && (
                        <Link href="/admin/academy" className="px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg font-bold">
                            ACADEMY ADMIN
                        </Link>
                    )}
                    <span className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-terminal-muted">
                        ACCOUNT: <span className="text-terminal-emerald font-bold">{loading ? "..." : (role || "member").replace("_", " ").toUpperCase()}</span>
                    </span>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">ENROLLED COURSES</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">{loading ? "–" : courses.length}</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">
                        {loading ? "Loading..." : courses.length === 0 ? "Not enrolled yet" : `${inProgress} in progress`}
                    </span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">LESSONS COMPLETED</span>
                    <span className="text-3xl font-bold font-mono text-terminal-gold">{loading ? "–" : `${doneLessons}/${totalLessons}`}</span>
                    <span className="text-xs font-mono text-terminal-muted block mt-2">
                        {loading ? "Loading..." : totalLessons === 0 ? "Enrol in a course to begin" : `${overallPercent}% across your courses`}
                    </span>
                </div>

                <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border">
                    <span className="text-xs font-mono text-terminal-muted block mb-1">CERTIFICATES EARNED</span>
                    <span className="text-3xl font-bold font-mono text-terminal-text">{loading ? "–" : certificateCount}</span>
                    <span className="text-xs font-mono text-terminal-emerald block mt-2">
                        {loading ? "Loading..." : `${completedCourses} course${completedCourses === 1 ? "" : "s"} completed`}
                    </span>
                </div>
            </div>

            {/* Quick Navigation & Active Workflows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Learning Progress */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-terminal-text">Active Academy Courses</h2>
                        <Link href="/academy" className="text-xs font-mono text-terminal-gold hover:underline">
                            Browse Catalogue &rarr;
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {loading && <p className="text-xs font-mono text-terminal-muted">LOADING YOUR COURSES...</p>}

                        {!loading && courses.length === 0 && (
                            <div className="p-4 rounded bg-terminal-bg border border-terminal-border text-xs font-mono text-terminal-muted">
                                You have not enrolled in a course yet.{" "}
                                <Link href="/academy" className="text-terminal-gold hover:underline">
                                    Browse the catalogue &rarr;
                                </Link>
                            </div>
                        )}

                        {courses.map((c) => (
                            <div key={c.courseId} className="p-4 rounded bg-terminal-bg border border-terminal-border">
                                <div className="flex items-center justify-between gap-3 text-xs font-mono text-terminal-muted mb-2">
                                    <Link href={`/learn/${c.slug}/lessons`} className="text-terminal-text font-bold hover:text-terminal-gold">
                                        {c.title}
                                    </Link>
                                    <span className={c.percent === 100 ? "text-terminal-emerald" : "text-terminal-gold"}>
                                        {c.percent === 100 ? "Completed" : `${c.percent}% Completed`}
                                    </span>
                                </div>
                                <div className="w-full bg-terminal-surface h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`${c.percent === 100 ? "bg-terminal-emerald" : "bg-terminal-gold"} h-full`}
                                        style={{ width: `${c.percent}%` }}
                                    ></div>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs font-mono">
                                    <span className="text-terminal-muted">
                                        {c.done}/{c.total} lessons
                                    </span>
                                    {c.certificateCode ? (
                                        <Link href={`/learn/${c.slug}/certificate`} className="text-terminal-emerald hover:underline">
                                            View certificate &rarr;
                                        </Link>
                                    ) : (
                                        <Link href={`/learn/${c.slug}/lessons`} className="text-terminal-gold hover:underline">
                                            {c.percent === 100 ? "Get certificate" : c.done > 0 ? "Continue" : "Start"} &rarr;
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Tools & Shortcuts */}
                <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                    <h2 className="text-lg font-bold text-terminal-text mb-4">Quantitative Workflows <span className="text-xs font-mono text-terminal-muted">(preview)</span></h2>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <Link
                            href="/watchlist"
                            className="p-4 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors block text-center"
                        >
                            <span className="text-terminal-gold text-lg block mb-1">📊</span>
                            <span className="text-terminal-text font-bold block">Asset Watchlist</span>
                            <span className="text-terminal-muted text-[10px]">Sample preview · not live data</span>
                        </Link>

                        <Link
                            href="/journal"
                            className="p-4 rounded bg-terminal-bg border border-terminal-border hover:border-terminal-gold/50 transition-colors block text-center"
                        >
                            <span className="text-terminal-gold text-lg block mb-1">📓</span>
                            <span className="text-terminal-text font-bold block">Trading Journal</span>
                            <span className="text-terminal-muted text-[10px]">Sample preview · not your trades</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}