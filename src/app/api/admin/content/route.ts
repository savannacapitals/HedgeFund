import { SECTION_ROLES } from "@/lib/auth/roles";
import { HttpError, requireRole, ok, fail, dbError, text } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/audit";

/**
 * Research article management.
 *  - Administrators and editors: create, edit, publish, archive. Only administrators can delete.
 *  - Researchers: write their own articles and move them between "draft" and "review". They cannot publish.
 */

const STATUSES = ["draft", "review", "published", "archived"];
const LIST_COLUMNS = "id, title, slug, summary, category, status, tags, author_id, published_at, created_at, updated_at";

function slugify(input: string) {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
}

// Keeps characters that would break a PostgREST filter out of the search text
const cleanSearch = (q: string) => q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);

export async function GET(request: Request) {
    try {
        const { admin, userId, role, isAdmin } = await requireRole(SECTION_ROLES.content);
        const url = new URL(request.url);
        const perms = { role, canDelete: isAdmin, canPublish: role !== "researcher" };

        const id = url.searchParams.get("id");
        if (id) {
            const { data, error } = await admin.from("research_articles").select("*").eq("id", id).maybeSingle();
            if (error) throw dbError(error);
            if (!data) throw new HttpError("Article not found.", 404);
            if (role === "researcher" && data.author_id !== userId) throw new HttpError("That is not your article.", 403);
            return ok({ article: data, ...perms });
        }

        let query = admin.from("research_articles").select(LIST_COLUMNS).order("updated_at", { ascending: false }).limit(300);
        const status = url.searchParams.get("status");
        if (status && STATUSES.includes(status)) query = query.eq("status", status);
        if (role === "researcher") query = query.eq("author_id", userId);
        const q = cleanSearch(url.searchParams.get("q") || "");
        if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

        const { data, error } = await query;
        if (error) throw dbError(error);

        const authorIds = [...new Set((data ?? []).map((a) => a.author_id).filter(Boolean))];
        const authors = new Map<string, string>();
        if (authorIds.length) {
            const { data: people } = await admin.from("profiles").select("id, email, full_name").in("id", authorIds);
            for (const p of people ?? []) authors.set(p.id, p.full_name || p.email);
        }

        return ok({
            articles: (data ?? []).map((a) => ({ ...a, author: authors.get(a.author_id) || "unknown" })),
            ...perms,
        });
    } catch (err) {
        return fail(err);
    }
}

export async function POST(request: Request) {
    try {
        const { admin, userId, role, isAdmin } = await requireRole(SECTION_ROLES.content);

        let body: any;
        try {
            body = await request.json();
        } catch {
            throw new HttpError("Invalid request.");
        }

        // ---------- delete (administrators only) ----------
        if (body.action === "delete") {
            if (!isAdmin) throw new HttpError("Only administrators can delete articles.", 403);
            const { data: existing } = await admin.from("research_articles").select("id, title").eq("id", body.id).maybeSingle();
            if (!existing) throw new HttpError("Article not found.", 404);
            const { error } = await admin.from("research_articles").delete().eq("id", existing.id);
            if (error) throw dbError(error);
            await logAudit(admin, { actorId: userId, action: "ARTICLE_DELETE", target: `Research: ${existing.title}` });
            return ok({ success: true });
        }

        if (body.action !== "save") throw new HttpError("Unknown action.");

        // ---------- save (create or update) ----------
        const a = body.article || {};
        const title = text(a.title, "Title", { max: 200, required: true });
        const summary = text(a.summary, "Summary", { max: 600 });
        const articleBody = text(a.body, "Body", { max: 100000, required: true });
        const category = text(a.category, "Category", { max: 60, required: true });
        const status = String(a.status || "draft");
        if (!STATUSES.includes(status)) throw new HttpError("Unknown status.");

        let slug = text(a.slug, "Slug", { max: 120 }) || slugify(title);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
            throw new HttpError("Slug can only use lowercase letters, numbers and single hyphens.");
        }

        const tags = (Array.isArray(a.tags) ? a.tags : String(a.tags || "").split(","))
            .map((t: any) => String(t).trim())
            .filter(Boolean);
        if (tags.length > 12 || tags.some((t: string) => t.length > 40)) {
            throw new HttpError("Use at most 12 tags, each under 40 characters.");
        }

        const now = new Date().toISOString();

        if (a.id) {
            const { data: existing } = await admin
                .from("research_articles")
                .select("id, title, status, author_id, published_at")
                .eq("id", a.id)
                .maybeSingle();
            if (!existing) throw new HttpError("Article not found.", 404);

            if (role === "researcher") {
                if (existing.author_id !== userId) throw new HttpError("You can only edit your own articles.", 403);
                if (!["draft", "review"].includes(existing.status)) {
                    throw new HttpError("Published articles can only be changed by an editor.", 403);
                }
                if (!["draft", "review"].includes(status)) {
                    throw new HttpError("Researchers can save drafts or submit for review. An editor publishes.", 403);
                }
            }

            const { error } = await admin
                .from("research_articles")
                .update({
                    title,
                    slug,
                    summary,
                    body: articleBody,
                    category,
                    tags,
                    status,
                    published_at: status === "published" ? existing.published_at || now : existing.published_at,
                    updated_at: now,
                })
                .eq("id", existing.id);
            if (error) throw dbError(error);

            const statusChanged = existing.status !== status;
            await logAudit(admin, {
                actorId: userId,
                action: statusChanged && status === "published" ? "CONTENT_PUBLISH" : statusChanged ? "ARTICLE_STATUS" : "ARTICLE_UPDATE",
                target: `Research: ${title}`,
                details: statusChanged ? { from: existing.status, to: status } : undefined,
            });
            return ok({ success: true, id: existing.id });
        }

        // create
        if (role === "researcher" && !["draft", "review"].includes(status)) {
            throw new HttpError("Researchers can save drafts or submit for review. An editor publishes.", 403);
        }
        const { data: created, error } = await admin
            .from("research_articles")
            .insert({
                title,
                slug,
                summary,
                body: articleBody,
                category,
                tags,
                status,
                author_id: userId,
                published_at: status === "published" ? now : null,
            })
            .select("id")
            .single();
        if (error) throw dbError(error);

        await logAudit(admin, {
            actorId: userId,
            action: status === "published" ? "CONTENT_PUBLISH" : "ARTICLE_CREATE",
            target: `Research: ${title}`,
        });
        return ok({ success: true, id: created.id });
    } catch (err) {
        return fail(err);
    }
}
