/**
 * Which networks we accept USDC on.
 *
 * The token addresses are NATIVE USDC issued by Circle, copied from Circle's official list:
 * https://developers.circle.com/stablecoins/usdc-contract-addresses
 * They are pinned on purpose. If you ever add a network, copy its address from that page,
 * never from a search result or a wallet. Bridged tokens (USDC.e, USDbC) have different
 * addresses and are deliberately NOT accepted.
 */

export type UsdcChainId = "base" | "polygon" | "arbitrum" | "ethereum" | "base-sepolia";

export interface UsdcChain {
    id: UsdcChainId;
    name: string;
    chainId: number;
    usdc: `0x${string}`;
    /** How many blocks to wait before trusting a deposit */
    confirmations: number;
    explorer: string;
    testnet: boolean;
    /** Free public endpoint, used ONLY for testnets */
    publicRpc?: string;
}

export const USDC_CHAINS: Record<UsdcChainId, UsdcChain> = {
    base: {
        id: "base",
        name: "Base",
        chainId: 8453,
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        confirmations: 30, // about 1 minute at 2-second blocks
        explorer: "https://basescan.org",
        testnet: false,
    },
    polygon: {
        id: "polygon",
        name: "Polygon",
        chainId: 137,
        usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        confirmations: 128,
        explorer: "https://polygonscan.com",
        testnet: false,
    },
    arbitrum: {
        id: "arbitrum",
        name: "Arbitrum One",
        chainId: 42161,
        usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        confirmations: 120,
        explorer: "https://arbiscan.io",
        testnet: false,
    },
    ethereum: {
        id: "ethereum",
        name: "Ethereum",
        chainId: 1,
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        confirmations: 12,
        explorer: "https://etherscan.io",
        testnet: false,
    },
    "base-sepolia": {
        id: "base-sepolia",
        name: "Base Sepolia (test network)",
        chainId: 84532,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        confirmations: 3,
        explorer: "https://sepolia.basescan.org",
        testnet: true,
        publicRpc: "https://sepolia.base.org",
    },
};

export interface ResolvedUsdcChain extends UsdcChain {
    rpcUrls: string[];
}

export type Env = Record<string, string | undefined>;

export function getNetworkMode(env: Env = process.env): "mainnet" | "testnet" {
    return env.USDC_NETWORK === "testnet" ? "testnet" : "mainnet";
}

const rpcEnvName = (id: string) => `RPC_URL_${id.toUpperCase().replace(/-/g, "_")}`;

/**
 * The networks that are switched on and have a node to talk to.
 * Mainnet mode only ever uses real networks; testnet mode only ever uses test networks,
 * so test money and real money can never be mixed up.
 */
export function getEnabledChains(env: Env = process.env): ResolvedUsdcChain[] {
    const mode = getNetworkMode(env);
    const wanted =
        mode === "testnet"
            ? ["base-sepolia"]
            : (env.USDC_CHAINS || "base")
                  .split(",")
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean);

    const resolved: ResolvedUsdcChain[] = [];
    for (const id of wanted) {
        const chain = USDC_CHAINS[id as UsdcChainId];
        if (!chain || chain.testnet !== (mode === "testnet")) continue;

        const configured = (env[rpcEnvName(id)] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const rpcUrls = configured.length ? configured : chain.publicRpc ? [chain.publicRpc] : [];

        // A mainnet network without its own node is skipped: the free public nodes are not reliable enough for payments
        if (rpcUrls.length === 0) continue;
        resolved.push({ ...chain, rpcUrls });
    }
    return resolved;
}

export function isUsdcConfigured(env: Env = process.env): boolean {
    return !!env.USDC_XPUB && getEnabledChains(env).length > 0;
}
