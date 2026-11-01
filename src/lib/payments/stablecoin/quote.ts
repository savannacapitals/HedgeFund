import { randomInt } from "crypto";
import { formatUnits } from "viem";
import type { Env } from "@/lib/payments/stablecoin/networks";

export class PaymentConfigError extends Error {}

export const DECIMALS = 6;
/** Extra millionths added to every price so each open order has its own exact amount */
export const MAX_TAG = 9999;

/**
 * The price of an order in stablecoin units (1 USDC or 1 USDT = 1,000,000 units).
 * Both coins are dollar-pegged, so a USD price maps 1:1. Orders priced in KES use USD_TO_KES_RATE
 * (shillings per dollar) and are rounded UP to the next cent. Whole-number maths, so no floating-point dust.
 */
export function priceInUnits(total: number, currency: string, env: Env = process.env): { units: bigint; rate: number } {
    const amount = Number(total);
    if (!Number.isFinite(amount) || amount <= 0) throw new PaymentConfigError("Invalid order amount.");

    const minor = BigInt(Math.round(amount * 100));
    let cents: bigint;
    let rate = 1;

    if (currency === "USD") {
        cents = minor;
    } else if (currency === "KES") {
        rate = Number(env.USD_TO_KES_RATE);
        if (!Number.isFinite(rate) || rate <= 0) throw new PaymentConfigError("Payments are not set up yet (missing exchange rate).");
        const rateMicro = BigInt(Math.round(rate * 1_000_000));
        cents = (minor * 1_000_000n + rateMicro - 1n) / rateMicro;
    } else {
        throw new PaymentConfigError(`Orders in ${currency} are not supported.`);
    }

    if (cents < 1n) throw new PaymentConfigError("Order amount is too small to charge.");
    return { units: cents * 10_000n, rate };
}

/** A random number from 1 to 9999: under one US cent, so the customer pays at most 0.009999 extra */
export function randomTag(): bigint {
    return BigInt(randomInt(1, MAX_TAG + 1));
}

/** Always six decimals, because the last digits are what identify the order: 40.003217 */
export function formatAmount(units: bigint | number | string): string {
    const text = formatUnits(BigInt(units), DECIMALS);
    const [whole, frac = ""] = text.split(".");
    return `${whole}.${frac.padEnd(DECIMALS, "0")}`;
}
