import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak256, getAddress, bytesToHex } from "viem";

/**
 * Deposit addresses come from an "extended public key" (xpub) for the account path m/44'/60'/0'.
 * The server only ever holds the xpub: it can work out addresses but can NOT spend from them.
 * The private keys live in the seed phrase you generated offline (scripts/usdc-keygen.ts).
 *
 * Address for deposit number N = account xpub / 0 / N  (the standard BIP-44 "external" branch).
 */
export function deriveDepositAddress(xpub: string, index: number): string {
    if (!Number.isInteger(index) || index < 0 || index >= 2 ** 31) {
        throw new Error("Invalid deposit index.");
    }

    const account = HDKey.fromExtendedKey(xpub);
    if (account.privateKey) {
        // Refuse an xpriv: a private key must never be placed in the website's environment
        throw new Error("USDC_XPUB must be a PUBLIC extended key (xpub...), not a private one.");
    }

    const child = account.deriveChild(0).deriveChild(index);
    if (!child.publicKey) throw new Error("Could not derive the deposit key.");

    // Ethereum addresses are the last 20 bytes of keccak256 of the UNCOMPRESSED public key (without the 0x04 prefix)
    const uncompressed = secp256k1.Point.fromBytes(child.publicKey).toBytes(false);
    const hash = keccak256(bytesToHex(uncompressed.slice(1)));
    return getAddress(`0x${hash.slice(-40)}`);
}
