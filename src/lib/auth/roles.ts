// Pure data, safe to import from both server and browser code.
// This is the single place that says which role can open which part of /admin.

export const ALL_ROLES = [
    "visitor",
    "learner",
    "customer",
    "researcher",
    "editor",
    "administrator",
    "finance_operator",
] as const;

export type SectionKey = "overview" | "content" | "academy" | "users" | "orders" | "promotions" | "ai";

export const SECTION_ROLES: Record<SectionKey, string[]> = {
    overview: ["researcher", "editor", "finance_operator", "administrator"],
    content: ["researcher", "editor", "administrator"],
    academy: ["editor", "administrator"],
    users: ["administrator"],
    orders: ["finance_operator", "administrator"],
    promotions: ["finance_operator", "administrator"], // discounts change revenue, so they sit with the money roles
    ai: ["editor", "administrator"], // AI Opportunities: platforms, assistance requests, announcements
};

/** Anyone who may enter /admin at all. */
export const ADMIN_AREA_ROLES = SECTION_ROLES.overview;

export function canAccess(role: string | undefined, section: SectionKey) {
    return !!role && SECTION_ROLES[section].includes(role);
}

export const ROLE_INFO: Record<string, { label: string; summary: string }> = {
    administrator: {
        label: "Administrator",
        summary: "Full access: users and roles, content, academy, orders, refunds and the audit log.",
    },
    editor: {
        label: "Editor",
        summary: "Publishes and edits research articles and manages the Academy. No access to users or money.",
    },
    researcher: {
        label: "Researcher",
        summary: "Writes their own articles as drafts and submits them for review. Cannot publish.",
    },
    finance_operator: {
        label: "Finance operator",
        summary: "Reconciles orders, marks failures and records refunds. No access to content or users.",
    },
    customer: { label: "Customer", summary: "Has bought something. No admin access." },
    learner: { label: "Learner", summary: "Default for new sign-ups. No admin access." },
    visitor: { label: "Visitor", summary: "Registered but inactive. No admin access." },
};
