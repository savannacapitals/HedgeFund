import {
    parseEvmAddress,
    parseSolanaAddress,
    parseStellarMuxedAddress,
    parseTronAddress,
} from "@/lib/payments/stablecoin/address";

/**
 * Where we accept USDC and USDT.
 *
 * Every token address below was copied from the issuer's official list, never from a search result:
 *   USDC  Circle   https://developers.circle.com/stablecoins/usdc-contract-addresses
 *   USDT0 Tether   https://docs.usdt0.to/technical-documentation/deployments
 *   USDT  Tether   https://tether.to/en/supported-protocols/  (Ethereum, Tron, Solana)
 * Only these exact tokens count. Look-alike tokens and bridged versions (for example USDC.e) are ignored.
 * Circle no longer supports USDC on Tron, so Tron accepts USDT only.
 */

export type NetworkId = "ethereum" | "arbitrum" | "polygon" | "ink" | "plasma" | "conflux" | "tron" | "solana" | "stellar";
export type TokenSymbol = "USDC" | "USDT";
export type Family = "evm" | "tron" | "solana" | "stellar";

export interface TokenDef {
    symbol: TokenSymbol;
    /** Contract address, token mint, or "CODE:issuer" depending on the network */
    id: string;
}

export interface NetworkDef {
    id: NetworkId;
    name: string;
    family: Family;
    chainId?: number;
    /** Blocks to wait before a deposit counts (EVM networks only) */
    confirmations: number;
    /** Average seconds per block, used to size the first look-back */
    blockSeconds: number;
    tokens: TokenDef[];
    addressUrl: string;
}

export const NETWORKS: Record<NetworkId, NetworkDef> = {
    ethereum: {
        id: "ethereum", name: "Ethereum", family: "evm", chainId: 1, confirmations: 12, blockSeconds: 12,
        tokens: [
            { symbol: "USDC", id: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
            { symbol: "USDT", id: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
        ],
        addressUrl: "https://etherscan.io/address/",
    },
    arbitrum: {
        id: "arbitrum", name: "Arbitrum One", family: "evm", chainId: 42161, confirmations: 240, blockSeconds: 0.25,
        tokens: [{ symbol: "USDT", id: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" }],
        addressUrl: "https://arbiscan.io/address/",
    },
    polygon: {
        id: "polygon", name: "Polygon", family: "evm", chainId: 137, confirmations: 128, blockSeconds: 2,
        tokens: [{ symbol: "USDT", id: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" }],
        addressUrl: "https://polygonscan.com/address/",
    },
    ink: {
        id: "ink", name: "Ink", family: "evm", chainId: 57073, confirmations: 60, blockSeconds: 1,
        tokens: [
            { symbol: "USDC", id: "0x2D270e6886d130D724215A266106e6832161EAEd" },
            { symbol: "USDT", id: "0x0200C29006150606B650577BBE7B6248F58470c1" }, // USDT0
        ],
        addressUrl: "https://explorer.inkonchain.com/address/",
    },
    plasma: {
        id: "plasma", name: "Plasma", family: "evm", chainId: 9745, confirmations: 30, blockSeconds: 1,
        tokens: [{ symbol: "USDT", id: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" }], // USDT0
        addressUrl: "https://plasmascan.to/address/",
    },
    conflux: {
        id: "conflux", name: "Conflux eSpace", family: "evm", chainId: 1030, confirmations: 60, blockSeconds: 1,
        tokens: [{ symbol: "USDT", id: "0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff" }], // USDT0
        addressUrl: "https://evm.confluxscan.org/address/",
    },
    tron: {
        id: "tron", name: "Tron", family: "tron", confirmations: 0, blockSeconds: 3,
        tokens: [{ symbol: "USDT", id: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }],
        addressUrl: "https://tronscan.org/#/address/",
    },
    solana: {
        id: "solana", name: "Solana", family: "solana", confirmations: 0, blockSeconds: 0.4,
        tokens: [
            { symbol: "USDC", id: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
            { symbol: "USDT", id: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
        ],
        addressUrl: "https://solscan.io/account/",
    },
    stellar: {
        id: "stellar", name: "Stellar", family: "stellar", confirmations: 0, blockSeconds: 5,
        tokens: [{ symbol: "USDC", id: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" }],
        addressUrl: "https://stellar.expert/explorer/public/account/",
    },
};

export const NETWORK_ORDER: NetworkId[] = ["ethereum", "tron", "solana", "arbitrum", "polygon", "ink", "plasma", "conflux", "stellar"];

export interface ResolvedNetwork extends NetworkDef {
    /** Where customers send money (for Stellar, the M... address) */
    address: string;
    /** Node / API endpoints to talk to */
    urls: string[];
    apiKey?: string;
    /** Stellar only: the plain account behind the M... address, and the payment ID inside it */
    stellarAccount?: string;
    stellarMuxedId?: string;
}

export type Env = Record<string, string | undefined>;

const rpcEnvName = (id: string) => `RPC_URL_${id.toUpperCase()}`;

// A bad setting is reported once, not on every request
const warned = new Set<string>();
const warnOnce = (message: string) => {
    if (warned.has(message)) return;
    warned.add(message);
    console.error(message);
};
const splitList = (v: string | undefined) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * The networks that are switched on AND fully configured.
 * A network with a missing or mistyped address is skipped (and logged), so a bad setting
 * can never put a wrong address on the checkout page.
 */
export function getEnabledNetworks(env: Env = process.env): ResolvedNetwork[] {
    const wanted = env.PAY_NETWORKS ? splitList(env.PAY_NETWORKS).map((s) => s.toLowerCase()) : NETWORK_ORDER;
    const out: ResolvedNetwork[] = [];

    for (const id of NETWORK_ORDER) {
        if (!wanted.includes(id)) continue;
        const def = NETWORKS[id];

        if (def.family === "evm") {
            const raw = env.PAY_ADDRESS_EVM;
            const address = raw ? parseEvmAddress(raw) : null;
            if (raw && !address) warnOnce("PAY_ADDRESS_EVM is not a valid address. EVM networks are disabled.");
            const urls = splitList(env[rpcEnvName(id)]);
            if (address && urls.length) out.push({ ...def, address, urls });
        } else if (def.family === "tron") {
            const raw = env.PAY_ADDRESS_TRON;
            const address = raw ? parseTronAddress(raw) : null;
            if (raw && !address) warnOnce("PAY_ADDRESS_TRON is not a valid address. Tron is disabled.");
            if (address) out.push({ ...def, address, urls: [env.TRON_API_URL || "https://api.trongrid.io"], apiKey: env.TRONGRID_API_KEY });
        } else if (def.family === "solana") {
            const raw = env.PAY_ADDRESS_SOLANA;
            const address = raw ? parseSolanaAddress(raw) : null;
            if (raw && !address) warnOnce("PAY_ADDRESS_SOLANA is not a valid address. Solana is disabled.");
            if (address) out.push({ ...def, address, urls: [env.RPC_URL_SOLANA || "https://api.mainnet-beta.solana.com"] });
        } else if (def.family === "stellar") {
            const raw = env.PAY_ADDRESS_STELLAR;
            const dest = raw ? parseStellarMuxedAddress(raw) : null;
            if (raw && !dest) warnOnce("PAY_ADDRESS_STELLAR is not a valid M... address. Stellar is disabled.");
            if (dest) out.push({ ...def, address: dest.address, urls: [env.HORIZON_URL || "https://horizon.stellar.org"], stellarAccount: dest.account, stellarMuxedId: dest.muxedId });
        }
    }
    return out;
}

export function isPaymentsConfigured(env: Env = process.env): boolean {
    return getEnabledNetworks(env).length > 0;
}

export function tokenSymbolFor(network: NetworkDef, tokenId: string): TokenSymbol | null {
    const lower = tokenId.toLowerCase();
    return network.tokens.find((t) => t.id.toLowerCase() === lower)?.symbol ?? null;
}
