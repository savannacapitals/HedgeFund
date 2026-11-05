import { revalidatePath, revalidateTag } from "next/cache";
import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";
import { MAX_DISCOUNT_PERCENT, promotionState } from "@/lib/promotions/pricing";

/**
 * Promotions: opening offers, automatic discounts and promo codes.
 * Finance operators and administrators only. Every change is saved to the audit log.
 *
 * What a discount is worth cannot be edited once it exists (that would rewrite the history of the
 * orders already placed). To change it, end the promotion and create a new one. You can still
 * pause, resume, end it, raise or lower its cap and move its end date.
 */

const SCOPES = ["all_courses", "course", "community"];

function whole(value: any, label: string, min: number, max: number) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(`${label} must be a whole number from ${min} to ${max}.`);
    return n;
}

function date(value: any, label: string): string | null {
    if (value === null || value === undefined || value === "") return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new HttpError(`${label} is not a valid date.`);
    return d.toISOString();
}

function refresh() {
    revalidateTag("promotions");
    revalidatePath("/");
    revalidatePath("/pricing");
    revalidatePath("/academy", "layout");
}

export async function GET() {
    try {
        const { admin } = await requireRole(SECTION_ROLES.promotions);

        // Give back places held by abandoned checkouts, so the numbers below are true
        await admin.rpc("release_stale_promotion_reservations", { p_promotion_id: null });

        const { data: promotions, error } = await admin.from("promotions").select("*").order("created_at", { ascending: false });
        if (error) throw dbError(error);

        const ids = (promotions ?? []).map((p: any) => p.id);
        const counts = new Map<string, { reserved: number; redeemed: number; discounted: number }>();
        if (ids.length) {
            const { data: rows } = await admin
                .from("promotion_redemptions")
                .select("promotion_id, status, discount_amount")
                .in("promotion_id", ids);
            for (const r of rows ?? []) {
                const c = counts.get(r.promotion_id) ?? { reserved: 0, redeemed: 0, discounted: 0 };
                if (r.status === "reserved") c.reserved += 1;
                if (r.status === "redeemed") {
                    c.redeemed += 1;
                    c.discounted += Number(r.discount_amount);
                }
                counts.set(r.promotion_id, c);
            }
        }

        const { data: courses } = await admin.from("courses").select("id, title").order("title", { ascending: true });
        const courseTitle = new Map((courses ?? []).map((c: any) => [c.id, c.title]));

        return ok({
            promotions: (promotions ?? []).map((p: any) => {
                const c = counts.get(p.id) ?? { reserved: 0, redeemed: 0, discounted: 0 };
                return {
                    ...p,
                    state: promotionState(p),
                    reserved: c.reserved,
                    redeemed: c.redeemed,
                    discounted: c.discounted,
                    courseTitle: p.course_id ? courseTitle.get(p.course_id) ?? null : null,
                };
            }),
            courses: courses ?? [],
            maxPercent: MAX_DISCOUNT_PERCENT,
        });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.promotions);

        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }

        // ---------------------------------------------------------------- create
        if (body.action === "create") {
            const name = text(body.name, "Name", { max: 80, required: true });
            const headline = text(body.headline, "Headline", { max: 90, required: true });
            if (name.length < 3) throw new HttpError("Name is too short.");
            if (headline.length < 3) throw new HttpError("Headline is too short.");
            const description = text(body.description, "Description", { max: 240 }) || null;

            const discountType = body.discountType;
            if (discountType !== "percent" && discountType !== "fixed") throw new HttpError("Choose a percentage or a fixed amount.");
            let percentOff: number | null = null;
            let amountOff: number | null = null;
            let currency: string | null = null;
            if (discountType === "percent") {
                percentOff = whole(body.percentOff, "Percentage off", 1, MAX_DISCOUNT_PERCENT);
            } else {
                amountOff = Number(body.amountOff);
                if (!Number.isFinite(amountOff) || amountOff <= 0 || amountOff > 10_000_000) throw new HttpError("Enter an amount greater than zero.");
                amountOff = Math.round(amountOff * 100) / 100;
                currency = body.currency;
                if (currency !== "KES" && currency !== "USD") throw new HttpError("Choose KES or USD for a fixed amount.");
            }

            const scope = body.scope;
            if (!SCOPES.includes(scope)) throw new HttpError("Choose what the promotion applies to.");
            let courseId: string | null = null;
            if (scope === "course") {
                const { data: course } = await admin.from("courses").select("id").eq("id", body.courseId).maybeSingle();
                if (!course) throw new HttpError("Choose the course this promotion applies to.");
                courseId = course.id;
            }

            // Exactly one way to trigger it: automatically, or with a code
            const autoApply = body.trigger === "auto";
            let code: string | null = null;
            if (!autoApply) {
                code = text(body.code, "Code", { max: 24, required: true }).toUpperCase();
                if (!/^[A-Z0-9-]{5,24}$/.test(code)) throw new HttpError("A code is 5 to 24 letters, numbers or dashes.");
            }

            const startsAt = date(body.startsAt, "Start") ?? new Date().toISOString();
            const endsAt = date(body.endsAt, "End");
            if (endsAt && new Date(endsAt) <= new Date(startsAt)) throw new HttpError("The end must be after the start.");
            if (endsAt && new Date(endsAt) <= new Date()) throw new HttpError("The end date is already in the past.");

            const maxRedemptions = body.maxRedemptions === "" || body.maxRedemptions == null ? null : whole(body.maxRedemptions, "Number of places", 1, 1_000_000);
            const maxPerUser = whole(body.maxPerUser ?? 1, "Uses per customer", 1, 10);

            const { data: row, error } = await admin
                .from("promotions")
                .insert({
                    name,
                    headline,
                    description,
                    code,
                    auto_apply: autoApply,
                    show_banner: !!body.showBanner,
                    discount_type: discountType,
                    percent_off: percentOff,
                    amount_off: amountOff,
                    currency,
                    scope,
                    course_id: courseId,
                    starts_at: startsAt,
                    ends_at: endsAt,
                    max_redemptions: maxRedemptions,
                    max_per_user: maxPerUser,
                    created_by: userId,
                })
                .select("id")
                .single();
            if (error) throw error.code === "23505" ? new HttpError("That code is already used by another promotion.", 409) : dbError(error);

            await logAudit(admin, { actorId: userId, action: "PROMOTION_CREATE", target: `${name}${code ? ` (${code})` : " (automatic)"}`, details: { promotionId: row.id, scope, discountType, percentOff, amountOff, currency, maxRedemptions, endsAt } });
            refresh();
            return ok({ success: true, id: row.id });
        }

        // ---------------------------------------------------------------- change an existing one
        const { data: promo } = await admin.from("promotions").select("*").eq("id", body.id).maybeSingle();
        if (!promo) throw new HttpError("Promotion not found.", 404);
        const label = `${promo.name}${promo.code ? ` (${promo.code})` : ""}`;
        const now = new Date().toISOString();

        if (body.action === "pause" || body.action === "resume") {
            const { error } = await admin.from("promotions").update({ is_active: body.action === "resume", updated_at: now }).eq("id", promo.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: body.action === "pause" ? "PROMOTION_PAUSE" : "PROMOTION_RESUME", target: label });
            refresh();
            return ok({ success: true });
        }

        if (body.action === "end") {
            // Ending stops new redemptions straight away. Orders already placed keep their price while they are paid.
            const { error } = await admin.from("promotions").update({ ends_at: now, updated_at: now }).eq("id", promo.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "PROMOTION_END", target: label });
            refresh();
            return ok({ success: true });
        }

        if (body.action === "update") {
            const changes: Record<string, any> = { updated_at: now };

            if ("maxRedemptions" in body) {
                const cap = body.maxRedemptions === "" || body.maxRedemptions == null ? null : whole(body.maxRedemptions, "Number of places", 1, 1_000_000);
                if (cap !== null) {
                    const { count } = await admin
                        .from("promotion_redemptions")
                        .select("id", { count: "exact", head: true })
                        .eq("promotion_id", promo.id)
                        .in("status", ["reserved", "redeemed"]);
                    if ((count ?? 0) > cap) throw new HttpError(`${count} places are already taken, so the limit cannot go below that.`);
                }
                changes.max_redemptions = cap;
            }
            if ("endsAt" in body) {
                const endsAt = date(body.endsAt, "End");
                if (endsAt && new Date(endsAt) <= new Date(promo.starts_at)) throw new HttpError("The end must be after the start.");
                changes.ends_at = endsAt;
            }
            if ("showBanner" in body) changes.show_banner = !!body.showBanner;
            if (Object.keys(changes).length === 1) throw new HttpError("Nothing to change.");

            const { error } = await admin.from("promotions").update(changes).eq("id", promo.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "PROMOTION_UPDATE", target: label, details: { ...changes } });
            refresh();
            return ok({ success: true });
        }

        throw new HttpError("Unknown action.");
    } catch (err) {
        return fail(err);
    }
}
