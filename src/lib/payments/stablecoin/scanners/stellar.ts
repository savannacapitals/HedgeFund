import type { ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import { FIRST_SCAN_MINUTES, type IncomingTransfer, type ScanOptions, type ScanResult } from "@/lib/payments/stablecoin/scanners/types";

const PAGE = 200;
const MAX_PAGES = 5;

/** "40.0032170" -> 40003217 units. Returns null when it has a non-zero 7th decimal (can't be a 6-decimal amount). */
export function stellarAmountToUnits(amount: string): bigint | null {
    const m = /^(\d+)(?:\.(\d{1,7}))?$/.exec(amount);
    if (!m) return null;
    const frac = (m[2] ?? "").padEnd(7, "0");
    if (frac[6] !== "0") return null;
    return BigInt(m[1]) * 1_000_000n + BigInt(frac.slice(0, 6));
}

/**
 * Finds USDC payments sent to our Stellar deposit address.
 * The address is a "muxed" address: an account plus a payment ID. A payment only counts if it carries OUR
 * payment ID, because that is what the exchange needs to credit it.
 */
export async function scanStellar(network: ResolvedNetwork, cursor: string | null, opts: ScanOptions = {}): Promise<ScanResult> {
    const now = opts.now ?? Date.now;
    const base = network.urls[0].replace(/\/$/, "");
    const [code, issuer] = network.tokens[0].id.split(":");
    const account = network.stellarAccount!;
    const cutoff = now() - (opts.firstScanMinutes ?? FIRST_SCAN_MINUTES) * 60_000;

    const transfers: IncomingTransfer[] = [];
    let nextCursor = cursor;
    let pageCursor = cursor;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url = cursor || pageCursor
            ? `${base}/accounts/${account}/payments?order=asc&limit=${PAGE}&include_failed=false&cursor=${encodeURIComponent((pageCursor || cursor)!)}`
            : `${base}/accounts/${account}/payments?order=desc&limit=50&include_failed=false`;

        const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`Horizon answered ${res.status}`);
        const json: any = await res.json();
        const records: any[] = json?._embedded?.records ?? [];
        if (!records.length) break;

        const firstRun = !cursor && !pageCursor;
        for (const r of records) {
            if (!["payment", "path_payment_strict_receive", "path_payment_strict_send"].includes(r.type)) continue;
            if (r.transaction_successful === false) continue;
            if (r.to !== account) continue;
            // Must be addressed to OUR payment ID, otherwise the exchange would not credit it
            const addressedToUs = r.to_muxed === network.address || (r.to_muxed_id != null && String(r.to_muxed_id) === network.stellarMuxedId);
            if (!addressedToUs) continue;
            if (r.asset_type === "native" || r.asset_code !== code || r.asset_issuer !== issuer) continue;

            const units = stellarAmountToUnits(String(r.amount));
            if (units === null || units <= 0n) continue;

            const when = new Date(r.created_at);
            if (firstRun && when.getTime() < cutoff) continue;

            transfers.push({
                network: "stellar",
                token: "USDC",
                ref: String(r.id),
                txid: String(r.transaction_hash),
                from: r.from ?? null,
                to: network.address,
                amountUnits: units,
                occurredAt: when,
            });
        }

        if (firstRun) {
            // Newest page only: continue from the newest record next time
            nextCursor = records[0].paging_token;
            break;
        }
        pageCursor = records[records.length - 1].paging_token;
        nextCursor = pageCursor;
        if (records.length < PAGE) break;
    }

    return { transfers, nextCursor };
}
