import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledNetworks, type Family, type NetworkId, type ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import { scanEvm } from "@/lib/payments/stablecoin/scanners/evm";
import { scanTron } from "@/lib/payments/stablecoin/scanners/tron";
import { scanSolana } from "@/lib/payments/stablecoin/scanners/solana";
import { scanStellar } from "@/lib/payments/stablecoin/scanners/stellar";
import type { ScanOptions, ScanResult } from "@/lib/payments/stablecoin/scanners/types";

/** Many visitors can be waiting on a payment at once, but each network is only asked this often */
export const MIN_SCAN_INTERVAL_MS = 10_000;

export type Scanner = (network: ResolvedNetwork, cursor: string | null, opts?: ScanOptions) => Promise<ScanResult>;

export const defaultScanners: Record<Family, Scanner> = {
    evm: scanEvm,
    tron: scanTron,
    solana: scanSolana,
    stellar: scanStellar,
};

export interface IngestReport {
    network: NetworkId;
    found: number;
    skipped?: boolean;
    error?: string;
}

// Error text can contain a node URL with a secret key in it: never store that
const safeMessage = (err: any) =>
    String(err?.shortMessage || err?.message || "scan failed")
        .replace(/https?:\/\/\S+/g, "[url]")
        .slice(0, 300);

/**
 * Reads new incoming transfers from every enabled network and saves them.
 * Saving every transfer (even ones that match no order) gives you a full record to reconcile against.
 */
export async function ingestNetworks(
    options: { force?: boolean; scanners?: Partial<Record<Family, Scanner>>; now?: () => number } = {}
): Promise<IngestReport[]> {
    const admin = createAdminClient();
    const now = options.now ?? Date.now;
    const scanners = { ...defaultScanners, ...(options.scanners ?? {}) };

    return Promise.all(
        getEnabledNetworks().map(async (network): Promise<IngestReport> => {
            const { data: row } = await admin.from("scan_cursors").select("*").eq("network", network.id).maybeSingle();

            if (!options.force && row?.last_scan_at && now() - Date.parse(row.last_scan_at) < MIN_SCAN_INTERVAL_MS) {
                return { network: network.id, found: 0, skipped: true };
            }

            // Mark the scan as started first, so a second request right behind this one skips it
            await admin
                .from("scan_cursors")
                .upsert({ network: network.id, cursor: row?.cursor ?? null, last_scan_at: new Date(now()).toISOString(), last_error: row?.last_error ?? null }, { onConflict: "network" });

            try {
                const result = await scanners[network.family](network, row?.cursor ?? null, { now });

                const rows = result.transfers
                    .filter((t) => t.amountUnits > 0n && t.amountUnits < BigInt(Number.MAX_SAFE_INTEGER))
                    .map((t) => ({
                        network: t.network,
                        token: t.token,
                        ref: t.ref,
                        txid: t.txid,
                        from_address: t.from,
                        to_address: t.to,
                        amount_units: Number(t.amountUnits),
                        occurred_at: t.occurredAt.toISOString(),
                    }));

                if (rows.length) {
                    const { error } = await admin.from("chain_transfers").upsert(rows, { onConflict: "network,ref", ignoreDuplicates: true });
                    if (error) throw new Error(error.message);
                }

                // The position only moves forward once the transfers are safely saved
                await admin
                    .from("scan_cursors")
                    .upsert({ network: network.id, cursor: result.nextCursor ?? row?.cursor ?? null, last_scan_at: new Date(now()).toISOString(), last_error: null }, { onConflict: "network" });

                return { network: network.id, found: rows.length };
            } catch (err: any) {
                const message = safeMessage(err);
                console.error(`Scan of ${network.id} failed:`, message);
                await admin
                    .from("scan_cursors")
                    .upsert({ network: network.id, cursor: row?.cursor ?? null, last_scan_at: new Date(now()).toISOString(), last_error: message }, { onConflict: "network" });
                return { network: network.id, found: 0, error: message };
            }
        })
    );
}
