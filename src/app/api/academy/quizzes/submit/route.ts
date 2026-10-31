import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    let lessonId: string | undefined;
    let answers: Record<string, any> | undefined;
    try {
        ({ lessonId, answers } = await request.json());
    } catch {
        // handled below
    }
    if (!lessonId || !answers || typeof answers !== "object") {
        return NextResponse.json({ error: "Missing quiz answers." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. The lesson must be a quiz, in a course the user is enrolled in
    const { data: lesson } = await admin
        .from("course_lessons")
        .select("id, content_type, pass_percent, module_id")
        .eq("id", lessonId)
        .maybeSingle();
    if (!lesson || lesson.content_type !== "quiz") {
        return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const { data: moduleRow } = await admin
        .from("course_modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .maybeSingle();
    if (!moduleRow) {
        return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const { data: enrolment } = await admin
        .from("course_enrolments")
        .select("status")
        .eq("user_id", user.id)
        .eq("course_id", moduleRow.course_id)
        .maybeSingle();
    if (!enrolment || !["active", "completed"].includes(enrolment.status)) {
        return NextResponse.json({ error: "Enrol in this course to take the quiz." }, { status: 403 });
    }

    // 2. Questions and the answer key (the key never leaves the server unless the quiz is passed)
    const { data: questions } = await admin
        .from("quiz_questions")
        .select("id")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });
    if (!questions || questions.length === 0) {
        return NextResponse.json({ error: "This quiz has no questions yet." }, { status: 409 });
    }

    const { data: keyRows } = await admin
        .from("quiz_answers")
        .select("question_id, correct_index, explanation")
        .in("question_id", questions.map((q) => q.id));
    const key = new Map((keyRows ?? []).map((k) => [k.question_id, k]));
    if (questions.some((q) => !key.has(q.id))) {
        return NextResponse.json({ error: "This quiz is not fully set up yet." }, { status: 500 });
    }

    // 3. Score it. A missing or invalid answer counts as wrong.
    let correctCount = 0;
    const graded = questions.map((q) => {
        const entry = key.get(q.id);
        const given = answers![q.id];
        const correct = Number.isInteger(given) && given === entry.correct_index;
        if (correct) correctCount++;
        return { questionId: q.id, correct, correctIndex: entry.correct_index, explanation: entry.explanation };
    });

    const total = questions.length;
    const percent = Math.round((correctCount / total) * 100);
    const passed = percent >= lesson.pass_percent;

    // 4. Record the attempt
    const { error: attemptError } = await admin.from("quiz_attempts").insert({
        user_id: user.id,
        lesson_id: lessonId,
        score: correctCount,
        total,
        passed,
    });
    if (attemptError) {
        return NextResponse.json({ error: attemptError.message }, { status: 500 });
    }

    // 5. Passing completes the lesson
    if (passed) {
        const { error: progressError } = await admin.from("lesson_progress").upsert(
            {
                user_id: user.id,
                lesson_id: lessonId,
                is_completed: true,
                completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id" }
        );
        if (progressError) {
            return NextResponse.json({ error: progressError.message }, { status: 500 });
        }
    }

    // 6. Right/wrong per question always; the correct answers and explanations only after passing
    return NextResponse.json({
        score: correctCount,
        total,
        percent,
        passPercent: lesson.pass_percent,
        passed,
        review: graded.map((g) =>
            passed
                ? g
                : { questionId: g.questionId, correct: g.correct }
        ),
    });
}
