import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";
import { CATEGORIES, KENYA_ELIGIBILITY, STATUSES, YES_NO } from "@/lib/ai/config";

/**
 * AI Opportunities platform records (the public summary plus the members-only guide).
 * Editors and administrators. Every change is written to the audit log.
 * Accuracy rule enforced here: a platform cannot be "Verified" without a last-verified date and a source link.
 */

const GUIDE_LISTS = ["required_equipment", "required_skills", "registration_requirements", "payment_methods", "account_steps", "common_mistakes", "recommendations"] as const;
const GUIDE_TEXT = [
    "country_eligibility", "assessment_requirements", "compensation", "application_availability", "overview",
    "eligibility_notes", "assessment_notes", "earning_notes", "payments_notes", "restriction_notes",
] as const;

const url = (v: any, label: string, required = false) => {
    const t = text(v, label, { max: 500, required });
    if (!t) return null;
    let u: URL;
    try {
        u = new URL(t);
    } catch {
        throw new HttpError(`${label} must be a full web address starting with https://`);
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new HttpError(`${label} must start with https://`);
    return u.toString();
};

function lines(v: any, label: string, maxItems = 30, maxLen = 600): string[] {
    const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
    const out = raw.map((x) => String(x).trim()).filter(Boolean);
    if (out.length > maxItems) throw new HttpError(`${label}: at most ${maxItems} lines.`);
    if (out.some((x) => x.length > maxLen)) throw new HttpError(`${label}: each line must be under ${maxLen} characters.`);
    return out;
}

// "Label | https://..." per line
function links(v: any, label: string) {
    return lines(v, label, 20, 600).map((line) => {
        const [name, address] = line.includes("|") ? line.split("|").map((p) => p.trim()) : [line, line];
        const clean = url(address, `${label} link`, true)!;
        return { label: (name && name !== address ? name : new URL(clean).hostname).slice(0, 120), url: clean };
    });
}

export async function GET() {
    try {
        const { admin } = await requireRole(SECTION_ROLES.ai);
        const { data, error } = await admin
            .from("ai_platforms")
            .select("*, ai_platform_guides(*)")
            .order("name", { ascending: true });
        if (error) throw dbError(error);
        const platforms = (data ?? []).map((p: any) => ({ ...p, guide: Array.isArray(p.ai_platform_guides) ? p.ai_platform_guides[0] : p.ai_platform_guides, ai_platform_guides: undefined }));
        return ok({ platforms });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId } = await requireRole(SECTION_ROLES.ai);
        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }

        if (body.action === "delete") {
            const { data: p } = await admin.from("ai_platforms").select("id, name").eq("id", body.id).maybeSingle();
            if (!p) throw new HttpError("Platform not found.", 404);
            const { error } = await admin.from("ai_platforms").delete().eq("id", p.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "AI_PLATFORM_DELETE", target: p.name });
            return ok({ success: true });
        }
        if (body.action !== "save") throw new HttpError("Unknown action.");

        const name = text(body.name, "Name", { max: 120, required: true });
        const slug = text(body.slug, "Slug", { max: 80, required: true }).toLowerCase();
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new HttpError("Slug can only contain lowercase letters, numbers and single hyphens.");
        if (!CATEGORIES.some((c) => c.id === body.category)) throw new HttpError("Choose a category.");
        if (!STATUSES.some((s) => s.id === body.verification_status)) throw new HttpError("Choose a verification status.");
        if (!KENYA_ELIGIBILITY.some((s) => s.id === body.kenya_eligibility)) throw new HttpError("Choose Kenya eligibility.");

        const lastVerified = text(body.last_verified, "Last verified", { max: 10 });
        if (lastVerified && !/^\d{4}-\d{2}-\d{2}$/.test(lastVerified)) throw new HttpError("Last verified must be a date (YYYY-MM-DD).");

        const sources = links(body.sources, "Sources");
        if (body.verification_status === "verified") {
            if (!lastVerified) throw new HttpError("A Verified platform needs a last-verified date.");
            if (sources.length === 0) throw new HttpError("A Verified platform needs at least one source link.");
        }
        if (body.verification_status === "restricted" && !text(body.restriction_notes, "Restriction notes", { max: 2000 })) {
            throw new HttpError("Explain the restriction in the restriction notes.");
        }

        const platform = {
            slug,
            name,
            logo_url: url(body.logo_url, "Logo address"),
            short_description: text(body.short_description, "Short description", { max: 300 }),
            category: body.category,
            official_url: url(body.official_url, "Official website"),
            verification_status: body.verification_status,
            kenya_eligibility: body.kenya_eligibility,
            last_verified: lastVerified || null,
            is_featured: !!body.is_featured,
            is_published: body.is_published !== false,
            updated_at: new Date().toISOString(),
        };

        const guide: Record<string, any> = { updated_at: platform.updated_at };
        for (const k of ["accepting_registrations", "has_projects", "pays_in_kenya"] as const) {
            const v = body[k] ?? "unknown";
            if (!YES_NO.includes(v)) throw new HttpError(`Invalid value for ${k}.`);
            guide[k] = v;
        }
        for (const k of GUIDE_TEXT) guide[k] = text(body[k], k.replace(/_/g, " "), { max: 4000 }) || null;
        for (const k of GUIDE_LISTS) guide[k] = lines(body[k], k.replace(/_/g, " "));
        const age = body.min_age === "" || body.min_age == null ? null : Number(body.min_age);
        if (age !== null && !(Number.isInteger(age) && age >= 13 && age <= 99)) throw new HttpError("Minimum age must be a whole number from 13 to 99.");
        guide.min_age = age;
        guide.resources = links(body.resources, "Official resources");
        guide.sources = sources;

        let id = body.id as string | undefined;
        if (id) {
            const { error } = await admin.from("ai_platforms").update(platform).eq("id", id);
            if (error) throw dbError(error);
        } else {
            const { data, error } = await admin.from("ai_platforms").insert(platform).select("id").single();
            if (error || !data) throw dbError(error);
            id = data.id;
        }
        const { error: guideError } = await admin.from("ai_platform_guides").upsert({ platform_id: id, ...guide }, { onConflict: "platform_id" });
        if (guideError) throw dbError(guideError);

        await logAudit(admin, {
            actorId: userId,
            action: body.id ? "AI_PLATFORM_UPDATE" : "AI_PLATFORM_CREATE",
            target: name,
            details: { status: platform.verification_status, kenya: platform.kenya_eligibility, published: platform.is_published },
        });
        return ok({ success: true, id });
    } catch (err) {
        return fail(err);
    }
}
