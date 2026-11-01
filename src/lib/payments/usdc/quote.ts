import { formatUnits } from "viem";
import type { Env } from "@/lib/payments/usdc/chains";

export class PaymentConfigError extends Error {}

export const USDC_DECIMALS = 6;

/**
 * How much USDC an order costs, in USDC's smallest unit (1 USDC = 1,000,000 units).
 * USDC is a dollar token, so a USD price converts 1:1. Orders priced in KES use the rate in
 * USD_TO_KES_RATE (shillings per dollar). Amounts are rounded UP to the next cent.
 * Uses whole-number maths so a price like 40.10 never picks up floating-point dust.
 */
export function usdcDueUnits(total: number, currency: string, env: Env = process.env): { units: bigint; rate: number } {
    const amount = Number(total);
    if (!Number.isFinite(amount) || amount <= 0) throw new PaymentConfigError("Invalid order amount.");

    const minor = BigInt(Math.round(amount * 100)); // cents (or cents of shillings)
    let cents: bigint;
    let rate: number;

    if (currency === "USD") {
        rate = 1;
        cents = minor;
    } else if (currency === "KES") {
        rate = Number(env.USD_TO_KES_RATE);
        if (!Number.isFinite(rate) || rate <= 0) {
            throw new PaymentConfigError("Payments are not set up yet (missing exchange rate).");
        }
        const rateMicro = BigInt(Math.round(rate * 1_000_000));
        // shillings -> dollars: cents = minor / rate, rounded up
        cents = (minor * 1_000_000n + rateMicro - 1n) / rateMicro;
    } else {
        throw new PaymentConfigError(`Orders in ${currency} are not supported.`);
    }

    if (cents < 1n) throw new PaymentConfigError("Order amount is too small to charge.");
    return { units: cents * 10_000n, rate };
}

/** 40000000 -> "40.00", 40500000 -> "40.50", 1234567 -> "1.234567" */
export function formatUsdc(units: bigint | number | string): string {
    const text = formatUnits(BigInt(units), USDC_DECIMALS);
    const [whole, frac = ""] = text.split(".");
    return `${whole}.${frac.padEnd(2, "0")}`;
}

/** The link wallets understand when you scan a QR code (EIP-681): send this USDC amount to this address */
export function paymentUri(chainId: number, token: string, to: string, units: bigint | number | string): string {
    return `ethereum:${token}@${chainId}/transfer?address=${to}&uint256=${BigInt(units).toString()}`;
}
