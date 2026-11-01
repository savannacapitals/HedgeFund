/**
 * Moves paid USDC from the per-order deposit addresses into your own treasury wallet.
 * Run on YOUR computer (never on the website server):
 *
 *   1. In the Supabase SQL editor, list what is ready to move and save the result as sweep-list.json:
 *        select coalesce(json_agg(json_build_object('index', deposit_index, 'address', deposit_address)), '[]'::json)
 *        from public.payments where provider = 'usdc' and status = 'succeeded' and swept_at is null;
 *   2. Check the plan (nothing is sent):   npx tsx scripts/usdc-sweep.ts --list sweep-list.json
 *   3. Send it for real:                   npx tsx scripts/usdc-sweep.ts --list sweep-list.json --execute
 *
 * Settings (environment variables on your computer):
 *   USDC_TREASURY_ADDRESS      where the money goes (your own wallet, ideally a hardware wallet)
 *   SWEEP_RELAYER_PRIVATE_KEY  a small "gas" wallet holding a little ETH on the network; it only pays fees
 *   USDC_NETWORK, USDC_CHAINS, RPC_URL_BASE ...   same as the website
 *
 * Only addresses whose payment already SUCCEEDED are listed, so a customer who is still part-way
 * through paying never has their deposit moved.
 */
import fs from "fs";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { createPublicClient, createWalletClient, fallback, getAddress, http, bytesToHex, isAddress, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getEnabledChains } from "../src/lib/payments/usdc/chains";
import { readHidden, ask } from "./usdc-prompt";
import { expectedDomainSeparator, signTransferToTreasury, usdcSweepAbi } from "./usdc-sweep-lib";

async function main() {
    const args = process.argv.slice(2);
    const listPath = args[args.indexOf("--list") + 1];
    const execute = args.includes("--execute");
    if (!args.includes("--list") || !listPath) throw new Error("Usage: npx tsx scripts/usdc-sweep.ts --list sweep-list.json [--execute]");

    const treasuryRaw = process.env.USDC_TREASURY_ADDRESS || "";
    if (!isAddress(treasuryRaw)) throw new Error("Set USDC_TREASURY_ADDRESS to your own wallet address.");
    const treasury = getAddress(treasuryRaw);

    const entries: { index: number; address: string }[] = JSON.parse(fs.readFileSync(listPath, "utf8"));
    if (!Array.isArray(entries) || entries.length === 0) {
        console.log("Nothing to sweep.");
        return;
    }
    if (entries.some((e) => getAddress(e.address) === treasury)) throw new Error("The treasury must not be one of the deposit addresses.");

    const chains = getEnabledChains();
    if (chains.length === 0) throw new Error("No network configured (check USDC_NETWORK, USDC_CHAINS and RPC_URL_...).");

    const mnemonic = (await readHidden("Type your 24-word recovery phrase (nothing will show): ")).trim().toLowerCase();
    if (!validateMnemonic(mnemonic, wordlist)) throw new Error("That is not a valid recovery phrase.");
    const master = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic));

    // Prove this phrase really owns every listed address BEFORE doing anything else
    const accounts = entries.map((e) => {
        const key = master.derive(`m/44'/60'/0'/0/${e.index}`).privateKey!;
        const account = privateKeyToAccount(bytesToHex(key));
        if (account.address !== getAddress(e.address)) {
            throw new Error(`Deposit #${e.index}: this phrase does not match the address ${e.address}. Wrong phrase or wrong list. Nothing was sent.`);
        }
        return { index: e.index, account };
    });
    console.log(`Phrase matches all ${accounts.length} listed addresses.`);

    let relayer: ReturnType<typeof privateKeyToAccount> | null = null;
    if (execute) {
        const pk = process.env.SWEEP_RELAYER_PRIVATE_KEY;
        if (!pk) throw new Error("Set SWEEP_RELAYER_PRIVATE_KEY (a small gas wallet) to use --execute.");
        relayer = privateKeyToAccount(pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
    }

    const plan: { chain: (typeof chains)[number]; index: number; account: (typeof accounts)[number]["account"]; balance: bigint }[] = [];
    const domains = new Map<string, { name: string; version: string }>();

    for (const chain of chains) {
        const transports = chain.rpcUrls.map((u) => http(u));
        const client = createPublicClient({ transport: transports.length > 1 ? fallback(transports) : transports[0] });
        const read = (fn: string, a: any[] = []) => client.readContract({ address: chain.usdc, abi: usdcSweepAbi, functionName: fn, args: a } as any);

        // The token must describe itself exactly as expected, or we refuse to sign anything for it
        const name = (await read("name")) as string;
        const version = (await read("version")) as string;
        const onChainSeparator = (await read("DOMAIN_SEPARATOR")) as string;
        const ours = expectedDomainSeparator({ name, version, chainId: chain.chainId, verifyingContract: chain.usdc });
        if (ours.toLowerCase() !== onChainSeparator.toLowerCase()) {
            throw new Error(`${chain.name}: signing domain does not match the token contract. Stopping for safety.`);
        }
        domains.set(chain.id, { name, version });

        for (const a of accounts) {
            const balance = (await read("balanceOf", [a.account.address])) as bigint;
            if (balance > 0n) plan.push({ chain, index: a.index, account: a.account, balance });
        }
    }

    if (plan.length === 0) {
        console.log("No USDC found at the listed addresses. Nothing to do.");
        return;
    }

    console.log(`\nPlan: move to ${treasury}`);
    for (const p of plan) console.log(`  ${p.chain.name.padEnd(28)} deposit #${p.index}  ${formatUnits(p.balance, 6)} USDC`);
    const total = plan.reduce((s, p) => s + p.balance, 0n);
    console.log(`  Total: ${formatUnits(total, 6)} USDC`);

    if (!execute) {
        console.log("\nDry run only. Add --execute to send.");
        return;
    }

    const confirm = await ask(`\nType the LAST 6 characters of your treasury address (${treasury.slice(-6)}) to confirm: `);
    if (confirm.trim().toLowerCase() !== treasury.slice(-6).toLowerCase()) throw new Error("Not confirmed. Nothing was sent.");

    const swept = new Set<number>();
    for (const p of plan) {
        const transports = p.chain.rpcUrls.map((u) => http(u));
        const transport = transports.length > 1 ? fallback(transports) : transports[0];
        const publicClient = createPublicClient({ transport });
        const wallet = createWalletClient({ account: relayer!, transport });
        const dom = domains.get(p.chain.id)!;

        const signed = await signTransferToTreasury({
            account: p.account,
            to: treasury,
            value: p.balance,
            domain: { ...dom, chainId: p.chain.chainId, verifyingContract: p.chain.usdc },
        });

        const request = {
            address: p.chain.usdc,
            abi: usdcSweepAbi,
            functionName: "transferWithAuthorization",
            args: [signed.from, signed.to, signed.value, signed.validAfter, signed.validBefore, signed.nonce, signed.v, signed.r, signed.s],
            account: relayer!,
            chain: undefined,
        } as any;

        await publicClient.simulateContract(request); // fails here, before any gas is spent, if something is wrong
        const hash = await wallet.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`  ${receipt.status === "success" ? "OK  " : "FAIL"} ${p.chain.name} deposit #${p.index}  ${hash}`);
        if (receipt.status === "success") swept.add(p.index);
    }

    if (swept.size > 0) {
        console.log("\nNow run this in the Supabase SQL editor so these are not listed again:\n");
        console.log(`  update public.payments set swept_at = now() where deposit_index in (${[...swept].join(", ")});`);
    }
}

main().catch((e) => {
    console.error("\nStopped:", e.message);
    process.exit(1);
});
