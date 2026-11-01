import type { ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import { FIRST_SCAN_MINUTES, type IncomingTransfer, type ScanOptions, type ScanResult } from "@/lib/payments/stablecoin/scanners/types";

const MAX_SIGNATURES = 50;
const MAX_TX_PER_ACCOUNT = 25;

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`Solana node answered ${res.status}`);
    const json: any = await res.json();
    if (json.error) throw new Error(`Solana node error: ${json.error.message}`);
    return json.result;
}

/**
 * Finds USDC / USDT transfers into our Solana address.
 * We look at the token accounts that belong to our address for each official mint, read only finalized
 * transactions, and work out how much each one added to our balance.
 */
export async function scanSolana(network: ResolvedNetwork, cursor: string | null, opts: ScanOptions = {}): Promise<ScanResult> {
    const now = opts.now ?? Date.now;
    const url = network.urls[0];
    const cutoffSec = Math.floor(now() / 1000) - (opts.firstScanMinutes ?? FIRST_SCAN_MINUTES) * 60;

    const lastSeen: Record<string, string> = cursor ? JSON.parse(cursor) : {};
    const nextSeen: Record<string, string> = { ...lastSeen };
    const transfers: IncomingTransfer[] = [];

    for (const token of network.tokens) {
        const owned = await rpc(url, "getTokenAccountsByOwner", [
            network.address,
            { mint: token.id },
            { encoding: "jsonParsed", commitment: "finalized" },
        ]);

        for (const account of owned?.value ?? []) {
            const tokenAccount: string = account.pubkey;
            const params: any = { limit: MAX_SIGNATURES, commitment: "finalized" };
            if (lastSeen[tokenAccount]) params.until = lastSeen[tokenAccount];

            const sigs: any[] = await rpc(url, "getSignaturesForAddress", [tokenAccount, params]);
            if (!sigs.length) continue;

            // Oldest first, and skip anything that failed
            const ordered = [...sigs].reverse().filter((s) => s.err === null);
            let allOk = true;

            for (const s of ordered.slice(-MAX_TX_PER_ACCOUNT)) {
                // The first ever scan only cares about recent activity
                if (!lastSeen[tokenAccount] && s.blockTime && s.blockTime < cutoffSec) continue;

                const tx = await rpc(url, "getTransaction", [
                    s.signature,
                    { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
                ]);
                if (!tx || tx.meta?.err) continue;

                const pre: any[] = tx.meta.preTokenBalances ?? [];
                const post: any[] = tx.meta.postTokenBalances ?? [];

                for (const p of post) {
                    if (p.mint !== token.id || p.owner !== network.address) continue;
                    const before = pre.find((x) => x.accountIndex === p.accountIndex);
                    const gained = BigInt(p.uiTokenAmount.amount) - BigInt(before?.uiTokenAmount?.amount ?? "0");
                    if (gained <= 0n) continue;

                    // The sender is whoever lost the same token in the same transaction
                    const sender = post.find((q) => {
                        const b = pre.find((x) => x.accountIndex === q.accountIndex);
                        return q.mint === token.id && q.owner !== network.address && BigInt(b?.uiTokenAmount?.amount ?? "0") > BigInt(q.uiTokenAmount.amount);
                    });

                    transfers.push({
                        network: "solana",
                        token: token.symbol,
                        ref: `${s.signature}:${token.id}`,
                        txid: s.signature,
                        from: sender?.owner ?? null,
                        to: network.address,
                        amountUnits: gained,
                        occurredAt: new Date((tx.blockTime ?? s.blockTime ?? Math.floor(now() / 1000)) * 1000),
                    });
                }
            }

            // sigs[0] is the newest. Only move forward if every transaction was read successfully.
            if (allOk) nextSeen[tokenAccount] = sigs[0].signature;
        }
    }

    return { transfers, nextCursor: JSON.stringify(nextSeen) };
}
