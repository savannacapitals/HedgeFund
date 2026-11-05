// Pure helpers, safe to import from both server and browser code.
//
// The database (promotion_discount() in migration 00017) is the authority on what a discount is
// worth when an order is created. computeDiscount() repeats the same whole-cent arithmetic so the
// price shown on screen matches the price that is charged. Percentages are whole numbers on
// purpose: that keeps this and the SQL version rounding identically.

export type PromotionScope = "all_courses" | "course" | "community";
export type DiscountType = "percent" | "fixed";
export type PromotionState = "paused" | "scheduled" | "live" | "ended";

export interface PromotionTerms {
    discount_type: DiscountType;
    percent_off: number | null;
    amount_off: number | string | null;
    currency: string | null;
}

/** No discount may take more than this share off, so a paid product never becomes a free order. */
export const MAX_DISCOUNT_PERCENT = 90;

const toCents = (value: number | string) => Math.round(Number(value) * 100);

export function computeDiscount(terms: PromotionTerms, subtotal: number | string, currency: string): number {
    const sub = toCents(subtotal);
    if (!(sub > 0)) return 0;

    const cap = Math.round((sub * MAX_DISCOUNT_PERCENT) / 100);
    let off = 0;
    if (terms.discount_type === "percent") {
        off = Math.round((sub * Number(terms.percent_off || 0)) / 100);
    } else if (terms.currency === currency) {
        off = toCents(Number(terms.amount_off || 0));
    }
    return Math.max(0, Math.min(off, cap)) / 100;
}

export function promotionState(
    p: { is_active: boolean; starts_at: string; ends_at: string | null },
    now: Date = new Date()
): PromotionState {
    if (!p.is_active) return "paused";
    if (new Date(p.starts_at) > now) return "scheduled";
    if (p.ends_at && new Date(p.ends_at) <= now) return "ended";
    return "live";
}

export function formatPrice(amount: number | string, currency: string): string {
    const n = Number(amount);
    const text = n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return currency === "USD" ? `$${text}` : `${currency} ${text}`;
}

/** "30% off" or "$10 off" / "KES 1,000 off" */
export function formatOffer(terms: PromotionTerms): string {
    if (terms.discount_type === "percent") return `${terms.percent_off}% off`;
    return `${formatPrice(Number(terms.amount_off), terms.currency || "USD")} off`;
}

/** Date and time in Nairobi, written the same on the server and in the browser. */
export function formatEat(iso: string | null | undefined): string {
    if (!iso) return "—";
    return (
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Nairobi",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(iso)) + " EAT"
    );
}
