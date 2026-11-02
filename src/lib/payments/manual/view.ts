import { getBankConfig, getPochiConfig, type ManualMethod } from "@/lib/payments/manual/config";

/** What the browser is allowed to see about a manual payment */
export function buildManualView(p: any) {
    const method = p.method as ManualMethod;
    const view: Record<string, unknown> = {
        id: p.id,
        method,
        status: p.status,
        amount: Number(p.amount).toFixed(2),
        currency: p.currency,
        reference: p.reference,
        providerRef: p.provider_ref ?? null,
    };
    if (method === "pochi") {
        const c = getPochiConfig();
        view.pochi = c && { phone: c.phone, displayPhone: c.displayPhone, accountName: c.accountName };
    } else {
        const c = getBankConfig();
        view.bank = c && {
            bankName: c.bankName,
            accountName: c.accountName,
            accountNumber: c.accountNumber,
            branch: c.branch,
            swift: c.swift,
            currency: c.currency,
        };
    }
    return view;
}
