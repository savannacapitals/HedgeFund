import type { ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import { FIRST_SCAN_MINUTES, type IncomingTransfer, type ScanOptions, type ScanResult } from "@/lib/payments/stablecoin/scanners/types";

const MAX_PAGES = 5;
const OVERLAP_MS = 60_000;

/**
 * Finds USDT (TRC-20) transfers into our Tron address using TronGrid.
 * Only confirmed (solidified) transfers are returned by the API, and we re-check the token contract and recipient ourselves.
 */
export async function scanTron(network: ResolvedNetwork, cursor: string | null, opts: ScanOptions = {}): Promise<ScanResult> {
    const now = opts.now ?? Date.now;
    const base = network.urls[0].replace(/\/$/, "");
    const usdt = network.tokens[0];
    const sinceMs = cursor ? Number(cursor) : now() - (opts.firstScanMinutes ?? FIRST_SCAN_MINUTES) * 60_000;

    const headers: Record<string, string> = { accept: "application/json" };
    if (network.apiKey) headers["TRON-PRO-API-KEY"] = network.apiKey;

    const transfers: IncomingTransfer[] = [];
    let maxTs = sinceMs;
    let fingerprint: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url =
            `${base}/v1/accounts/${network.address}/transactions/trc20` +
            `?only_to=true&only_confirmed=true&limit=200&order_by=block_timestamp,asc` +
            `&min_timestamp=${sinceMs}&contract_address=${usdt.id}` +
            (fingerprint ? `&fingerprint=${encodeURIComponent(fingerprint)}` : "");

        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`TronGrid answered ${res.status}`);
        const json: any = await res.json();
        if (json.success === false) throw new Error("TronGrid reported an error");

        for (const item of json.data ?? []) {
            // Re-check everything: right token contract, right recipient, a plain transfer, a sensible amount
            if (item.type !== "Transfer") continue;
            if (item.to !== network.address) continue;
            if (item.token_info?.address !== usdt.id) continue;
            if (!/^\d+$/.test(String(item.value))) continue;
            const amount = BigInt(item.value);
            if (amount <= 0n) continue;

            const ts = Number(item.block_timestamp);
            if (ts > maxTs) maxTs = ts;
            transfers.push({
                network: "tron",
                token: usdt.symbol,
                ref: String(item.transaction_id),
                txid: String(item.transaction_id),
                from: item.from ?? null,
                to: network.address,
                amountUnits: amount,
                occurredAt: new Date(ts),
            });
        }

        fingerprint = json.meta?.fingerprint;
        if (!fingerprint) break;
    }

    // Keep a little overlap so a transfer that shows up late is never skipped (duplicates are ignored later)
    const next = Math.max(sinceMs, Math.min(maxTs - OVERLAP_MS, now() - 2 * 60_000));
    return { transfers, nextCursor: String(next) };
}
