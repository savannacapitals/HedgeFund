"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EmbedInfo = { kind: "iframe" | "video"; src: string } | null;

// Turns a pasted video link into something safe to embed
function getEmbed(url: string | null): EmbedInfo {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.protocol !== "https:") return null;
        const host = u.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
        }
        if (host === "youtube.com" || host === "m.youtube.com") {
            const id = u.searchParams.get("v");
            if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` };
            if (u.pathname.startsWith("/embed/")) {
                return { kind: "iframe", src: `https://www.youtube-nocookie.com${u.pathname}` };
            }
        }
        if (host === "vimeo.com") {
            const id = u.pathname.split("/").filter(Boolean)[0];
            if (id && /^\d+$/.test(id)) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
        }
        if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: "video", src: url };
        return { kind: "iframe", src: url };
    } catch {
        return null;
    }
}

// Renders lesson text safely (no raw HTML). Supports: blank-line paragraphs,
// "## Heading" lines, and bullet lists where every line starts with "- ".
function LessonBody({ text }: { text: string }) {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    return (
        <div className="space-y-4 text-sm leading-relaxed text-terminal-text/90">
            {blocks.map((block, i) => {
                const lines = block.split("\n");
                if (block.startsWith("## ")) {
                    return (
                        <h3 key={i} className="text-lg font-bold text-terminal-text pt-2">
                            {block.replace(/^##\s+/, "")}
                        </h3>
                    );
                }
                if (lines.every((l) => l.trim().startsWith("- "))) {
                    return (
                        <ul key={i} className="list-disc pl-5 space-y-1">
                            {lines.map((l, j) => (
                                <li key={j}>{l.trim().replace(/^-\s+/, "")}</li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <p key={i} className="whitespace-pre-line">
                        {block}
                    </p>
                );
            })}
        </div>
    );
}

export default function LessonPlayerPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [course, setCourse] = useState<any>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [modules, setModules] = useState<any[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

    const [lesson, setLesson] = useState<any>(null);
    const [lessonLoading, setLessonLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizResult, setQuizResult] = useState<any>(null);
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Every lesson in course order
    const orderedLessons = useMemo(
        () => modules.flatMap((m) => m.lessons as any[]),
        [modules]
    );

    const canOpen = (l: any) => isEnrolled || l.is_preview;

    // 1. Load course, access, curriculum and progress
    useEffect(() => {
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
            setUserId(user.id);

            const { data: courseData } = await supabase
                .from("courses")
                .select("id, title, slug")
                .eq("slug", slug)
                .maybeSingle();
            if (!courseData) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setCourse(courseData);

            const { data: enrolment } = await supabase
                .from("course_enrolments")
                .select("status")
                .eq("user_id", user.id)
                .eq("course_id", courseData.id)
                .maybeSingle();
            const enrolled = !!enrolment && ["active", "completed"].includes(enrolment.status);
            setIsEnrolled(enrolled);

            const { data: modulesData } = await supabase
                .from("course_modules")
                .select("id, title, order_index")
                .eq("course_id", courseData.id)
                .order("order_index", { ascending: true });

            const moduleIds = (modulesData ?? []).map((m) => m.id);
            const { data: lessonsData } = moduleIds.length
                ? await supabase
                      .from("course_curriculum")
                      .select("*")
                      .in("module_id", moduleIds)
                      .order("order_index", { ascending: true })
                : { data: [] as any[] };

            const built = (modulesData ?? []).map((m) => ({
                ...m,
                lessons: (lessonsData ?? []).filter((l: any) => l.module_id === m.id),
            }));
            setModules(built);

            const allLessons = built.flatMap((m) => m.lessons as any[]);
            const lessonIds = allLessons.map((l: any) => l.id);

            let done = new Set<string>();
            if (lessonIds.length) {
                const { data: progress } = await supabase
                    .from("lesson_progress")
                    .select("lesson_id, is_completed")
                    .eq("user_id", user.id)
                    .in("lesson_id", lessonIds);
                done = new Set(
                    (progress ?? []).filter((p) => p.is_completed).map((p) => p.lesson_id as string)
                );
            }
            setCompletedIds(done);

            // Start on the first unfinished lesson the user can open
            const openable = allLessons.filter((l: any) => enrolled || l.is_preview);
            const start = openable.find((l: any) => !done.has(l.id)) ?? openable[0] ?? allLessons[0];
            setActiveLessonId(start?.id ?? null);

            setLoading(false);
        }

        load();
    }, [slug, supabase, router]);

    // 2. Load the full content of the selected lesson
    useEffect(() => {
        async function loadLesson() {
            if (!activeLessonId) {
                setLesson(null);
                return;
            }
            setLessonLoading(true);
            setErrorMessage("");

            // Row-level security returns nothing for lessons the user may not open
            const { data } = await supabase
                .from("course_lessons")
                .select("id, title, content_type, content_body, video_url, duration_minutes, is_preview")
                .eq("id", activeLessonId)
                .maybeSingle();

            setLesson(data ?? null);
            setQuizAnswers({});
            setQuizResult(null);
            setQuestions([]);

            if (data && data.content_type === "quiz") {
                // Questions only. The correct answers are never sent to the browser.
                const { data: qs } = await supabase
                    .from("quiz_questions")
                    .select("id, prompt, options, order_index")
                    .eq("lesson_id", data.id)
                    .order("order_index", { ascending: true });
                setQuestions(qs ?? []);
            }
            setLessonLoading(false);
        }
        loadLesson();
    }, [activeLessonId, supabase]);

    const activeIndex = orderedLessons.findIndex((l) => l.id === activeLessonId);
    const previousLesson = activeIndex > 0 ? orderedLessons[activeIndex - 1] : null;
    const nextLesson =
        activeIndex >= 0 && activeIndex < orderedLessons.length - 1 ? orderedLessons[activeIndex + 1] : null;
    const nextOpenable = nextLesson && canOpen(nextLesson) ? nextLesson : null;

    const totalLessons = orderedLessons.length;
    const doneCount = orderedLessons.filter((l) => completedIds.has(l.id)).length;
    const percent = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

    async function saveProgress(lessonId: string, completed: boolean) {
        if (!userId) return;
        const payload = {
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
        };

        // Update first; insert only if there is no row yet
        const { data: updated, error } = await supabase
            .from("lesson_progress")
            .update(payload)
            .eq("user_id", userId)
            .eq("lesson_id", lessonId)
            .select("id");
        if (error) throw error;

        if (!updated || updated.length === 0) {
            const { error: insertError } = await supabase
                .from("lesson_progress")
                .insert({ user_id: userId, lesson_id: lessonId, ...payload });
            if (insertError) throw insertError;
        }

        setCompletedIds((prev) => {
            const next = new Set(prev);
            if (completed) next.add(lessonId);
            else next.delete(lessonId);
            return next;
        });
    }

    async function handleToggleComplete() {
        if (!activeLessonId) return;
        setSaving(true);
        setErrorMessage("");
        try {
            await saveProgress(activeLessonId, !completedIds.has(activeLessonId));
        } catch (err: any) {
            setErrorMessage(err.message || "Could not save your progress.");
        } finally {
            setSaving(false);
        }
    }

    async function handleCompleteAndContinue() {
        if (!activeLessonId) return;
        setSaving(true);
        setErrorMessage("");
        try {
            if (!completedIds.has(activeLessonId)) {
                await saveProgress(activeLessonId, true);
            }
            if (nextOpenable) setActiveLessonId(nextOpenable.id);
        } catch (err: any) {
            setErrorMessage(err.message || "Could not save your progress.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmitQuiz() {
        if (!activeLessonId) return;
        const lessonId = activeLessonId;
        setQuizSubmitting(true);
        setErrorMessage("");
        try {
            const res = await fetch("/api/academy/quizzes/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId, answers: quizAnswers }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Could not submit the quiz.");

            setQuizResult(result);
            if (result.passed) {
                setCompletedIds((prev) => new Set(prev).add(lessonId));
            }
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setQuizSubmitting(false);
        }
    }

    function handleRetryQuiz() {
        setQuizAnswers({});
        setQuizResult(null);
    }

    async function handleGetCertificate() {
        setIssuing(true);
        setErrorMessage("");
        try {
            const res = await fetch("/api/academy/certificates/issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: course.id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Could not issue your certificate.");
            router.push(`/learn/${course.slug}/certificate`);
        } catch (err: any) {
            setErrorMessage(err.message);
            setIssuing(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING COURSE...
            </div>
        );
    }

    if (notFound || !course) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
                <p className="text-terminal-muted text-xs mb-6 font-mono">This course does not exist or is not published.</p>
                <Link href="/academy" className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold">
                    Return to Academy Catalogue
                </Link>
            </div>
        );
    }

    const embed = lesson ? getEmbed(lesson.video_url) : null;
    const isDone = activeLessonId ? completedIds.has(activeLessonId) : false;

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text">
            {/* Top bar */}
            <div className="border-b border-terminal-border bg-terminal-surface/50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <Link
                            href={`/academy/courses/${course.slug}`}
                            className="font-mono text-xs text-terminal-muted hover:text-terminal-text"
                        >
                            ← COURSE OVERVIEW
                        </Link>
                        <h1 className="text-xl font-bold mt-1">{course.title}</h1>
                    </div>
                    {isEnrolled && (
                        <div className="w-full md:w-64">
                            <div className="flex justify-between font-mono text-xs text-terminal-muted mb-1">
                                <span>PROGRESS</span>
                                <span>
                                    {doneCount}/{totalLessons} · {percent}%
                                </span>
                            </div>
                            <div className="h-1.5 rounded bg-terminal-border overflow-hidden">
                                <div
                                    className="h-full bg-terminal-gold transition-all"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!isEnrolled && (
                <div className="bg-terminal-gold/10 border-b border-terminal-gold/30 px-6 py-3 text-xs font-mono text-terminal-gold">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                        <span>You are previewing this course. Enrol to unlock every lesson and track your progress.</span>
                        <Link
                            href={`/academy/courses/${course.slug}`}
                            className="px-3 py-1 rounded bg-terminal-gold text-terminal-bg font-bold"
                        >
                            ENROL
                        </Link>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
                {/* Sidebar */}
                <aside className="space-y-6">
                    {modules.length === 0 && (
                        <p className="text-xs font-mono text-terminal-muted">No lessons have been added yet.</p>
                    )}
                    {modules.map((m, mi) => (
                        <div key={m.id}>
                            <h2 className="font-mono text-xs tracking-wider text-terminal-gold uppercase mb-2">
                                Module {mi + 1} · {m.title}
                            </h2>
                            <ul className="space-y-1">
                                {m.lessons.map((l: any) => {
                                    const open = canOpen(l);
                                    const active = l.id === activeLessonId;
                                    const done = completedIds.has(l.id);
                                    return (
                                        <li key={l.id}>
                                            <button
                                                onClick={() => open && setActiveLessonId(l.id)}
                                                disabled={!open}
                                                className={`w-full text-left px-3 py-2 rounded border text-xs flex items-start gap-3 transition-colors ${
                                                    active
                                                        ? "bg-terminal-surface border-terminal-gold"
                                                        : "border-terminal-border hover:bg-terminal-surface"
                                                } ${!open ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <span
                                                    className={`font-mono mt-0.5 ${
                                                        done ? "text-terminal-emerald" : "text-terminal-muted"
                                                    }`}
                                                >
                                                    {done ? "✓" : open ? "○" : "–"}
                                                </span>
                                                <span className="flex-1">
                                                    <span className="block">{l.title}</span>
                                                    <span className="block font-mono text-terminal-muted mt-0.5">
                                                        {l.content_type}
                                                        {l.duration_minutes ? ` · ${l.duration_minutes} min` : ""}
                                                        {!open ? " · locked" : ""}
                                                        {l.is_preview && !isEnrolled ? " · free preview" : ""}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </aside>

                {/* Lesson area */}
                <main className="min-w-0">
                    {!activeLessonId ? (
                        <p className="text-sm text-terminal-muted font-mono">Select a lesson to begin.</p>
                    ) : lessonLoading ? (
                        <p className="text-xs font-mono text-terminal-muted">LOADING LESSON...</p>
                    ) : !lesson ? (
                        <div className="p-6 rounded-lg bg-terminal-surface border border-terminal-border">
                            <h2 className="font-bold mb-2">This lesson is locked</h2>
                            <p className="text-xs text-terminal-muted mb-4">Enrol in the course to unlock it.</p>
                            <Link
                                href={`/academy/courses/${course.slug}`}
                                className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold"
                            >
                                VIEW COURSE
                            </Link>
                        </div>
                    ) : (
                        <article className="space-y-6">
                            <header>
                                <span className="font-mono text-xs text-terminal-gold uppercase tracking-widest">
                                    {lesson.content_type}
                                    {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ""}
                                </span>
                                <h2 className="text-2xl font-bold mt-1">{lesson.title}</h2>
                            </header>

                            {embed && embed.kind === "iframe" && (
                                <div className="aspect-video w-full rounded-lg overflow-hidden border border-terminal-border bg-black">
                                    <iframe
                                        src={embed.src}
                                        title={lesson.title}
                                        className="w-full h-full"
                                        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                                        allowFullScreen
                                        referrerPolicy="strict-origin-when-cross-origin"
                                    />
                                </div>
                            )}
                            {embed && embed.kind === "video" && (
                                <video
                                    src={embed.src}
                                    controls
                                    className="w-full rounded-lg border border-terminal-border bg-black"
                                />
                            )}

                            {lesson.content_body ? (
                                <LessonBody text={lesson.content_body} />
                            ) : !embed && lesson.content_type !== "quiz" ? (
                                <p className="text-sm text-terminal-muted font-mono">
                                    Content for this lesson is coming soon.
                                </p>
                            ) : null}

                            {lesson.content_type === "quiz" && (
                                <div className="space-y-5">
                                    {questions.length === 0 ? (
                                        <p className="text-sm text-terminal-muted font-mono">
                                            Quiz questions are coming soon.
                                        </p>
                                    ) : (
                                        <>
                                            {!isEnrolled && (
                                                <p className="text-xs font-mono text-terminal-gold">
                                                    Enrol in the course to take this quiz.
                                                </p>
                                            )}
                                            {isEnrolled && isDone && !quizResult && (
                                                <p className="text-xs font-mono text-terminal-emerald">
                                                    You have already passed this quiz. You can retake it any time.
                                                </p>
                                            )}

                                            {questions.map((q, qi) => {
                                                const r = quizResult?.review?.find((x: any) => x.questionId === q.id);
                                                return (
                                                    <fieldset
                                                        key={q.id}
                                                        className="p-4 rounded-lg bg-terminal-surface border border-terminal-border"
                                                    >
                                                        <legend className="text-sm font-bold px-1">
                                                            {qi + 1}. {q.prompt}
                                                        </legend>
                                                        <div className="mt-3 space-y-2">
                                                            {(q.options as string[]).map((opt, oi) => {
                                                                const selected = quizAnswers[q.id] === oi;
                                                                const isRight = !!r && quizResult.passed && r.correctIndex === oi;
                                                                const isWrongPick = !!r && !r.correct && selected;
                                                                return (
                                                                    <label
                                                                        key={oi}
                                                                        className={`flex items-start gap-3 p-3 rounded border text-xs ${
                                                                            isRight
                                                                                ? "border-terminal-emerald bg-terminal-emerald/10"
                                                                                : isWrongPick
                                                                                ? "border-red-400/60 bg-red-400/5"
                                                                                : selected
                                                                                ? "border-terminal-gold"
                                                                                : "border-terminal-border"
                                                                        } ${quizResult || !isEnrolled ? "cursor-default" : "cursor-pointer hover:bg-terminal-bg"}`}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name={q.id}
                                                                            checked={selected}
                                                                            disabled={!!quizResult || !isEnrolled}
                                                                            onChange={() =>
                                                                                setQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))
                                                                            }
                                                                            className="mt-0.5"
                                                                        />
                                                                        <span>{opt}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        {r && (
                                                            <p
                                                                className={`mt-3 text-xs font-mono ${
                                                                    r.correct ? "text-terminal-emerald" : "text-red-400"
                                                                }`}
                                                            >
                                                                {r.correct ? "Correct" : "Incorrect"}
                                                            </p>
                                                        )}
                                                        {r && quizResult.passed && r.explanation && (
                                                            <p className="mt-1 text-xs text-terminal-muted">{r.explanation}</p>
                                                        )}
                                                    </fieldset>
                                                );
                                            })}

                                            {quizResult ? (
                                                <div
                                                    className={`p-4 rounded-lg border text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
                                                        quizResult.passed
                                                            ? "bg-terminal-emerald/10 border-terminal-emerald/30 text-terminal-emerald"
                                                            : "bg-red-400/5 border-red-400/40 text-red-400"
                                                    }`}
                                                >
                                                    <span>
                                                        {quizResult.passed
                                                            ? `Passed: ${quizResult.score}/${quizResult.total} (${quizResult.percent}%)`
                                                            : `Score ${quizResult.percent}%. You need ${quizResult.passPercent}% to pass. Review the lesson and try again.`}
                                                    </span>
                                                    <button
                                                        onClick={handleRetryQuiz}
                                                        className="px-3 py-1.5 rounded border border-current hover:bg-terminal-bg"
                                                    >
                                                        {quizResult.passed ? "RETAKE" : "TRY AGAIN"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleSubmitQuiz}
                                                    disabled={
                                                        !isEnrolled ||
                                                        quizSubmitting ||
                                                        Object.keys(quizAnswers).length < questions.length
                                                    }
                                                    className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-40"
                                                >
                                                    {quizSubmitting ? "MARKING..." : "SUBMIT ANSWERS"}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {errorMessage && <p className="text-xs font-mono text-red-400">{errorMessage}</p>}

                            <footer className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-terminal-border">
                                <button
                                    onClick={() => previousLesson && canOpen(previousLesson) && setActiveLessonId(previousLesson.id)}
                                    disabled={!previousLesson || !canOpen(previousLesson)}
                                    className="px-4 py-2 rounded border border-terminal-border text-xs font-mono hover:bg-terminal-surface disabled:opacity-30"
                                >
                                    ← PREVIOUS
                                </button>

                                {isEnrolled && lesson.content_type === "quiz" ? (
                                    <button
                                        onClick={() => nextOpenable && setActiveLessonId(nextOpenable.id)}
                                        disabled={!nextOpenable || !isDone}
                                        className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-40"
                                    >
                                        {isDone ? "CONTINUE →" : "PASS THE QUIZ TO CONTINUE"}
                                    </button>
                                ) : isEnrolled ? (
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={handleToggleComplete}
                                            disabled={saving}
                                            className="px-4 py-2 rounded border border-terminal-border text-xs font-mono hover:bg-terminal-surface disabled:opacity-50"
                                        >
                                            {isDone ? "✓ COMPLETED (UNDO)" : "MARK COMPLETE"}
                                        </button>
                                        <button
                                            onClick={handleCompleteAndContinue}
                                            disabled={saving || (!nextOpenable && isDone)}
                                            className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-40"
                                        >
                                            {nextOpenable ? "COMPLETE & CONTINUE →" : isDone ? "ALL DONE" : "COMPLETE LESSON"}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => nextOpenable && setActiveLessonId(nextOpenable.id)}
                                        disabled={!nextOpenable}
                                        className="px-4 py-2 rounded border border-terminal-border text-xs font-mono hover:bg-terminal-surface disabled:opacity-30"
                                    >
                                        NEXT →
                                    </button>
                                )}
                            </footer>

                            {isEnrolled && totalLessons > 0 && doneCount === totalLessons && (
                                <div className="p-4 rounded-lg bg-terminal-emerald/10 border border-terminal-emerald/30 text-xs font-mono text-terminal-emerald flex flex-wrap items-center justify-between gap-3">
                                    <span>You have completed every lesson in this course.</span>
                                    <button
                                        onClick={handleGetCertificate}
                                        disabled={issuing}
                                        className="px-4 py-2 rounded bg-terminal-gold text-terminal-bg font-bold hover:bg-terminal-gold/90 disabled:opacity-50"
                                    >
                                        {issuing ? "ISSUING..." : "GET YOUR CERTIFICATE"}
                                    </button>
                                </div>
                            )}
                        </article>
                    )}
                </main>
            </div>
        </div>
    );
}
