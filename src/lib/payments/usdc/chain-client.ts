import { createPublicClient, erc20Abi, fallback, http } from "viem";
import type { ResolvedUsdcChain } from "@/lib/payments/usdc/chains";

/** The two things we need from a blockchain node. Kept tiny so tests can swap in a fake. */
export interface ChainReader {
    getBlockNumber(): Promise<bigint>;
    usdcBalanceAt(token: `0x${string}`, owner: `0x${string}`, blockNumber: bigint): Promise<bigint>;
}

export function createChainReader(chain: ResolvedUsdcChain): ChainReader {
    const transports = chain.rpcUrls.map((url) => http(url, { timeout: 10_000, retryCount: 1 }));
    const client = createPublicClient({
        transport: transports.length > 1 ? fallback(transports) : transports[0],
    });

    return {
        getBlockNumber: () => client.getBlockNumber(),
        // Cast: viem's types assume "strict" TypeScript, which this project has switched off
        usdcBalanceAt: (token, owner, blockNumber) =>
            client.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [owner],
                blockNumber,
            } as any) as Promise<bigint>,
    };
}

export interface ChainBalance {
    chain: string;
    balance: bigint;
    ok: boolean;
    error?: string;
}

/**
 * How much real USDC sits at an address on each enabled network, counting only blocks that already
 * have enough confirmations on top of them. A network that is down is reported, not guessed.
 * Throws only if EVERY network failed, so callers never mistake an outage for "nothing paid".
 */
export async function getConfirmedUsdc(
    address: string,
    chains: ResolvedUsdcChain[],
    readerFor: (chain: ResolvedUsdcChain) => ChainReader = createChainReader
): Promise<{ total: bigint; perChain: ChainBalance[] }> {
    const perChain = await Promise.all(
        chains.map(async (chain): Promise<ChainBalance> => {
            try {
                const reader = readerFor(chain);
                const latest = await reader.getBlockNumber();
                const target = latest > BigInt(chain.confirmations) ? latest - BigInt(chain.confirmations) : 0n;
                const balance = await reader.usdcBalanceAt(chain.usdc, address as `0x${string}`, target);
                return { chain: chain.id, balance, ok: true };
            } catch (err: any) {
                console.error(`USDC balance check failed on ${chain.id}:`, err?.shortMessage || err?.message);
                return { chain: chain.id, balance: 0n, ok: false, error: "unreachable" };
            }
        })
    );

    if (perChain.length === 0 || perChain.every((c) => !c.ok)) {
        throw new Error("Could not reach any blockchain node.");
    }

    return { total: perChain.reduce((sum, c) => sum + c.balance, 0n), perChain };
}
