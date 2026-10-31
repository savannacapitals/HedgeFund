import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAFF_ROLES } from "@/lib/auth/staff";

/**
 * Academy content management. Every read and write for the admin screen goes through here.
 * Editors and administrators only. Deleting is limited to administrators.
 */

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const CONTENT_TYPES = ["video", "reading", "quiz", "assignment"];

class HttpError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

// ---------- access control ----------

async function requireStaff() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new HttpError("Please sign in.", 401);

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !STAFF_ROLES.includes(profile.role)) {
        throw new HttpError("You do not have access to this area.", 403);
    }
    return { admin, role: profile.role as string, isAdmin: profile.role === "administrator" };
}

// ---------- validation helpers ----------

function text(value: any, label: string, { max, required = false }: { max: number; required?: boolean }) {
    const v = typeof value === "string" ? value.trim() : "";
    if (required && !v) throw new HttpError(`${label} is required.`);
    if (v.length > max) throw new HttpError(`${label} is too long (max ${max} characters).`);
    return v;
}

function whole(value: any, label: string, min: number, max: number) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw new HttpError(`${label} must be a whole number from ${min} to ${max}.`);
    }
    return n;
}

function dbError(error: any) {
    if (error?.code === "23505") return new HttpError("That value is already in use (slugs must be unique).", 409);
    return new HttpError(error?.message || "Database error.", 500);
}

async function nextOrder(admin: any, table: string, parentCol: string, parentId: string) {
    const { data } = await admin
        .from(table)
        .select("order_index")
        .eq(parentCol, parentId)
        .order("order_index", { ascending: false })
        .limit(1);
    return data && data.length ? Number(data[0].order_index) + 1 : 0;
}

// ---------- reads ----------

export async function GET(request: Request) {
    try {
        const { admin, role } = await requireStaff();
        const courseId = new URL(request.url).searchParams.get("courseId");

        // Course list
        if (!courseId) {
            const { data: courses, error } = await admin
                .from("courses")
                .select("id, title, slug, is_published, price, currency")
                .order("created_at", { ascending: false });
            if (error) throw dbError(error);

            const { data: enrolments } = await admin.from("course_enrolments").select("course_id");
            const counts = new Map<string, number>();
            (enrolments ?? []).forEach((e) => counts.set(e.course_id, (counts.get(e.course_id) ?? 0) + 1));

            return NextResponse.json({
                role,
                courses: (courses ?? []).map((c) => ({ ...c, enrolments: counts.get(c.id) ?? 0 })),
            });
        }

        // One course with modules, lessons, questions and answers
        const { data: course } = await admin.from("courses").select("*").eq("id", courseId).maybeSingle();
        if (!course) throw new HttpError("Course not found.", 404);

        const { data: modules } = await admin
            .from("course_modules")
            .select("*")
            .eq("course_id", courseId)
            .order("order_index", { ascending: true })
            .order("created_at", { ascending: true });

        const moduleIds = (modules ?? []).map((m) => m.id);
        const { data: lessons } = moduleIds.length
            ? await admin
                  .from("course_lessons")
                  .select("*")
                  .in("module_id", moduleIds)
                  .order("order_index", { ascending: true })
                  .order("created_at", { ascending: true })
            : { data: [] as any[] };

        const quizIds = (lessons ?? []).filter((l: any) => l.content_type === "quiz").map((l: any) => l.id);
        const { data: questions } = quizIds.length
            ? await admin
                  .from("quiz_questions")
                  .select("*")
                  .in("lesson_id", quizIds)
                  .order("order_index", { ascending: true })
                  .order("created_at", { ascending: true })
            : { data: [] as any[] };

        const questionIds = (questions ?? []).map((q: any) => q.id);
        const { data: answers } = questionIds.length
            ? await admin.from("quiz_answers").select("*").in("question_id", questionIds)
            : { data: [] as any[] };
        const answerById = new Map((answers ?? []).map((a: any) => [a.question_id, a]));

        const { count: enrolmentCount } = await admin
            .from("course_enrolments")
            .select("id", { count: "exact", head: true })
            .eq("course_id", courseId);

        const tree = (modules ?? []).map((m: any) => ({
            ...m,
            lessons: (lessons ?? [])
                .filter((l: any) => l.module_id === m.id)
                .map((l: any) => ({
                    ...l,
                    questions: (questions ?? [])
                        .filter((q: any) => q.lesson_id === l.id)
                        .map((q: any) => ({
                            ...q,
                            correct_index: answerById.get(q.id)?.correct_index ?? 0,
                            explanation: answerById.get(q.id)?.explanation ?? "",
                        })),
                })),
        }));

        return NextResponse.json({ role, course, enrolments: enrolmentCount ?? 0, modules: tree });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error." }, { status: err.status || 500 });
    }
}

// ---------- writes ----------

export async function POST(request: Request) {
    try {
        // Refuse anything that is not a JSON request (blocks cross-site form posts)
        if (!(request.headers.get("content-type") || "").includes("application/json")) {
            throw new HttpError("Unsupported request.", 415);
        }

        const { admin, isAdmin } = await requireStaff();
        const body = await request.json();
        const action = body?.action as string;

        const adminOnly = () => {
            if (!isAdmin) throw new HttpError("Only administrators can delete content.", 403);
        };

        switch (action) {
            // ---------------- courses ----------------
            case "course.save": {
                const title = text(body.title, "Title", { max: 150, required: true });
                const slug = text(body.slug, "Slug", { max: 80, required: true }).toLowerCase();
                if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
                    throw new HttpError("Slug may only contain lowercase letters, numbers and single hyphens.");
                }
                const price = Number(body.price);
                if (!Number.isFinite(price) || price < 0 || price > 100000) {
                    throw new HttpError("Price must be a number from 0 to 100000.");
                }
                const currency = text(body.currency || "USD", "Currency", { max: 3 }).toUpperCase();
                if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError("Currency must be a 3-letter code such as USD.");

                const level = text(body.level, "Level", { max: 20 });
                if (level && !LEVELS.includes(level)) throw new HttpError("Level must be Beginner, Intermediate or Advanced.");

                let duration: number | null = null;
                if (body.duration_hours !== "" && body.duration_hours !== null && body.duration_hours !== undefined) {
                    duration = Number(body.duration_hours);
                    if (!Number.isFinite(duration) || duration < 0 || duration > 999) {
                        throw new HttpError("Duration must be a number of hours from 0 to 999.");
                    }
                }

                const row = {
                    title,
                    slug,
                    description: text(body.description, "Description", { max: 4000 }) || null,
                    price,
                    currency,
                    category: text(body.category, "Category", { max: 60 }) || null,
                    level: level || null,
                    duration_hours: duration,
                    is_published: !!body.is_published,
                    updated_at: new Date().toISOString(),
                };

                // Do not publish an empty course, or a quiz nobody can pass
                if (row.is_published && body.id) {
                    const { data: modules } = await admin.from("course_modules").select("id").eq("course_id", body.id);
                    const moduleIds = (modules ?? []).map((m) => m.id);
                    const { data: lessons } = moduleIds.length
                        ? await admin.from("course_lessons").select("id, title, content_type").in("module_id", moduleIds)
                        : { data: [] as any[] };
                    if (!lessons || lessons.length === 0) {
                        throw new HttpError("Add at least one lesson before publishing.");
                    }
                    for (const l of lessons.filter((x: any) => x.content_type === "quiz")) {
                        const { count } = await admin
                            .from("quiz_questions")
                            .select("id", { count: "exact", head: true })
                            .eq("lesson_id", l.id);
                        if (!count) throw new HttpError(`The quiz "${l.title}" has no questions yet.`);
                    }
                } else if (row.is_published && !body.id) {
                    throw new HttpError("Save the course first, add lessons, then publish it.");
                }

                if (body.id) {
                    const { error } = await admin.from("courses").update(row).eq("id", body.id);
                    if (error) throw dbError(error);
                    return NextResponse.json({ ok: true, id: body.id });
                }
                const { data, error } = await admin.from("courses").insert(row).select("id").single();
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true, id: data.id });
            }

            case "course.delete": {
                adminOnly();
                const { count: enrolled } = await admin
                    .from("course_enrolments")
                    .select("id", { count: "exact", head: true })
                    .eq("course_id", body.id);
                const { count: certs } = await admin
                    .from("certificates")
                    .select("id", { count: "exact", head: true })
                    .eq("course_id", body.id);
                if (enrolled || certs) {
                    throw new HttpError(
                        "This course has learners or certificates attached. Unpublish it instead of deleting it.",
                        409
                    );
                }
                const { error } = await admin.from("courses").delete().eq("id", body.id);
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true });
            }

            // ---------------- modules ----------------
            case "module.save": {
                const row: any = {
                    title: text(body.title, "Module title", { max: 150, required: true }),
                    description: text(body.description, "Module description", { max: 1000 }) || null,
                };
                if (body.id) {
                    const { error } = await admin.from("course_modules").update(row).eq("id", body.id);
                    if (error) throw dbError(error);
                    return NextResponse.json({ ok: true, id: body.id });
                }
                if (!body.course_id) throw new HttpError("Missing course.");
                row.course_id = body.course_id;
                row.order_index = await nextOrder(admin, "course_modules", "course_id", body.course_id);
                const { data, error } = await admin.from("course_modules").insert(row).select("id").single();
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true, id: data.id });
            }

            case "module.delete": {
                adminOnly();
                const { error } = await admin.from("course_modules").delete().eq("id", body.id);
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true });
            }

            // ---------------- lessons ----------------
            case "lesson.save": {
                const contentType = text(body.content_type || "reading", "Lesson type", { max: 20 });
                if (!CONTENT_TYPES.includes(contentType)) throw new HttpError("Unknown lesson type.");

                const videoUrl = text(body.video_url, "Video link", { max: 500 });
                if (videoUrl) {
                    let parsed: URL;
                    try {
                        parsed = new URL(videoUrl);
                    } catch {
                        throw new HttpError("The video link is not a valid URL.");
                    }
                    if (parsed.protocol !== "https:") throw new HttpError("The video link must start with https://");
                }

                const row: any = {
                    title: text(body.title, "Lesson title", { max: 150, required: true }),
                    content_type: contentType,
                    content_body: text(body.content_body, "Lesson text", { max: 60000 }) || null,
                    video_url: videoUrl || null,
                    duration_minutes: whole(body.duration_minutes ?? 0, "Duration", 0, 1000),
                    is_preview: !!body.is_preview,
                    pass_percent: whole(body.pass_percent ?? 70, "Pass mark", 1, 100),
                };
                if (body.id) {
                    const { error } = await admin.from("course_lessons").update(row).eq("id", body.id);
                    if (error) throw dbError(error);
                    return NextResponse.json({ ok: true, id: body.id });
                }
                if (!body.module_id) throw new HttpError("Missing module.");
                row.module_id = body.module_id;
                row.order_index = await nextOrder(admin, "course_lessons", "module_id", body.module_id);
                const { data, error } = await admin.from("course_lessons").insert(row).select("id").single();
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true, id: data.id });
            }

            case "lesson.delete": {
                adminOnly();
                const { error } = await admin.from("course_lessons").delete().eq("id", body.id);
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true });
            }

            // ---------------- quiz questions ----------------
            case "question.save": {
                const prompt = text(body.prompt, "Question", { max: 500, required: true });
                const options = (Array.isArray(body.options) ? body.options : [])
                    .map((o: any) => (typeof o === "string" ? o.trim() : ""))
                    .filter(Boolean);
                if (options.length < 2 || options.length > 6) {
                    throw new HttpError("Give between 2 and 6 answer options.");
                }
                if (options.some((o: string) => o.length > 300)) throw new HttpError("An answer option is too long.");
                const correct = whole(body.correct_index, "Correct answer", 0, options.length - 1);
                const explanation = text(body.explanation, "Explanation", { max: 500 });

                let questionId = body.id as string | undefined;
                if (questionId) {
                    const { error } = await admin
                        .from("quiz_questions")
                        .update({ prompt, options })
                        .eq("id", questionId);
                    if (error) throw dbError(error);
                } else {
                    if (!body.lesson_id) throw new HttpError("Missing lesson.");
                    const order = await nextOrder(admin, "quiz_questions", "lesson_id", body.lesson_id);
                    const { data, error } = await admin
                        .from("quiz_questions")
                        .insert({ lesson_id: body.lesson_id, prompt, options, order_index: order })
                        .select("id")
                        .single();
                    if (error) throw dbError(error);
                    questionId = data.id;
                }

                const { error: answerError } = await admin
                    .from("quiz_answers")
                    .upsert(
                        { question_id: questionId, correct_index: correct, explanation: explanation || null },
                        { onConflict: "question_id" }
                    );
                if (answerError) throw dbError(answerError);
                return NextResponse.json({ ok: true, id: questionId });
            }

            case "question.delete": {
                const { error } = await admin.from("quiz_questions").delete().eq("id", body.id);
                if (error) throw dbError(error);
                return NextResponse.json({ ok: true });
            }

            // ---------------- ordering ----------------
            case "reorder": {
                const config: Record<string, { table: string; parent: string }> = {
                    module: { table: "course_modules", parent: "course_id" },
                    lesson: { table: "course_lessons", parent: "module_id" },
                    question: { table: "quiz_questions", parent: "lesson_id" },
                };
                const cfg = config[body.kind];
                if (!cfg || !["up", "down"].includes(body.direction)) throw new HttpError("Invalid reorder request.");

                const { data: row } = await admin.from(cfg.table).select(`id, ${cfg.parent}`).eq("id", body.id).maybeSingle();
                if (!row) throw new HttpError("Item not found.", 404);

                const { data: siblings } = await admin
                    .from(cfg.table)
                    .select("id, order_index")
                    .eq(cfg.parent, (row as any)[cfg.parent])
                    .order("order_index", { ascending: true })
                    .order("created_at", { ascending: true });

                const list = siblings ?? [];
                const from = list.findIndex((s) => s.id === body.id);
                const to = body.direction === "up" ? from - 1 : from + 1;
                if (from < 0 || to < 0 || to >= list.length) return NextResponse.json({ ok: true });

                [list[from], list[to]] = [list[to], list[from]];
                for (let i = 0; i < list.length; i++) {
                    if (Number(list[i].order_index) !== i) {
                        const { error } = await admin.from(cfg.table).update({ order_index: i }).eq("id", list[i].id);
                        if (error) throw dbError(error);
                    }
                }
                return NextResponse.json({ ok: true });
            }

            default:
                throw new HttpError("Unknown action.");
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error." }, { status: err.status || 500 });
    }
}
