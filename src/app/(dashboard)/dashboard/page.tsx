"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, MetricCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
    const [displayName, setDisplayName] = useState<string>("");

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            setDisplayName(
                (user.user_metadata?.full_name as string) ||
                    (user.user_metadata?.name as string) ||
                    user.email?.split("@")[0] ||
                    "Member"
            );

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

            const rows = (enrolments ?? [])
                .map((e: any) => ({
                    courseId: e.course_id as string,
                    course: Array.isArray(e.courses) ? e.courses[0] : e.courses,
                }))
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
            const certByCourse = new Map(
                (certificates ?? []).map((c) => [c.course_id, c.verification_code])
            );

            const built: CourseProgress[] = rows.map((r) => {
                const courseLessons = (lessons ?? []).filter(
                    (l: any) => courseOfModule.get(l.module_id) === r.courseId
                );
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

            built.sort((a, b) => {
                const aDone = a.percent === 100 ? 1 : 0;
                const bDone = b.percent === 100 ? 1 : 0;
                if (aDone !== bDone) return aDone - bDone;
                return b.percent - a.percent;
            });

            setCourses(built);
            setLoading(false);
        }
        load();
    }, [supabase, router]);

    const inProgress = courses.filter((c) => c.percent < 100);
    const completedCourses = courses.filter((c) => c.total > 0 && c.percent === 100);
    const certificateCount = courses.filter((c) => c.certificateCode).length;
    const totalLessons = courses.reduce((n, c) => n + c.total, 0);
    const doneLessons = courses.reduce((n, c) => n + c.done, 0);
    const overallPercent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    const isStaff = role === "editor" || role === "administrator";
    const continueCourse = inProgress[0] ?? null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-gold mb-1">
                        Academy · Your progress
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-terminal-text">
                        {loading ? "Welcome back" : `Welcome back, ${displayName.split(" ")[0]}`}
                    </h2>
                    <p className="mt-1 text-sm text-terminal-muted">
                        Resume learning, track completion, and access your certificates.
                    </p>
                </div>
                {isStaff && (
                    <Link
                        href="/admin/academy"
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-terminal-gold text-terminal-bg text-xs font-bold"
                    >
                        Academy Admin
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                    label="Enrolled courses"
                    value={loading ? "–" : courses.length}
                    footnote={
                        loading
                            ? "Loading…"
                            : courses.length === 0
                              ? "Not enrolled yet"
                              : `${inProgress.length} in progress`
                    }
                />
                <MetricCard
                    label="Lessons completed"
                    value={loading ? "–" : `${doneLessons}/${totalLessons || 0}`}
                    footnote={loading ? "Loading…" : `${overallPercent}% overall`}
                />
                <MetricCard
                    label="Completed courses"
                    value={loading ? "–" : completedCourses.length}
                    footnote={loading ? "Loading…" : "Fully finished"}
                />
                <MetricCard
                    label="Certificates"
                    value={loading ? "–" : certificateCount}
                    footnote={loading ? "Loading…" : "Earned"}
                />
            </div>

            {!loading && continueCourse && (
                <Card className="border-terminal-gold/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-terminal-gold mb-2">
                                Continue learning
                            </p>
                            <h3 className="text-lg font-semibold text-terminal-text truncate">
                                {continueCourse.title}
                            </h3>
                            <p className="mt-1 text-sm text-terminal-muted font-mono">
                                {continueCourse.done} of {continueCourse.total} lessons · {continueCourse.percent}%
                            </p>
                            <div className="mt-4 max-w-md">
                                <ProgressBar value={continueCourse.percent} size="md" />
                            </div>
                        </div>
                        <div className="shrink-0">
                            <Link
                                href={`/learn/${continueCourse.slug}/lessons`}
                                className="inline-flex items-center px-5 py-2.5 rounded-md bg-terminal-gold text-terminal-bg text-sm font-semibold hover:bg-terminal-gold/90 transition-colors"
                            >
                                Resume course →
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            {!loading && courses.length === 0 && (
                <Card className="text-center py-12">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-terminal-gold mb-2">
                        Academy
                    </p>
                    <h3 className="text-lg font-semibold text-terminal-text mb-2">
                        You are not enrolled in any course yet
                    </h3>
                    <p className="text-sm text-terminal-muted max-w-md mx-auto mb-6">
                        Browse the Academy catalogue and enrol to start structured financial education.
                    </p>
                    <Link
                        href="/academy"
                        className="inline-flex items-center px-5 py-2.5 rounded-md bg-terminal-gold text-terminal-bg text-sm font-semibold"
                    >
                        Explore Academy →
                    </Link>
                </Card>
            )}

            {!loading && courses.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-terminal-text">Your courses</h3>
                        <Link
                            href="/academy"
                            className="text-xs font-mono text-terminal-muted hover:text-terminal-gold transition-colors"
                        >
                            Browse catalogue →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map((c) => (
                            <Card key={c.courseId} hover className="flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold text-terminal-text leading-snug truncate">
                                            {c.title}
                                        </h4>
                                        <p className="mt-1 text-[11px] font-mono text-terminal-muted">
                                            {c.done}/{c.total} lessons
                                            {c.percent === 100 && (
                                                <span className="ml-2 text-terminal-emerald">· Completed</span>
                                            )}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-mono font-bold tabular-nums text-terminal-gold">
                                        {c.percent}%
                                    </span>
                                </div>
                                <ProgressBar value={c.percent} size="sm" className="mb-4" />
                                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                    {c.certificateCode ? (
                                        <Link
                                            href={`/learn/${c.slug}/certificate`}
                                            className="text-xs font-medium text-terminal-emerald hover:underline"
                                        >
                                            View certificate →
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/learn/${c.slug}/lessons`}
                                            className="text-xs font-medium text-terminal-gold hover:underline"
                                        >
                                            {c.percent === 100
                                                ? "Get certificate →"
                                                : c.done > 0
                                                  ? "Continue →"
                                                  : "Start →"}
                                        </Link>
                                    )}
                                    <Link
                                        href={`/learn/${c.slug}`}
                                        className="text-[11px] font-mono text-terminal-muted hover:text-terminal-text"
                                    >
                                        Details
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-sm font-semibold text-terminal-text mb-4">Platform</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        {
                            href: "/ai-opportunities/dashboard",
                            title: "AI Opportunities",
                            detail: "Directory, membership & assistance",
                        },
                        {
                            href: "/research",
                            title: "Research library",
                            detail: "Published market notes & analysis",
                        },
                        {
                            href: "/academy",
                            title: "Academy catalogue",
                            detail: "Enrol in another course",
                        },
                        {
                            href: "/community/killzone",
                            title: "Killzone Journal",
                            detail: "Private trading community",
                        },
                        {
                            href: "/watchlist",
                            title: "Watchlist",
                            detail: "Sample layout · not live prices",
                        },
                        {
                            href: "/journal",
                            title: "Journal",
                            detail: "Sample layout · not your trades",
                        },
                    ].map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Card hover className="h-full">
                                <span className="block text-sm font-semibold text-terminal-text">
                                    {item.title}
                                </span>
                                <span className="mt-1 block text-xs text-terminal-muted">{item.detail}</span>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
