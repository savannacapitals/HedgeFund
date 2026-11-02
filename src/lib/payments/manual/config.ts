import type { Env } from "@/lib/payments/stablecoin/networks";

export type ManualMethod = "pochi" | "bank";
export const MANUAL_METHODS: ManualMethod[] = ["pochi", "bank"];

export class ManualPaymentError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

/** M-Pesa allows at most KSh 250,000 per transaction */
export const POCHI_MAX_KES = 250_000;

export interface PochiConfig {
    phone: string; // as people dial it: 0700021380
    displayPhone: string; // 0700 021 380
    accountName: string | null; // the name M-Pesa shows on the "Hakikisha" confirmation screen
}

export interface BankConfig {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string | null;
    swift: string | null;
    currency: "KES" | "USD";
}

/** Pochi is on unless POCHI_ENABLED=false. The number defaults to the Savanna Pochi number. */
export function getPochiConfig(env: Env = process.env): PochiConfig | null {
    if (env.POCHI_ENABLED === "false") return null;
    const phone = (env.POCHI_PHONE || "0700021380").replace(/[\s-]/g, "");
    if (!/^(0|\+?254)[17]\d{8}$/.test(phone)) return null;
    const national = phone.replace(/^\+?254/, "0");
    return {
        phone: national,
        displayPhone: `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}`,
        accountName: env.POCHI_ACCOUNT_NAME?.trim() || null,
    };
}

/** Bank transfer is on only when the three required details are set. Nothing is hard-coded. */
export function getBankConfig(env: Env = process.env): BankConfig | null {
    const bankName = env.BANK_NAME?.trim();
    const accountName = env.BANK_ACCOUNT_NAME?.trim();
    const accountNumber = env.BANK_ACCOUNT_NUMBER?.trim();
    if (!bankName || !accountName || !accountNumber) return null;
    return {
        bankName,
        accountName,
        accountNumber,
        branch: env.BANK_BRANCH?.trim() || null,
        swift: env.BANK_SWIFT_CODE?.trim() || null,
        currency: env.BANK_CURRENCY?.trim().toUpperCase() === "USD" ? "USD" : "KES",
    };
}

/** The short reference that ties a payment to its order: SC-1A2B3C4D */
export function orderReference(orderId: string): string {
    return `SC-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function usdToKesRate(env: Env): number {
    const rate = Number(env.USD_TO_KES_RATE);
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new ManualPaymentError("Payments are not set up yet (missing exchange rate).", 503);
    }
    return rate;
}

/**
 * What the customer must pay, in the currency of the chosen method.
 * Conversions round UP so we are never short. Pochi (M-Pesa) only moves whole shillings.
 */
export function quoteManual(
    total: number,
    orderCurrency: string,
    target: "KES" | "USD",
    wholeUnits: boolean,
    env: Env = process.env
): { amount: number; currency: "KES" | "USD"; rate: number | null } {
    const value = Number(total);
    if (!Number.isFinite(value) || value <= 0) throw new ManualPaymentError("Invalid order amount.");
    if (orderCurrency !== "KES" && orderCurrency !== "USD") {
        throw new ManualPaymentError(`Orders in ${orderCurrency} are not supported.`);
    }

    let amount = value;
    let rate: number | null = null;
    if (orderCurrency !== target) {
        rate = usdToKesRate(env);
        amount = orderCurrency === "USD" ? value * rate : value / rate;
    }

    // Round up, ignoring floating-point dust (so 40.000000001 is not bumped a whole unit)
    const scale = wholeUnits ? 1 : 100;
    amount = Math.ceil(Math.round(amount * scale * 1e6) / 1e6) / scale;
    if (amount < (wholeUnits ? 1 : 0.01)) throw new ManualPaymentError("Order amount is too small to charge.");
    return { amount, currency: target, rate };
}
