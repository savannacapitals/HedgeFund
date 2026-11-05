import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PromoError, openPurchaseOrder } from "@/lib/promotions/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Please sign in to enrol." }, { status: 401 });
    }

    let courseId: string | undefined;
    let promoCode: string | undefined;
    try {
        ({ courseId, promoCode } = await request.json());
    } catch {
        // fall through to the validation below
    }
    if (!courseId) {
        return NextResponse.json({ error: "Missing course." }, { status: 400 });
    }

    const admin = createAdminClient();

    // The price always comes from the database, never from the browser.
    const { data: course } = await admin
        .from("courses")
        .select("id, slug, price, currency, is_published")
        .eq("id", courseId)
        .maybeSingle();

    if (!course || !course.is_published) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const learnUrl = `/learn/${course.slug}/lessons`;

    const { data: existing } = await admin
        .from("course_enrolments")
        .select("status")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

    if (existing?.status === "revoked") {
        return NextResponse.json(
            { error: "Your access to this course was removed. Please contact support." },
            { status: 403 }
        );
    }
    if (existing) {
        return NextResponse.json({ redirectTo: learnUrl });
    }

    // Free course: enrol straight away
    if (Number(course.price) === 0) {
        const { error } = await admin.from("course_enrolments").insert({
            user_id: user.id,
            course_id: course.id,
            status: "active",
        });
        if (error && error.code !== "23505") {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ redirectTo: learnUrl });
    }

    // Paid course. The price comes from the database; any automatic offer or typed code is applied
    // by the server, and a discounted order is created together with its redemption in one step.
    try {
        const { orderId, notice } = await openPurchaseOrder({
            admin,
            userId: user.id,
            target: { kind: "course", courseId: course.id },
            subtotal: Number(course.price),
            currency: course.currency ?? "USD",
            code: promoCode,
        });
        return NextResponse.json({ redirectTo: `/checkout/${orderId}`, notice });
    } catch (err: any) {
        if (err instanceof PromoError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        return NextResponse.json({ error: err?.message || "Could not create order." }, { status: 500 });
    }
}
