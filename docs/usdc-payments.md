# USDC payments

Savanna accepts payment in **USDC only**. This page explains how it works, how to set it up, and how to run it day to day.

## How it works

1. A learner clicks **Enrol**. The server creates an order at the price saved in the database.
2. On the checkout page they click **Show payment address**. The server gives that order its **own deposit address** and the exact USDC amount due. Refreshing the page shows the same address again.
3. The learner sends the USDC from any wallet or exchange (or scans the QR code).
4. The server reads the **real USDC balance of that address from the blockchain**, counting only blocks that already have enough confirmations on top of them. When the balance covers the amount due, it confirms the order and enrols the learner. Nothing the browser sends is trusted.
5. A scheduled check does the same for customers who paid and closed the page.
6. You periodically move the collected USDC into your own wallet with the sweep tool.

**Why per-order addresses?** Exchanges can only do plain transfers, so a plain transfer must be enough to identify the order. Each address is derived from a public key (xpub) held by the website. The website can create addresses but **cannot spend** from them. The recovery phrase that controls the money never touches the server.

**Money is never held by a third party.** There is no payment processor in the middle, so there is nothing to be shut down, frozen or delayed by one.

## One-time setup

### 1. Install the new packages and allow big numbers

In the project folder:

```
npm install --save-exact viem@2.57.13 @scure/bip32@2.4.0 @scure/bip39@2.4.0 @noble/curves@2.4.0 qrcode@1.5.4
npm install --save-exact --save-dev @types/qrcode@1.5.6
```

In `tsconfig.json` change `"target": "ES2017"` to `"target": "ES2020"`.

### 2. Create the database tables

Run `supabase/migrations/00009_usdc_payments.sql` in the Supabase SQL Editor.

### 3. Create your wallet (once, on your own computer, ideally offline)

```
npx tsx scripts/usdc-keygen.ts
```

It prints 24 recovery words and an **xpub**.

- Write the 24 words on paper and keep them somewhere safe. Make two copies in different places. **Never** type them into the website, the repo, a chat, or a cloud note. Anyone with them can take all the USDC.
- The xpub goes in the website settings as `USDC_XPUB`. It cannot spend. Still treat it as private.
- Later, to prove your paper backup is correct: `npx tsx scripts/usdc-keygen.ts --verify` and check the same xpub appears.

Also decide your **treasury address**: the wallet you want the money to end up in. A hardware wallet is best. This is not the same as the recovery phrase above.

### 4. Get a blockchain node (RPC) from a provider

The free public Base endpoint is rate-limited and not meant for production. Create a free account with a provider such as Alchemy, QuickNode, Infura, Chainstack or dRPC and create a **Base mainnet** endpoint (and a **Base Sepolia** one for testing). Copy the HTTPS URL. You can put two URLs separated by a comma for automatic backup.

### 5. Settings (environment variables)

Set these in `.env.local` and in your hosting provider. See `.env.example`.

| Name | What it is |
|---|---|
| `USDC_NETWORK` | `testnet` while testing, `mainnet` for real money. The two can never be mixed. |
| `USDC_XPUB` | From step 3. |
| `USDC_CHAINS` | Networks to accept on mainnet. Start with `base`. |
| `RPC_URL_BASE` | From step 4. (`RPC_URL_POLYGON`, `RPC_URL_ARBITRUM`, `RPC_URL_ETHEREUM` if you enable those.) |
| `CRON_SECRET` | Any long random text. Protects the scheduled check. |
| `USD_TO_KES_RATE` | Only if some courses are priced in KES. Shillings per dollar. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already set. |

### 6. Schedule the safety-net check

It finishes orders for people who paid and closed the page. Call this every 5 minutes:

`GET https://YOUR-SITE/api/payments/usdc/check-pending` with header `Authorization: Bearer <CRON_SECRET>`.

- **Vercel Cron**: add `vercel.json` with `{"crons":[{"path":"/api/payments/usdc/check-pending","schedule":"*/5 * * * *"}]}`. Vercel sends the secret header automatically when `CRON_SECRET` is set. Some plans limit how often cron jobs may run, so check yours.
- **GitHub Actions (free)**: create `.github/workflows/usdc-check.yml`, and add repository secrets `CRON_SECRET` and `SITE_URL`:

```yaml
name: Check USDC payments
on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: curl --fail -sS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SITE_URL }}/api/payments/usdc/check-pending"
```

## Test on the test network first (free, no real money)

1. Set `USDC_NETWORK=testnet`. The checkout page shows a TEST MODE banner.
2. Get free test USDC from Circle's faucet (faucet.circle.com), choosing Base Sepolia, and a little Base Sepolia ETH from any faucet for the sender's gas.
3. Enrol in a paid course, show the payment address, send the exact amount from a test wallet.
4. After about 6 seconds of confirmations the page should confirm and unlock the course.
5. Try the awkward cases: send less (the page should say how much is still owed), send the rest, close the page and wait for the scheduled check.
6. Try the sweep with `--execute` on testnet (below), using a relayer wallet holding test ETH.

## Going live checklist

- [ ] Whole flow works on the test network, including a sweep.
- [ ] Recovery phrase written down twice, stored safely, `--verify` run once.
- [ ] Treasury address checked character by character.
- [ ] `USDC_NETWORK=mainnet`, `USDC_CHAINS=base`, your own mainnet `RPC_URL_BASE`.
- [ ] Scheduled check is running (open the URL once with the secret and read the JSON reply).
- [ ] One small real purchase made yourself, then swept.
- [ ] You have taken legal advice (see below).

## Running it day to day

See what has come in:

```sql
select p.created_at, o.total_amount, o.currency, p.amount_units/1e6 as usdc_due,
       p.received_units/1e6 as usdc_received, p.status, p.deposit_address, p.swept_at
from public.payments p join public.orders o on o.id = p.order_id
order by p.created_at desc limit 50;
```

**Moving money to your treasury (sweep).** On your own computer:

1. Run this in the Supabase SQL editor and save the result as `sweep-list.json`:
   ```sql
   select coalesce(json_agg(json_build_object('index', deposit_index, 'address', deposit_address)), '[]'::json)
   from public.payments where provider = 'usdc' and status = 'succeeded' and swept_at is null;
   ```
2. Set `USDC_TREASURY_ADDRESS`, `SWEEP_RELAYER_PRIVATE_KEY` (a small wallet holding a few dollars of ETH on the network, only used to pay fees), and your `RPC_URL_...` on your computer.
3. Preview: `npx tsx scripts/usdc-sweep.ts --list sweep-list.json` (sends nothing).
4. Send: add `--execute`. It asks for your recovery phrase (hidden), proves the phrase owns every listed address, and asks you to confirm the treasury.
5. Run the SQL line it prints to mark those payments as swept.

Only addresses whose payment already **succeeded** are ever listed. Never move funds from an address with an unpaid or part-paid order, or that order can no longer complete.

**Part payments.** The checkout page shows what has arrived and what is still owed. The customer sends the rest to the same address.

**Late payments.** The scheduled check covers the last 14 days. Anything older completes when the customer opens the checkout page again, or you can send them there.

**Wrong network.** The same address works on every compatible network, so USDC sent on Polygon to an order address is still yours. To use it for the order, enable that network (`USDC_CHAINS=base,polygon` and `RPC_URL_POLYGON`) and it is counted automatically.

**Refunds.** Refunds are manual: send USDC back from your treasury, then run
```sql
update public.orders set status = 'refunded' where id = '<order id>';
update public.course_enrolments set status = 'revoked' where order_id = '<order id>';
```

## Security notes

- The website holds the xpub, the service-role key and the RPC key. It never holds anything that can spend USDC.
- If the xpub leaks, nobody can steal from it, but someone could list your addresses. If the xpub leaks AND one individual deposit-address key leaks, every address can be compromised. So never import single deposit-address keys into a wallet app, and keep the xpub private.
- Only real USDC counts: the token contract address on each network is fixed in the code and copied from Circle's official list. Fake or bridged tokens are ignored.
- Confirmations: Base waits about 1 minute (30 blocks), Ethereum 12 blocks, Polygon 128, Arbitrum 120. Higher is safer and slower. The fastest settings are not reorg-proof; for large amounts, wait longer or confirm manually.
- Your relayer wallet is a hot wallet. Keep only a few dollars in it.

## Legal and tax

Kenya's Virtual Asset Service Providers Act, 2025 is in force, and regulations were gazetted in July 2026. Taking USDC as payment for your own courses is different from running a payment service for other people, but the line matters for a firm that is seeking CMA licensing. Please get advice from a Kenyan lawyer about how this should be recorded, how it affects your CMA application, and the tax treatment of receiving and holding USDC. This document is not legal advice.

## Known limits

- Only USDC on EVM networks (Base, Polygon, Arbitrum, Ethereum). Not Solana or Tron.
- Prices are in USD (or KES converted at your fixed rate). A change in USDC's peg is a risk you carry once you hold it.
- No automatic refunds, receipts by email or admin screen for payments yet.
- The sweep tool has been tested for signing and safety checks, but its final on-chain step should be tried on the test network before real money.
