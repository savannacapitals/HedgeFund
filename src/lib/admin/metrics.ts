import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledNetworks } from "@/lib/payments/stablecoin/networks";

/**
 * SERVER ONLY. Live figures for the admin dashboard, read straight from the database.
 * Uses the service role, so only call it after getStaffAccess() has passed.
 * Each block is fetched on its own: if one query fails, the others still show.
 */

export interface AuditRow {
    id: string;
    actor: string;
    action: string;
    target: string;
    timestamp: string;
    ipAddress: string;
}

export interface RevenueLine {
    currency: string;
    amount: number;
}

export interface AdminMetrics {
    generatedAt: string;
    users: { total: number | null; newThisMonth: number | null; newLastMonth: number | null };
    enrolments: { active: number | null; completed: number | null };
    revenue: { lines: RevenueLine[]; confirmedOrders: number | null; monthLabel: string; ok: boolean };
    articles: { published: number | null; inReview: number | null; drafts: number | null };
    payments: {
        networks: string[];
        openPayments: number | null;
        unmatchedTransfers: number | null;
        lastScanAt: string | null;
        scanErrors: number;
    };
    audit: { rows: AuditRow[]; ok: boolean };
}


function startOfMonthUtc(d = new Date()) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        console.error(`Admin metrics: ${label} failed:`, err);
        return fallback;
    }
}

export interface MetricScope {
    money: boolean; // revenue and payment-engine figures
    audit: boolean; // audit log rows (administrators only, matching the table's own policy)
}

export async function getAdminMetrics(scope: MetricScope = { money: true, audit: true }): Promise<AdminMetrics> {
    const admin = createAdminClient();
    const now = new Date();
    const monthStart = startOfMonthUtc(now);
    const prevMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1));

    // Counts only: head requests return no rows, so these stay cheap as the tables grow.
    const count = async (build: (q: any) => any, table: string): Promise<number | null> => {
        const { count: c, error } = await build(admin.from(table).select("id", { count: "exact", head: true }));
        if (error) throw error;
        return c ?? 0;
    };

    const [users, enrolments, revenue, articles, payments, audit] = await Promise.all([
        safe(
            "users",
            async () => {
                const [total, newThisMonth, newLastMonth] = await Promise.all([
                    count((q) => q, "profiles"),
                    count((q) => q.gte("created_at", monthStart.toISOString()), "profiles"),
                    count(
                        (q) => q.gte("created_at", prevMonthStart.toISOString()).lt("created_at", monthStart.toISOString()),
                        "profiles"
                    ),
                ]);
                return { total, newThisMonth, newLastMonth };
            },
            { total: null, newThisMonth: null, newLastMonth: null }
        ),

        safe(
            "enrolments",
            async () => {
                const [active, completed] = await Promise.all([
                    count((q) => q.eq("status", "active"), "course_enrolments"),
                    count((q) => q.eq("status", "completed"), "course_enrolments"),
                ]);
                return { active, completed };
            },
            { active: null, completed: null }
        ),

        safe(
            "revenue",
            async () => {
                if (!scope.money) return { lines: [], confirmedOrders: null, monthLabel: "", ok: false };
                // orders has no paid_at column; updated_at is stamped when an order flips to "confirmed".
                const { data, error } = await admin
                    .from("orders")
                    .select("total_amount, currency")
                    .eq("status", "confirmed")
                    .gte("updated_at", monthStart.toISOString());
                if (error) throw error;

                const totals = new Map<string, number>();
                for (const o of data ?? []) {
                    const cur = (o.currency || "USD").toUpperCase();
                    // Sum in cents to avoid floating point drift
                    totals.set(cur, (totals.get(cur) ?? 0) + Math.round(Number(o.total_amount) * 100));
                }
                const lines = [...totals.entries()]
                    .map(([currency, cents]) => ({ currency, amount: cents / 100 }))
                    .sort((a, b) => (a.currency === "USD" ? -1 : b.currency === "USD" ? 1 : a.currency.localeCompare(b.currency)));

                return {
                    lines,
                    confirmedOrders: data?.length ?? 0,
                    monthLabel: monthStart.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
                    ok: true,
                };
            },
            { lines: [], confirmedOrders: null, monthLabel: "", ok: false }
        ),

        safe(
            "articles",
            async () => {
                const [published, inReview, drafts] = await Promise.all([
                    count((q) => q.eq("status", "published"), "research_articles"),
                    count((q) => q.eq("status", "review"), "research_articles"),
                    count((q) => q.eq("status", "draft"), "research_articles"),
                ]);
                return { published, inReview, drafts };
            },
            { published: null, inReview: null, drafts: null }
        ),

        safe(
            "payments",
            async () => {
                if (!scope.money) return { networks: [], openPayments: null, unmatchedTransfers: null, lastScanAt: null, scanErrors: 0 };
                const networks = getEnabledNetworks().map((n) => n.id as string);
                const [openPayments, unmatchedTransfers, cursors] = await Promise.all([
                    count((q) => q.eq("status", "pending"), "payments"),
                    count((q) => q.is("payment_id", null), "chain_transfers"),
                    admin.from("scan_cursors").select("network, last_scan_at, last_error"),
                ]);
                const rows = cursors.data ?? [];
                const scans = rows.map((r) => r.last_scan_at).filter(Boolean).sort();
                return {
                    networks,
                    openPayments,
                    unmatchedTransfers,
                    lastScanAt: scans.length ? (scans[scans.length - 1] as string) : null,
                    scanErrors: rows.filter((r) => r.last_error).length,
                };
            },
            { networks: [], openPayments: null, unmatchedTransfers: null, lastScanAt: null, scanErrors: 0 }
        ),

        safe(
            "audit",
            async () => {
                if (!scope.audit) return { rows: [], ok: false };
                const { data, error } = await admin
                    .from("audit_events")
                    .select("id, actor_id, action, metadata, ip_address, created_at")
                    .order("created_at", { ascending: false })
                    .limit(10);
                if (error) throw error;

                const actorIds = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))];
                const emails = new Map<string, string>();
                if (actorIds.length) {
                    const { data: profiles } = await admin.from("profiles").select("id, email").in("id", actorIds);
                    for (const p of profiles ?? []) emails.set(p.id, p.email);
                }

                const rows: AuditRow[] = (data ?? []).map((r) => {
                    const meta: any = r.metadata || {};
                    return {
                        id: r.id,
                        actor: r.actor_id ? emails.get(r.actor_id) || "unknown user" : "system",
                        action: r.action,
                        target: meta.target || meta.summary || "",
                        timestamp: new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19) + " UTC",
                        ipAddress: r.ip_address || "-",
                    };
                });
                return { rows, ok: true };
            },
            { rows: [], ok: false }
        ),
    ]);

    return { generatedAt: now.toISOString(), users, enrolments, revenue, articles, payments, audit };
}

/** "+12%" / "-4%" / "New" / null. Compares sign-ups this month with last month. */
export function monthOverMonth(thisMonth: number | null, lastMonth: number | null): string | null {
    if (thisMonth === null || lastMonth === null) return null;
    if (lastMonth === 0) return thisMonth > 0 ? "New this month" : null;
    const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% vs last month`;
}


