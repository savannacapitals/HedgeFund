/**
 * Creates the wallet seed for USDC deposit addresses. Run this ONCE, on your own computer,
 * ideally offline:   npx tsx scripts/usdc-keygen.ts
 *
 * It prints:
 *   - a 24-word recovery phrase  -> write it on paper and keep it somewhere safe. NEVER put it on the website.
 *   - an "xpub"                  -> this goes in the website's USDC_XPUB setting. It can create addresses but cannot spend.
 *
 * To check a phrase you already saved:   npx tsx scripts/usdc-keygen.ts --verify
 */
import { HDKey } from "@scure/bip32";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { bytesToHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { readHidden } from "./usdc-prompt";

async function main() {
    const verify = process.argv.includes("--verify");
    let mnemonic: string;

    if (verify) {
        mnemonic = (await readHidden("Type your 24-word phrase (nothing will show as you type): ")).trim().toLowerCase();
        if (!validateMnemonic(mnemonic, wordlist)) {
            console.error("\nThat is not a valid recovery phrase.");
            process.exit(1);
        }
    } else {
        mnemonic = generateMnemonic(wordlist, 256);
    }

    const master = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic));
    const account = master.derive("m/44'/60'/0'");
    const addressAt = (i: number) => privateKeyToAddress(bytesToHex(master.derive(`m/44'/60'/0'/0/${i}`).privateKey!));

    console.log("\n==================================================================");
    if (!verify) {
        console.log("YOUR RECOVERY PHRASE (write it on paper, store it safely, tell no one):\n");
        const words = mnemonic.split(" ");
        for (let i = 0; i < words.length; i += 6) console.log("  " + words.slice(i, i + 6).map((w, j) => `${i + j + 1}.${w}`).join("  "));
        console.log("\nAnyone with these words can take all the USDC. It must never be saved on the website, in the repo, or in a chat.");
        console.log("==================================================================");
    }
    console.log("\nPUT THIS IN YOUR WEBSITE SETTINGS as USDC_XPUB (safe: it cannot spend):\n");
    console.log("  " + account.publicExtendedKey);
    console.log("\nSanity check, the first deposit addresses it will produce:");
    for (let i = 0; i < 3; i++) console.log(`  #${i}  ${addressAt(i)}`);
    console.log("\nKeep the xpub private too: do not publish it, and never import single deposit-address keys into a wallet app.\n");
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
