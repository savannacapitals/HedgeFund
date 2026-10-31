import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// No 0/O or 1/I/L, so codes are easy to read out and type
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 characters

function generateCode(): string {
    const bytes = randomBytes(10);
    let chars = "";
    for (const b of bytes) chars += ALPHABET[b % ALPHABET.length];
    return `SC-${chars.slice(0, 5)}-${chars.slice(5)}`;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    let courseId: string | undefined;
    try {
        ({ courseId } = await request.json());
    } catch {
        // handled below
    }
    if (!courseId) {
        return NextResponse.json({ error: "Missing course." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. The user must hold an active or completed enrolment
    const { data: enrolment } = await admin
        .from("course_enrolments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

    if (!enrolment || enrolment.status === "revoked") {
        return NextResponse.json({ error: "You are not enrolled in this course." }, { status: 403 });
    }

    // 2. Already issued? Return the same certificate (safe to call repeatedly)
    const { data: existing } = await admin
        .from("certificates")
        .select("verification_code")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ code: existing.verification_code });
    }

    // 3. Every lesson in the course must be completed. Checked here, not in the browser.
    const { data: modules } = await admin.from("course_modules").select("id").eq("course_id", courseId);
    const moduleIds = (modules ?? []).map((m) => m.id);

    const { data: lessons } = moduleIds.length
        ? await admin.from("course_lessons").select("id").in("module_id", moduleIds)
        : { data: [] as { id: string }[] };
    const lessonIds = (lessons ?? []).map((l) => l.id);

    if (lessonIds.length === 0) {
        return NextResponse.json({ error: "This course has no lessons yet." }, { status: 409 });
    }

    const { data: progress } = await admin
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .in("lesson_id", lessonIds);

    const completed = new Set((progress ?? []).map((p) => p.lesson_id)).size;
    if (completed < lessonIds.length) {
        return NextResponse.json(
            { error: `Finish every lesson first (${completed} of ${lessonIds.length} done).` },
            { status: 409 }
        );
    }

    // 4. Save the learner's name as it is today, so the certificate doesn't change later
    const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
    const holderName = profile?.full_name?.trim() || profile?.email || "Learner";

    // 5. Issue it. Retry if a random code ever collides.
    for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateCode();
        const { error } = await admin.from("certificates").insert({
            verification_code: code,
            user_id: user.id,
            course_id: courseId,
            holder_name: holderName,
        });

        if (!error) {
            if (enrolment.status !== "completed") {
                await admin.from("course_enrolments").update({ status: "completed" }).eq("id", enrolment.id);
            }
            return NextResponse.json({ code });
        }

        if (error.code === "23505") {
            // Either a parallel request issued it first, or the code collided
            const { data: raced } = await admin
                .from("certificates")
                .select("verification_code")
                .eq("user_id", user.id)
                .eq("course_id", courseId)
                .maybeSingle();
            if (raced) return NextResponse.json({ code: raced.verification_code });
            continue;
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Could not generate a certificate code. Please try again." }, { status: 500 });
}
