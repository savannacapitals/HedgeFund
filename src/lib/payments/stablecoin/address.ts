import { getAddress, isAddress } from "viem";
import { base58, base32nopad, createBase58check } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";

/** Each check returns the cleaned-up address, or null if it is not valid. A typo can never slip through. */

/** Ethereum-style (0x...). Mixed-case addresses carry a checksum that must be right. */
export function parseEvmAddress(input: string): string | null {
    const value = (input || "").trim();
    if (!isAddress(value, { strict: false })) return null;
    // Mixed case means the sender included a checksum: it must match exactly
    const hasMixedCase = value !== value.toLowerCase() && value !== value.toUpperCase().replace("0X", "0x");
    if (hasMixedCase && !isAddress(value, { strict: true })) return null;
    return getAddress(value);
}

/** Tron: base58 with a built-in checksum, 21 bytes starting with 0x41 */
export function parseTronAddress(input: string): string | null {
    const value = (input || "").trim();
    try {
        const raw = createBase58check(sha256).decode(value);
        return raw.length === 21 && raw[0] === 0x41 ? value : null;
    } catch {
        return null;
    }
}

/** Solana: base58, exactly 32 bytes */
export function parseSolanaAddress(input: string): string | null {
    const value = (input || "").trim();
    try {
        return base58.decode(value).length === 32 ? value : null;
    } catch {
        return null;
    }
}

// ---- Stellar -------------------------------------------------------------

const STELLAR_G = 6 << 3; // ordinary account, starts with G
const STELLAR_M = 12 << 3; // "muxed" account: an account plus a payment ID, starts with M

function crc16xmodem(bytes: Uint8Array): number {
    let crc = 0;
    for (const b of bytes) {
        crc ^= b << 8;
        for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc;
}

function decodeStrkey(text: string): { version: number; payload: Uint8Array } {
    const raw = base32nopad.decode(text);
    const data = raw.slice(0, raw.length - 2);
    const checksum = raw[raw.length - 2] | (raw[raw.length - 1] << 8);
    if (crc16xmodem(data) !== checksum) throw new Error("bad checksum");
    return { version: data[0], payload: data.slice(1) };
}

function encodeStrkey(version: number, payload: Uint8Array): string {
    const data = new Uint8Array([version, ...payload]);
    const crc = crc16xmodem(data);
    return base32nopad.encode(new Uint8Array([...data, crc & 0xff, crc >> 8]));
}

export interface StellarDestination {
    /** What customers are told to pay to (the M... address) */
    address: string;
    /** The underlying ordinary account (G...) whose payments we watch */
    account: string;
    /** The payment ID inside the M... address */
    muxedId: string;
}

/** Accepts the M... deposit address and works out the account and payment ID inside it */
export function parseStellarMuxedAddress(input: string): StellarDestination | null {
    const value = (input || "").trim();
    try {
        const { version, payload } = decodeStrkey(value);
        if (version !== STELLAR_M || payload.length !== 40) return null;
        const key = payload.slice(0, 32);
        const id = new DataView(payload.buffer, payload.byteOffset + 32, 8).getBigUint64(0, false);
        return { address: value, account: encodeStrkey(STELLAR_G, key), muxedId: id.toString() };
    } catch {
        return null;
    }
}
