import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDiscount, formatOffer, type PromotionScope, type PromotionTerms } from "@/lib/promotions/pricing";

/** SERVER ONLY. Looks up promotions, prices a purchase and opens the order for it. */

type Admin = ReturnType<typeof createAdminClient>;

export interface PromotionRecord extends PromotionTerms {
    id: string;
    name: string;
    headline: string;
    description: string | null;
    code: string | null;
    auto_apply: boolean;
    show_banner: boolean;
    scope: PromotionScope;
    course_id: string | null;
    starts_at: string;
    ends_at: string | null;
    max_redemptions: number | null;
    max_per_user: number;
    is_active: boolean;
}

export interface PurchaseTarget {
    kind: "course" | "community";
    courseId?: string | null;
}

export interface Quote {
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
    promotion: { id: string; name: string; headline: string; code: string | null; endsAt: string | null } | null;
}

const PROMO_MESSAGES: Record<string, string> = {
    invalid_code: "That code is not valid, or the offer has ended.",
    promo_unavailable: "This offer is no longer available.",
    promo_not_applicable: "This offer does not apply to this purchase.",
    promo_exhausted: "This offer has reached its limit of places.",
    promo_user_limit: "You have already used this offer.",
};

export class PromoError extends Error {
    code: string;
    status: number;
    constructor(code: string) {
        super(PROMO_MESSAGES[code] || "This offer cannot be applied.");
        this.code = code;
        this.status = code === "invalid_code" ? 422 : 409;
    }
}

/** The database raises its own named errors; this recognises them. */
function promoCodeFromDbError(error: any): string | null {
    const message = String(error?.message || "");
    for (const code of Object.keys(PROMO_MESSAGES)) {
        if (message.includes(code)) return code;
    }
    return null;
}

export function normaliseCode(code: unknown): string | null {
    if (typeof code !== "string") return null;
    const v = code.trim().toUpperCase();
    return v ? v.slice(0, 40) : null;
}

function appliesTo(p: PromotionRecord, target: PurchaseTarget): boolean {
    if (p.scope === "community") return target.kind === "community";
    if (target.kind !== "course") return false;
    return p.scope === "all_courses" || p.course_id === target.courseId;
}

/** Promotions that are switched on and inside their dates right now. */
export async function loadLivePromotions(admin: Admin = createAdminClient()): Promise<PromotionRecord[]> {
    const now = new Date().toISOString();
    const { data, error } = await admin
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`);
    if (error) throw new Error(error.message);
    return (data ?? []) as PromotionRecord[];
}

/** How many places are taken, and how many this customer has used. */
async function usage(admin: Admin, p: PromotionRecord, userId: string | null) {
    let used = 0;
    if (p.max_redemptions !== null) {
        const count = async () => {
            const { count: n } = await admin
                .from("promotion_redemptions")
                .select("id", { count: "exact", head: true })
                .eq("promotion_id", p.id)
                .in("status", ["reserved", "redeemed"]);
            return n ?? 0;
        };
        used = await count();
        if (used >= p.max_redemptions) {
            // Looks full: give back places held by abandoned checkouts, then look again
            await admin.rpc("release_stale_promotion_reservations", { p_promotion_id: p.id });
            used = await count();
        }
    }
    let userUsed = 0;
    if (userId) {
        const { count: n } = await admin
            .from("promotion_redemptions")
            .select("id", { count: "exact", head: true })
            .eq("promotion_id", p.id)
            .eq("user_id", userId)
            .in("status", ["reserved", "redeemed"]);
        userUsed = n ?? 0;
    }
    return { used, userUsed };
}

/**
 * Prices a purchase: the best single promotion wins (offers never stack).
 * An automatic offer applies by itself; a code applies only when the customer typed it.
 * A bad or used-up code throws PromoError instead of being ignored quietly.
 */
export async function quotePurchase(input: {
    admin?: Admin;
    userId: string | null;
    target: PurchaseTarget;
    subtotal: number;
    currency: string;
    code?: string | null;
}): Promise<Quote> {
    const admin = input.admin ?? createAdminClient();
    const { userId, target, currency } = input;
    const subtotal = Number(input.subtotal);
    const code = normaliseCode(input.code);

    const live = (await loadLivePromotions(admin)).filter((p) => appliesTo(p, target));

    let coded: PromotionRecord | null = null;
    if (code) {
        coded = live.find((p) => p.code === code) ?? null;
        if (!coded) throw new PromoError("invalid_code");
        if (!userId) throw new PromoError("promo_unavailable");
    }

    const pool = [...live.filter((p) => p.auto_apply && p.id !== coded?.id), ...(coded ? [coded] : [])];

    let best: { promo: PromotionRecord; discount: number } | null = null;
    for (const promo of pool) {
        const discount = computeDiscount(promo, subtotal, currency);
        if (discount <= 0) {
            if (promo === coded) throw new PromoError("promo_not_applicable");
            continue;
        }
        const { used, userUsed } = await usage(admin, promo, userId);
        const full = promo.max_redemptions !== null && used >= promo.max_redemptions;
        const spent = userId !== null && userUsed >= promo.max_per_user;
        if (full || spent) {
            // A code the customer typed deserves a clear answer; an automatic offer just does not apply
            if (promo === coded) throw new PromoError(full ? "promo_exhausted" : "promo_user_limit");
            continue;
        }
        if (!best || discount > best.discount || (discount === best.discount && promo === coded)) {
            best = { promo, discount };
        }
    }

    const discount = best?.discount ?? 0;
    return {
        subtotal,
        discount,
        total: Math.round((subtotal - discount) * 100) / 100,
        currency,
        promotion: best
            ? { id: best.promo.id, name: best.promo.name, headline: best.promo.headline, code: best.promo.code, endsAt: best.promo.ends_at }
            : null,
    };
}

/**
 * Opens (or reuses) the pending order for a purchase and returns its id.
 *  - The price is worked out here from the database, never taken from the browser.
 *  - A customer who already has an open discounted order for this purchase gets that order back,
 *    so their price and their place are held while they pay.
 *  - A discounted order is created by one database function: it re-checks the offer, enforces the
 *    cap and writes the order and its redemption together, so a limited place cannot be oversold.
 */
export async function openPurchaseOrder(input: {
    admin?: Admin;
    userId: string;
    target: PurchaseTarget;
    subtotal: number;
    currency: string;
    code?: string | null;
}): Promise<{ orderId: string; quote: Quote; notice?: string }> {
    const admin = input.admin ?? createAdminClient();
    const { userId, target, currency } = input;
    const subtotal = Number(input.subtotal);
    const code = normaliseCode(input.code);

    const scoped = (q: any) => {
        q = q.eq("user_id", userId).eq("kind", target.kind).eq("status", "pending");
        return target.courseId ? q.eq("course_id", target.courseId) : q.is("course_id", null);
    };

    // 1. An open discounted order whose offer is still running: hand it back
    const { data: heldOrder } = await scoped(
        admin.from("orders").select("id, subtotal_amount, discount_amount, total_amount, promotion_id, promotion_code").not("promotion_id", "is", null)
    )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (heldOrder && (!code || code === heldOrder.promotion_code)) {
        const live = await loadLivePromotions(admin);
        const promo = live.find((p) => p.id === heldOrder.promotion_id);
        if (promo) {
            return {
                orderId: heldOrder.id,
                quote: {
                    subtotal: Number(heldOrder.subtotal_amount ?? heldOrder.total_amount),
                    discount: Number(heldOrder.discount_amount),
                    total: Number(heldOrder.total_amount),
                    currency,
                    promotion: { id: promo.id, name: promo.name, headline: promo.headline, code: promo.code, endsAt: promo.ends_at },
                },
            };
        }
    }

    // 2. Price it
    let quote = await quotePurchase({ admin, userId, target, subtotal, currency, code });

    // 3. An open order at exactly this price and offer
    {
        let q = scoped(admin.from("orders").select("id").eq("total_amount", quote.total));
        q = quote.promotion ? q.eq("promotion_id", quote.promotion.id) : q.is("promotion_id", null);
        const { data: open } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (open) return { orderId: open.id, quote };
    }

    // 4. A new order
    let notice: string | undefined;
    if (quote.promotion) {
        const { data, error } = await admin.rpc("create_order_with_promotion", {
            p_user_id: userId,
            p_kind: target.kind,
            p_course_id: target.courseId ?? null,
            p_subtotal: subtotal,
            p_currency: currency,
            p_promotion_id: quote.promotion.id,
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row) {
            return {
                orderId: row.new_order_id,
                quote: { ...quote, subtotal: Number(row.out_subtotal), discount: Number(row.out_discount), total: Number(row.out_total) },
            };
        }
        const reason = promoCodeFromDbError(error);
        if (!reason) throw new Error(error?.message || "Could not create the order.");
        // Someone typed this code: tell them. An automatic offer that ran out a moment ago is not their mistake.
        if (code) throw new PromoError(reason);
        notice = "That offer has just ended, so this order is at the standard price.";
        quote = { subtotal, discount: 0, total: subtotal, currency, promotion: null };
    }

    const { data: order, error } = await admin
        .from("orders")
        .insert({
            user_id: userId,
            kind: target.kind,
            course_id: target.courseId ?? null,
            subtotal_amount: subtotal,
            discount_amount: 0,
            total_amount: subtotal,
            currency,
            status: "pending",
        })
        .select("id")
        .single();
    if (error || !order) throw new Error(error?.message || "Could not create the order.");
    return { orderId: order.id, quote, notice };
}

// ---------------------------------------------------------------------------
// What the public site is allowed to see (never a hidden code)
// ---------------------------------------------------------------------------

export interface PublicOffer {
    id: string;
    headline: string;
    description: string | null;
    label: string; // "30% off"
    autoApply: boolean;
    banner: boolean;
    code: string | null; // only for advertised, code-based offers
    scope: PromotionScope;
    courseId: string | null;
    courseSlug: string | null;
    courseTitle: string | null;
    href: string;
    terms: PromotionTerms;
    startsAt: string;
    endsAt: string | null;
    remaining: number | null; // places left when the offer has a cap
}

async function buildPublicOffers(): Promise<PublicOffer[]> {
    const admin = createAdminClient();
    const live = (await loadLivePromotions(admin)).filter((p) => p.show_banner || p.auto_apply);
    if (!live.length) return [];

    const courseIds = Array.from(new Set(live.map((p) => p.course_id).filter(Boolean))) as string[];
    const courses = new Map<string, { slug: string; title: string }>();
    if (courseIds.length) {
        const { data } = await admin.from("courses").select("id, slug, title").in("id", courseIds);
        for (const c of data ?? []) courses.set(c.id, { slug: c.slug, title: c.title });
    }

    const offers: PublicOffer[] = [];
    for (const p of live) {
        let remaining: number | null = null;
        if (p.max_redemptions !== null) {
            const { used } = await usage(admin, p, null);
            remaining = Math.max(0, p.max_redemptions - used);
            if (remaining === 0) continue; // sold out: stop advertising it
        }
        const course = p.course_id ? courses.get(p.course_id) : undefined;
        offers.push({
            id: p.id,
            headline: p.headline,
            description: p.description,
            label: formatOffer(p),
            autoApply: p.auto_apply,
            banner: p.show_banner,
            code: p.show_banner && !p.auto_apply ? p.code : null,
            scope: p.scope,
            courseId: p.course_id,
            courseSlug: course?.slug ?? null,
            courseTitle: course?.title ?? null,
            href: p.scope === "course" && course ? `/academy/courses/${course.slug}` : p.scope === "community" ? "/community/killzone" : "/academy",
            terms: { discount_type: p.discount_type, percent_off: p.percent_off, amount_off: p.amount_off, currency: p.currency },
            startsAt: p.starts_at,
            endsAt: p.ends_at,
            remaining,
        });
    }
    return offers;
}

/** Cached for a minute (and cleared when staff change a promotion), so public pages stay fast. */
export const getPublicOffers = unstable_cache(buildPublicOffers, ["promotions:public-offers"], {
    revalidate: 60,
    tags: ["promotions"],
});

/** The one offer worth a banner: the one that ends soonest, so urgency is always honest. */
export async function getBannerOffer(): Promise<PublicOffer | null> {
    try {
        const offers = (await getPublicOffers()).filter((o) => o.banner);
        offers.sort((a, b) => (a.endsAt ?? "9999").localeCompare(b.endsAt ?? "9999"));
        return offers[0] ?? null;
    } catch (err) {
        // A missing table or a database hiccup must never take the page down
        console.error("Promotion banner unavailable:", err);
        return null;
    }
}
