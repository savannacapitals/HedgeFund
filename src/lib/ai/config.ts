// Pure data and labels for Savanna AI Opportunities. Safe to import from server and browser code.

export const AI_NAME = "Savanna AI Opportunities";
export const AI_TAGLINE = "Discover. Qualify. Apply. Earn.";
export const AI_BASE = "/ai-opportunities";

/** Server-side prices. The browser never sends a price. Override in hosting with AI_MEMBERSHIP_PRICE_KES / AI_ASSISTANCE_PRICE_USD. */
export function membershipPriceKes(): number {
    const n = Number(process.env.AI_MEMBERSHIP_PRICE_KES);
    return Number.isFinite(n) && n > 0 ? n : 100;
}
export function assistancePriceUsd(): number {
    const n = Number(process.env.AI_ASSISTANCE_PRICE_USD);
    return Number.isFinite(n) && n > 0 ? n : 15;
}
export function membershipDays(): number {
    const n = Number(process.env.AI_MEMBERSHIP_DAYS);
    return Number.isInteger(n) && n > 0 ? n : 30;
}

// Display values for client components (the real charge is always decided on the server).
export const DISPLAY_MEMBERSHIP = "KES 100";
export const DISPLAY_ASSISTANCE = "USD 15";

export const CATEGORIES = [
    { id: "ai_training", label: "AI Training", blurb: "Write, rate and improve responses that teach AI models." },
    { id: "data_annotation", label: "Data Annotation", blurb: "Label text, images, audio and video for machine learning." },
    { id: "ai_evaluation", label: "AI Model Evaluation", blurb: "Test and score model outputs against quality guidelines." },
    { id: "language_transcription", label: "Language and Transcription", blurb: "Transcription, translation and language data work." },
    { id: "expert_freelancing", label: "Expert AI Freelancing", blurb: "Specialist projects for people with professional expertise." },
    { id: "remote_digital_work", label: "Remote Digital Work", blurb: "Other remote, online work connected to the digital economy." },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const STATUSES = [
    { id: "verified", label: "Verified", help: "Official information confirms eligibility and the relevant requirements." },
    { id: "conditional", label: "Conditional", help: "Availability depends on projects, country or individual qualifications." },
    { id: "restricted", label: "Restricted", help: "The platform does not currently accept the target applicant." },
    { id: "under_review", label: "Under Review", help: "Research is incomplete." },
] as const;
export const statusLabel = (id: string) => STATUSES.find((s) => s.id === id)?.label ?? id;

export const KENYA_ELIGIBILITY = [
    { id: "yes", label: "Accepts Kenyan applicants" },
    { id: "conditional", label: "Conditional for Kenya" },
    { id: "no", label: "Does not accept Kenya" },
    { id: "unknown", label: "Not independently verified" },
] as const;
export const kenyaLabel = (id: string) => KENYA_ELIGIBILITY.find((s) => s.id === id)?.label ?? id;

export const YES_NO = ["yes", "no", "varies", "unknown"] as const;
export const yesNoLabel = (v: string) =>
    ({ yes: "Yes", no: "No", varies: "Varies", unknown: "Not independently verified" } as Record<string, string>)[v] ?? v;

export const PROGRESS_STAGES = [
    { id: "interested", label: "Interested" },
    { id: "account_created", label: "Account Created" },
    { id: "assessment_completed", label: "Assessment Completed" },
    { id: "application_submitted", label: "Application Submitted" },
    { id: "accepted", label: "Accepted" },
    { id: "first_task_completed", label: "First Task Completed" },
    { id: "first_payment_received", label: "First Payment Received" },
] as const;
export const stageLabel = (id: string) => PROGRESS_STAGES.find((s) => s.id === id)?.label ?? id;

export const REQUEST_STATUSES = [
    { id: "payment_pending", label: "Payment Pending" },
    { id: "request_received", label: "Request Received" },
    { id: "in_progress", label: "In Progress" },
    { id: "awaiting_customer", label: "Awaiting Customer" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
] as const;
export const requestStatusLabel = (id: string) => REQUEST_STATUSES.find((s) => s.id === id)?.label ?? id;

export const NOT_VERIFIED = "Not independently verified";

export const INDEPENDENCE_NOTICE =
    "Savanna Capitals is an independent research and guidance provider. We are not an agent or representative of any listed company, and no official partnership is implied unless stated on a platform's page.";
export const NO_GUARANTEE_NOTICE =
    "Platform availability, project allocation and earnings are not guaranteed. Savanna cannot guarantee that you will be accepted, assigned work or paid.";
