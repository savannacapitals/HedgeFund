/**
 * Reads the M-Pesa SMS that arrives on the Pochi phone when a customer pays, e.g.
 *   "SGL4ABC12D Confirmed. You have received Ksh500.00 from JOHN DOE ..."
 * Only the code, the amount and (if present) the sender's name are used.
 * The wording of M-Pesa SMS changes now and then, so every part is matched loosely and anything that
 * does not look like an incoming payment is ignored. TEST WITH A REAL SMS before going live.
 */
export interface ParsedPochiSms {
    code: string;
    amount: number;
    sender: string | null;
}

export const MPESA_CODE = /^[A-Z][A-Z0-9]{9}$/;

export function normaliseMpesaCode(input: string): string {
    return String(input || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function parsePochiSms(message: string): ParsedPochiSms | null {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text) return null;

    // Only incoming money: skip "you have sent", "paid to", "withdraw", balances, airtime and so on
    if (!/\breceived\b/i.test(text)) return null;

    const code = text.match(/\b([A-Z][A-Z0-9]{9})\b\s*(?:Confirmed|confirmed)/i)?.[1]?.toUpperCase();
    if (!code || !MPESA_CODE.test(code)) return null;

    const amountText = text.match(/received\s+(?:Ksh|KES)\.?\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1];
    if (!amountText) return null;
    const amount = Number(amountText.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const sender = text.match(/\bfrom\s+(.+?)(?:\s+\d{9,12}\b|\s+on\s+\d|\.\s|$)/i)?.[1]?.trim().slice(0, 80) || null;

    return { code, amount, sender };
}
