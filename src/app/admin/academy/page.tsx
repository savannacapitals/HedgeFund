"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputCls =
    "w-full px-3 py-2 rounded bg-terminal-bg border border-terminal-border text-xs font-mono focus:outline-none focus:border-terminal-gold";
const btnCls =
    "px-3 py-1.5 rounded border border-terminal-border text-xs font-mono hover:bg-terminal-bg disabled:opacity-40";
const primaryBtnCls =
    "px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-40";
const dangerBtnCls =
    "px-3 py-1.5 rounded border border-red-400/50 text-red-400 text-xs font-mono hover:bg-red-400/10 disabled:opacity-40";

async function api(body: any) {
    const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed.");
    return json;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-terminal-muted mb-1">{label}</span>
            {children}
        </label>
    );
}

type Run = (fn: () => Promise<any>, success?: string) => Promise<void>;

// ---------------------------------------------------------------- questions

function QuestionEditor({
    question,
    index,
    run,
}: {
    question: any;
    index: number;
    run: Run;
}) {
    const [prompt, setPrompt] = useState<string>(question.prompt);
    const [optionsText, setOptionsText] = useState<string>((question.options as string[]).join("\n"));
    const [correct, setCorrect] = useState<number>(question.correct_index);
    const [explanation, setExplanation] = useState<string>(question.explanation || "");

    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);

    return (
        <div className="p-3 rounded border border-terminal-border bg-terminal-bg space-y-3">
            <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-terminal-gold">QUESTION {index + 1}</span>
                <div className="flex gap-2">
                    <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "question", id: question.id, direction: "up" }))}>↑</button>
                    <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "question", id: question.id, direction: "down" }))}>↓</button>
                </div>
            </div>
            <Field label="Question">
                <input className={inputCls} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </Field>
            <Field label="Answer options (one per line, 2 to 6)">
                <textarea className={inputCls} rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </Field>
            <Field label="Correct answer">
                <select className={inputCls} value={correct} onChange={(e) => setCorrect(Number(e.target.value))}>
                    {options.map((o, i) => (
                        <option key={i} value={i}>
                            {i + 1}. {o.length > 70 ? o.slice(0, 70) + "…" : o}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Explanation (shown after the learner passes)">
                <input className={inputCls} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            </Field>
            <div className="flex gap-2">
                <button
                    className={primaryBtnCls}
                    onClick={() =>
                        run(
                            () =>
                                api({
                                    action: "question.save",
                                    id: question.id,
                                    prompt,
                                    options,
                                    correct_index: Math.min(correct, Math.max(options.length - 1, 0)),
                                    explanation,
                                }),
                            "Question saved."
                        )
                    }
                >
                    SAVE QUESTION
                </button>
                <button
                    className={dangerBtnCls}
                    onClick={() => {
                        if (confirm("Delete this question?")) run(() => api({ action: "question.delete", id: question.id }), "Question deleted.");
                    }}
                >
                    DELETE
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- lessons

function LessonEditor({
    lesson,
    index,
    isAdmin,
    run,
}: {
    lesson: any;
    index: number;
    isAdmin: boolean;
    run: Run;
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>(lesson.title);
    const [contentType, setContentType] = useState<string>(lesson.content_type || "reading");
    const [duration, setDuration] = useState<string>(String(lesson.duration_minutes ?? 0));
    const [isPreview, setIsPreview] = useState<boolean>(!!lesson.is_preview);
    const [videoUrl, setVideoUrl] = useState<string>(lesson.video_url || "");
    const [body, setBody] = useState<string>(lesson.content_body || "");
    const [passPercent, setPassPercent] = useState<string>(String(lesson.pass_percent ?? 70));

    return (
        <div className="rounded border border-terminal-border bg-terminal-surface">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs"
            >
                <span>
                    <span className="font-mono text-terminal-muted mr-2">{index + 1}.</span>
                    {lesson.title}
                </span>
                <span className="font-mono text-terminal-muted">
                    {lesson.content_type}
                    {lesson.is_preview ? " · preview" : ""}
                    {lesson.content_type === "quiz" ? ` · ${lesson.questions.length} q` : ""} {open ? "▲" : "▼"}
                </span>
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-3 border-t border-terminal-border pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <Field label="Lesson title">
                                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Type">
                            <select className={inputCls} value={contentType} onChange={(e) => setContentType(e.target.value)}>
                                <option value="video">video</option>
                                <option value="reading">reading</option>
                                <option value="quiz">quiz</option>
                                <option value="assignment">assignment</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Duration (minutes)">
                            <input className={inputCls} type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
                        </Field>
                        {contentType === "quiz" && (
                            <Field label="Pass mark (%)">
                                <input className={inputCls} type="number" min={1} max={100} value={passPercent} onChange={(e) => setPassPercent(e.target.value)} />
                            </Field>
                        )}
                        <label className="flex items-center gap-2 text-xs font-mono mt-5">
                            <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} />
                            Free preview (visible without enrolling)
                        </label>
                    </div>

                    <Field label="Video link (https, optional: YouTube, Vimeo or .mp4)">
                        <input className={inputCls} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
                    </Field>

                    <Field label="Lesson text (use ## for headings, blank lines between paragraphs, - for bullets)">
                        <textarea className={inputCls} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
                    </Field>

                    <div className="flex flex-wrap gap-2">
                        <button
                            className={primaryBtnCls}
                            onClick={() =>
                                run(
                                    () =>
                                        api({
                                            action: "lesson.save",
                                            id: lesson.id,
                                            title,
                                            content_type: contentType,
                                            duration_minutes: duration === "" ? 0 : Number(duration),
                                            is_preview: isPreview,
                                            video_url: videoUrl,
                                            content_body: body,
                                            pass_percent: passPercent === "" ? 70 : Number(passPercent),
                                        }),
                                    "Lesson saved."
                                )
                            }
                        >
                            SAVE LESSON
                        </button>
                        <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "lesson", id: lesson.id, direction: "up" }))}>↑ UP</button>
                        <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "lesson", id: lesson.id, direction: "down" }))}>↓ DOWN</button>
                        {isAdmin && (
                            <button
                                className={dangerBtnCls}
                                onClick={() => {
                                    if (confirm(`Delete the lesson "${lesson.title}"? Learner progress on it is removed too.`))
                                        run(() => api({ action: "lesson.delete", id: lesson.id }), "Lesson deleted.");
                                }}
                            >
                                DELETE LESSON
                            </button>
                        )}
                    </div>

                    {lesson.content_type === "quiz" && (
                        <div className="space-y-3 pt-3 border-t border-terminal-border">
                            <h4 className="font-mono text-xs text-terminal-gold uppercase tracking-wider">Quiz questions</h4>
                            {contentType !== "quiz" && (
                                <p className="text-xs font-mono text-terminal-muted">Save the lesson to finish changing its type.</p>
                            )}
                            {lesson.questions.length === 0 && (
                                <p className="text-xs font-mono text-terminal-muted">No questions yet.</p>
                            )}
                            {lesson.questions.map((q: any, qi: number) => (
                                <QuestionEditor key={q.id} question={q} index={qi} run={run} />
                            ))}
                            <button
                                className={btnCls}
                                onClick={() =>
                                    run(
                                        () =>
                                            api({
                                                action: "question.save",
                                                lesson_id: lesson.id,
                                                prompt: "New question",
                                                options: ["Option A", "Option B"],
                                                correct_index: 0,
                                                explanation: "",
                                            }),
                                        "Question added. Edit it below."
                                    )
                                }
                            >
                                + ADD QUESTION
                            </button>
                        </div>
                    )}
                    {lesson.content_type !== "quiz" && contentType === "quiz" && (
                        <p className="text-xs font-mono text-terminal-muted">
                            Save this lesson as a quiz, then you can add questions here.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- modules

function ModuleCard({
    module,
    index,
    isAdmin,
    run,
}: {
    module: any;
    index: number;
    isAdmin: boolean;
    run: Run;
}) {
    const [title, setTitle] = useState<string>(module.title);
    const [description, setDescription] = useState<string>(module.description || "");

    return (
        <div className="p-4 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-terminal-gold uppercase tracking-wider">Module {index + 1}</span>
                <div className="flex gap-2">
                    <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "module", id: module.id, direction: "up" }))}>↑</button>
                    <button className={btnCls} onClick={() => run(() => api({ action: "reorder", kind: "module", id: module.id, direction: "down" }))}>↓</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Module title">
                    <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Short description">
                    <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
            </div>

            <div className="flex gap-2">
                <button
                    className={primaryBtnCls}
                    onClick={() => run(() => api({ action: "module.save", id: module.id, title, description }), "Module saved.")}
                >
                    SAVE MODULE
                </button>
                {isAdmin && (
                    <button
                        className={dangerBtnCls}
                        onClick={() => {
                            if (confirm(`Delete the module "${module.title}" and all its lessons?`))
                                run(() => api({ action: "module.delete", id: module.id }), "Module deleted.");
                        }}
                    >
                        DELETE MODULE
                    </button>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-terminal-border">
                {module.lessons.length === 0 && <p className="text-xs font-mono text-terminal-muted">No lessons yet.</p>}
                {module.lessons.map((l: any, li: number) => (
                    <LessonEditor key={l.id} lesson={l} index={li} isAdmin={isAdmin} run={run} />
                ))}
                <button
                    className={btnCls}
                    onClick={() =>
                        run(
                            () => api({ action: "lesson.save", module_id: module.id, title: "New lesson", content_type: "reading" }),
                            "Lesson added. Open it to edit."
                        )
                    }
                >
                    + ADD LESSON
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- course form

function CourseForm({
    course,
    enrolments,
    isAdmin,
    onSaved,
    onDeleted,
    run,
}: {
    course: any | null;
    enrolments: number;
    isAdmin: boolean;
    onSaved: (id: string) => void;
    onDeleted: () => void;
    run: Run;
}) {
    const [title, setTitle] = useState<string>(course?.title || "");
    const [slug, setSlug] = useState<string>(course?.slug || "");
    const [description, setDescription] = useState<string>(course?.description || "");
    const [price, setPrice] = useState<string>(String(course?.price ?? 0));
    const [currency, setCurrency] = useState<string>(course?.currency || "USD");
    const [category, setCategory] = useState<string>(course?.category || "");
    const [level, setLevel] = useState<string>(course?.level || "");
    const [duration, setDuration] = useState<string>(course?.duration_hours != null ? String(course.duration_hours) : "");
    const [published, setPublished] = useState<boolean>(!!course?.is_published);

    return (
        <div className="p-5 rounded-lg bg-terminal-surface border border-terminal-border space-y-4">
            <h2 className="font-bold">{course ? "Course details" : "New course"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Title">
                    <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Slug (web address, e.g. stock-investing-basics)">
                    <input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} />
                </Field>
            </div>

            <Field label="Description">
                <textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Field label="Price (0 = free)">
                    <input className={inputCls} type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
                <Field label="Currency">
                    <input className={inputCls} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                </Field>
                <Field label="Category">
                    <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
                </Field>
                <Field label="Level">
                    <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)}>
                        <option value="">Not set</option>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                    </select>
                </Field>
                <Field label="Duration (hours)">
                    <input className={inputCls} type="number" min={0} step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </Field>
            </div>

            {course && (
                <label className="flex items-center gap-2 text-xs font-mono">
                    <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                    Published (visible in the catalogue). Needs at least one lesson, and every quiz needs questions.
                </label>
            )}
            {!course && (
                <p className="text-xs font-mono text-terminal-muted">
                    New courses start as drafts. Add modules and lessons, then come back to publish.
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <button
                    className={primaryBtnCls}
                    onClick={() =>
                        run(async () => {
                            const result = await api({
                                action: "course.save",
                                id: course?.id,
                                title,
                                slug,
                                description,
                                price,
                                currency,
                                category,
                                level,
                                duration_hours: duration,
                                is_published: published,
                            });
                            onSaved(result.id);
                        }, "Course saved.")
                    }
                >
                    {course ? "SAVE COURSE" : "CREATE COURSE"}
                </button>
                {course && course.is_published && (
                    <Link href={`/academy/courses/${course.slug}`} target="_blank" className={btnCls}>
                        VIEW LIVE PAGE ↗
                    </Link>
                )}
                {course && isAdmin && (
                    <button
                        className={dangerBtnCls}
                        onClick={() => {
                            if (enrolments > 0) {
                                alert("This course has learners. Untick Published and save instead of deleting it.");
                                return;
                            }
                            if (confirm(`Delete the course "${course.title}" and everything in it?`))
                                run(async () => {
                                    await api({ action: "course.delete", id: course.id });
                                    onDeleted();
                                }, "Course deleted.");
                        }}
                    >
                        DELETE COURSE
                    </button>
                )}
            </div>
            {course && <p className="text-xs font-mono text-terminal-muted">{enrolments} enrolled learner(s)</p>}
        </div>
    );
}

// ---------------------------------------------------------------- page

export default function AcademyAdminPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState("");
    const [role, setRole] = useState("");
    const [courses, setCourses] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | "new" | null>(null);
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(false);
    const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

    const isAdmin = role === "administrator";

    const loadList = useCallback(async () => {
        const res = await fetch("/api/admin/academy");
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
            router.push("/login");
            return;
        }
        if (!res.ok) {
            setDenied(json.error || "You do not have access to this area.");
            setLoading(false);
            return;
        }
        setRole(json.role);
        setCourses(json.courses);
        setLoading(false);
    }, [router]);

    const loadTree = useCallback(async (id: string) => {
        setTreeLoading(true);
        const res = await fetch(`/api/admin/academy?courseId=${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok) setTree(json);
        else setNotice({ kind: "error", text: json.error || "Could not load the course." });
        setTreeLoading(false);
    }, []);

    useEffect(() => {
        loadList();
    }, [loadList]);

    useEffect(() => {
        if (selected && selected !== "new") loadTree(selected);
        else setTree(null);
    }, [selected, loadTree]);

    // Runs an action, shows the result, then refreshes the data on screen
    const run: Run = async (fn, success) => {
        setNotice(null);
        try {
            await fn();
            if (success) setNotice({ kind: "ok", text: success });
            await loadList();
            if (selected && selected !== "new") await loadTree(selected);
        } catch (err: any) {
            setNotice({ kind: "error", text: err.message || "Something went wrong." });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center font-mono text-xs">
                LOADING ACADEMY ADMIN...
            </div>
        );
    }

    if (denied) {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">No access</h1>
                <p className="text-terminal-muted text-xs font-mono">{denied}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-border pb-5 mb-6">
                    <div>
                        <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">ACADEMY ADMIN</span>
                        <h1 className="text-2xl font-bold mt-1">Courses, lessons and quizzes</h1>
                    </div>
                    <span className="px-3 py-1.5 rounded bg-terminal-surface border border-terminal-border text-xs font-mono text-terminal-gold">
                        ROLE: {role.toUpperCase()}
                    </span>
                </div>

                {notice && (
                    <div
                        className={`mb-5 p-3 rounded border text-xs font-mono ${
                            notice.kind === "ok"
                                ? "border-terminal-emerald/40 bg-terminal-emerald/10 text-terminal-emerald"
                                : "border-red-400/40 bg-red-400/5 text-red-400"
                        }`}
                    >
                        {notice.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                    {/* Course list */}
                    <aside className="space-y-3">
                        <button className={`${primaryBtnCls} w-full`} onClick={() => setSelected("new")}>
                            + NEW COURSE
                        </button>
                        {courses.length === 0 && (
                            <p className="text-xs font-mono text-terminal-muted">No courses yet.</p>
                        )}
                        {courses.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelected(c.id)}
                                className={`w-full text-left p-3 rounded border text-xs transition-colors ${
                                    selected === c.id
                                        ? "border-terminal-gold bg-terminal-surface"
                                        : "border-terminal-border hover:bg-terminal-surface"
                                }`}
                            >
                                <span className="block font-bold">{c.title}</span>
                                <span className="block font-mono text-terminal-muted mt-1">
                                    {c.is_published ? "PUBLISHED" : "DRAFT"} ·{" "}
                                    {Number(c.price) === 0 ? "free" : `${c.currency} ${Number(c.price)}`} · {c.enrolments} enrolled
                                </span>
                            </button>
                        ))}
                    </aside>

                    {/* Editor */}
                    <main className="min-w-0 space-y-6">
                        {!selected && (
                            <p className="text-sm font-mono text-terminal-muted">
                                Choose a course on the left, or create a new one.
                            </p>
                        )}

                        {selected === "new" && (
                            <CourseForm
                                key="new"
                                course={null}
                                enrolments={0}
                                isAdmin={isAdmin}
                                run={run}
                                onSaved={(id) => setSelected(id)}
                                onDeleted={() => setSelected(null)}
                            />
                        )}

                        {selected && selected !== "new" && treeLoading && !tree && (
                            <p className="text-xs font-mono text-terminal-muted">LOADING COURSE...</p>
                        )}

                        {selected && selected !== "new" && tree && tree.course.id === selected && (
                            <>
                                <CourseForm
                                    key={tree.course.id}
                                    course={tree.course}
                                    enrolments={tree.enrolments}
                                    isAdmin={isAdmin}
                                    run={run}
                                    onSaved={(id) => setSelected(id)}
                                    onDeleted={() => setSelected(null)}
                                />

                                <div className="space-y-4">
                                    <h2 className="font-bold">Modules and lessons</h2>
                                    {tree.modules.length === 0 && (
                                        <p className="text-xs font-mono text-terminal-muted">No modules yet.</p>
                                    )}
                                    {tree.modules.map((m: any, mi: number) => (
                                        <ModuleCard key={m.id} module={m} index={mi} isAdmin={isAdmin} run={run} />
                                    ))}
                                    <button
                                        className={btnCls}
                                        onClick={() =>
                                            run(
                                                () => api({ action: "module.save", course_id: tree.course.id, title: "New module" }),
                                                "Module added."
                                            )
                                        }
                                    >
                                        + ADD MODULE
                                    </button>
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
