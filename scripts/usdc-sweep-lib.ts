import { hashDomain, parseSignature, toHex } from "viem";
import { randomBytes } from "crypto";
import type { LocalAccount } from "viem";

/** The parts of USDC's own contract that the sweep needs */
export const usdcSweepAbi = [
    { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "DOMAIN_SEPARATOR", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
    {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "transferWithAuthorization",
        stateMutability: "nonpayable",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
        ],
        outputs: [],
    },
] as const;

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
} as const;

const EIP712_DOMAIN_TYPES = {
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ],
} as const;

export interface UsdcDomain {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
}

/** What the token's DOMAIN_SEPARATOR() must equal if we have its name and version right */
export function expectedDomainSeparator(domain: UsdcDomain): `0x${string}` {
    return hashDomain({ domain, types: EIP712_DOMAIN_TYPES } as any);
}

export interface SignedTransfer {
    from: `0x${string}`;
    to: `0x${string}`;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: `0x${string}`;
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
}

/**
 * Signs a one-off permission, from a deposit address, to move its USDC to the treasury.
 * Anyone can submit it, so the deposit address never needs any ETH for gas.
 */
export async function signTransferToTreasury(args: {
    account: LocalAccount;
    to: `0x${string}`;
    value: bigint;
    domain: UsdcDomain;
    nowSeconds?: number;
    validForSeconds?: number;
    nonce?: `0x${string}`;
}): Promise<SignedTransfer> {
    const now = BigInt(args.nowSeconds ?? Math.floor(Date.now() / 1000));
    const validAfter = 0n;
    const validBefore = now + BigInt(args.validForSeconds ?? 3600);
    const nonce = args.nonce ?? (toHex(randomBytes(32)) as `0x${string}`);

    const signature = await args.account.signTypedData({
        domain: args.domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message: {
            from: args.account.address,
            to: args.to,
            value: args.value,
            validAfter,
            validBefore,
            nonce,
        },
    } as any);

    const { r, s, yParity } = parseSignature(signature);
    return {
        from: args.account.address,
        to: args.to,
        value: args.value,
        validAfter,
        validBefore,
        nonce,
        v: 27 + Number(yParity),
        r,
        s,
    };
}
