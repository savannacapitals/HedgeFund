import { createPublicClient, fallback, http, parseAbiItem } from "viem";
import type { ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import { tokenSymbolFor } from "@/lib/payments/stablecoin/networks";
import { FIRST_SCAN_MINUTES, type IncomingTransfer, type ScanOptions, type ScanResult } from "@/lib/payments/stablecoin/scanners/types";

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/** Largest block span one request asks for (some node providers refuse big ranges) */
const LOG_RANGE = 2000;
const MAX_WINDOWS_PER_RUN = 5;

/**
 * Finds USDC / USDT transfers into our address on an Ethereum-style network.
 * Only blocks with enough confirmations on top are read, and only the exact token contracts are asked for.
 */
export async function scanEvm(network: ResolvedNetwork, cursor: string | null, opts: ScanOptions = {}): Promise<ScanResult> {
    const transports = network.urls.map((u) => http(u, { timeout: 10_000, retryCount: 1 }));
    const client: any = createPublicClient({ transport: transports.length > 1 ? fallback(transports) : transports[0] });

    const latest: bigint = await client.getBlockNumber();
    const safeHead = latest > BigInt(network.confirmations) ? latest - BigInt(network.confirmations) : 0n;

    let from: bigint;
    if (cursor) {
        from = BigInt(cursor) + 1n;
    } else {
        const minutes = opts.firstScanMinutes ?? FIRST_SCAN_MINUTES;
        const back = BigInt(Math.ceil((minutes * 60) / network.blockSeconds));
        from = safeHead > back ? safeHead - back : 0n;
    }

    const tokenAddresses = network.tokens.map((t) => t.id as `0x${string}`);
    const transfers: IncomingTransfer[] = [];
    const blockTimes = new Map<bigint, Date>();
    let lastDone: bigint | null = null;

    for (let w = 0; w < MAX_WINDOWS_PER_RUN && from <= safeHead; w++) {
        const to = from + BigInt(LOG_RANGE) - 1n < safeHead ? from + BigInt(LOG_RANGE) - 1n : safeHead;

        const logs: any[] = await client.getLogs({
            address: tokenAddresses,
            event: TRANSFER_EVENT,
            args: { to: network.address as `0x${string}` },
            fromBlock: from,
            toBlock: to,
        });

        for (const log of logs) {
            if (log.removed) continue;
            // Defence in depth: re-check everything the node told us
            const token = tokenSymbolFor(network, log.address);
            const recipient = String(log.args?.to || "").toLowerCase();
            const value = log.args?.value;
            if (!token || recipient !== network.address.toLowerCase() || typeof value !== "bigint" || value <= 0n) continue;

            let when = blockTimes.get(log.blockNumber);
            if (!when) {
                const block = await client.getBlock({ blockNumber: log.blockNumber });
                when = new Date(Number(block.timestamp) * 1000);
                blockTimes.set(log.blockNumber, when);
            }

            transfers.push({
                network: network.id,
                token,
                ref: `${log.transactionHash}:${log.logIndex}`,
                txid: log.transactionHash,
                from: log.args?.from ?? null,
                to: network.address,
                amountUnits: value,
                occurredAt: when,
            });
        }

        lastDone = to;
        from = to + 1n;
    }

    return { transfers, nextCursor: lastDone !== null ? lastDone.toString() : cursor };
}
