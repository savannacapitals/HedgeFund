# Stablecoin payments (USDC and USDT)

Savanna accepts **USDC and USDT** on several networks. The money goes straight to your own deposit addresses (your Kraken account). There is no payment processor in between.

## How it works

1. A learner clicks **Enrol**. The server creates an order at the price saved in the database.
2. On the checkout page they click **Show payment details**. The server gives the order an **exact amount**: the price plus a few extra millionths (always under one US cent). For a $40 course the learner might be asked for `40.003217`. No other open order has the same amount.
3. The learner picks a coin (USDC or USDT) and a network, and sends **exactly** that amount to the address shown, from any wallet or exchange.
4. The server reads **real incoming transfers from the blockchains** and saves every one it sees. When a confirmed transfer of an official token to your address has exactly an open order's amount, the order is confirmed and the learner is enrolled. Nothing the browser sends is trusted.
5. A scheduled check does the same for people who paid and closed the page.

**Why unique amounts?** Your addresses are shared by everyone, so the amount is what tells orders apart. A transfer can only pay an order if the amount matches exactly, it happened after the order was created, and it has not already paid something else. An old transfer can never be replayed.

**What happens to money that does not match?** It is still saved (table `chain_transfers`) so nothing is lost. You can see it and sort it out by hand (see Day to day).

## What is accepted

| Network | USDC | USDT | Notes |
|---|---|---|---|
| Ethereum | yes | yes | needs a node URL |
| Tron | **no** | yes | Circle stopped supporting USDC on Tron in 2024, so it is not offered |
| Solana | yes | yes | works with the free public node, a keyed one is more reliable |
| Arbitrum One | no | yes (USDT0) | needs a node URL |
| Polygon | no | yes | needs a node URL |
| Ink | yes | yes (USDT0) | needs a node URL |
| Plasma | no | yes (USDT0) | needs a node URL |
| Conflux eSpace | no | yes (USDT0) | needs a node URL |
| Stellar | yes | no | uses an M... address; many wallets cannot pay these |

Every token contract address was copied from the issuer's official list (Circle for USDC, Tether and the USDT0 site for USDT). Look-alike and bridged tokens (for example USDC.e) are ignored.

## One-time setup

### 1. Update the project

```
npm uninstall @scure/bip32 @scure/bip39 @noble/curves
npm install --save-exact viem@2.57.13 @scure/base@2.4.0 @noble/hashes@2.4.0 qrcode@1.5.4
npm install --save-exact --save-dev @types/qrcode@1.5.6
```

In `tsconfig.json` make sure `"target"` is `"ES2020"`.

If you set up the earlier per-order-address version, delete these (they are replaced):
`src/lib/payments/usdc/`, `src/app/api/payments/usdc/`, `scripts/usdc-keygen.ts`, `scripts/usdc-prompt.ts`, `scripts/usdc-sweep.ts`, `scripts/usdc-sweep-lib.ts`, `docs/usdc-payments.md`, `supabase/migrations/00009_usdc_payments.sql`.
You can also delete the old unused mock files `src/lib/payments/adapter.ts`, `src/app/api/payments/checkout/route.ts` and `src/app/api/webhooks/payments/route.ts`.

### 2. Create the database tables

Run `supabase/migrations/00010_stablecoin_payments.sql` in the Supabase SQL Editor. (It also removes tables from the earlier draft, if you had run it. Nothing real was stored in them.)

### 3. Settings

Copy `.env.example` and fill in the values in `.env.local` and in your hosting settings. The deposit addresses are already filled in. Checked once more: the Ethereum, Tron and Stellar addresses carry checksums and are valid. **Solana addresses have no checksum**, so copy it exactly and check the checkout page shows the same text.

- **Start with `PAY_NETWORKS=tron,solana`.** They work without a node account. Add `ethereum, arbitrum, polygon` once you have a node provider URL, and `ink, plasma, conflux, stellar` only after a successful small test on each.
- A mistyped address switches that network off instead of showing a wrong address.

### 4. Schedule the safety-net check

Every 5 minutes: `GET https://YOUR-SITE/api/payments/stablecoin/check-pending` with header `Authorization: Bearer <CRON_SECRET>`.

- **Vercel Cron**: `vercel.json` containing `{"crons":[{"path":"/api/payments/stablecoin/check-pending","schedule":"*/5 * * * *"}]}`. Some plans limit how often cron jobs may run.
- **GitHub Actions (free)**: `.github/workflows/payments-check.yml`, with repository secrets `CRON_SECRET` and `SITE_URL`:

```yaml
name: Check stablecoin payments
on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: curl --fail -sS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SITE_URL }}/api/payments/stablecoin/check-pending"
```

## Test before real customers

These are real networks, so test with small real amounts.

1. In the admin screen create a course priced at **$1.00** and publish it (one lesson is enough).
2. For **each network you switched on**: enrol, pay the exact amount shown from your own wallet or exchange, and confirm the course unlocks. Use the coin (USDC/USDT) you intend to offer.
3. Check the money arrived in Kraken, and note any **minimum deposit** Kraken enforces for that network.
4. Try the awkward cases: send a slightly different amount (it must NOT unlock, and must show up in `chain_transfers`), close the page right after paying (the scheduled check should finish it).
5. Delete or unpublish the test course.

## Day to day

See recent payments:

```sql
select p.created_at, o.total_amount, o.currency, p.amount_units/1e6 as amount, p.status, p.paid_network, p.paid_token
from public.payments p join public.orders o on o.id = p.order_id
order by p.created_at desc limit 50;
```

See money that arrived but matched no order (wrong amount, late, or not for us):

```sql
select occurred_at, network, token, amount_units/1e6 as amount, from_address, txid
from public.chain_transfers where payment_id is null order by occurred_at desc limit 50;
```

Check the scanners are healthy (an error here means a node or API problem):

```sql
select network, last_scan_at, last_error from public.scan_cursors order by network;
```

**A customer paid the wrong amount.** Find their transfer above, confirm the transaction ID and amount with them, then attach it to their payment:

```sql
-- 1. their open or expired payment
select id, order_id, amount_units/1e6 as due, status from public.payments where order_id = '<order id>';
-- 2. after you have checked everything:
update public.payments set status = 'succeeded', matched_transfer_id = '<transfer id>', paid_network = '<network>', paid_token = '<token>', paid_at = now() where id = '<payment id>';
update public.chain_transfers set payment_id = '<payment id>' where id = '<transfer id>';
```

The next scheduled check finishes the order and enrols the learner.

**A customer paid after the payment expired (7 days).** Same as above.

**Refunds are manual.** Send the money back from Kraken, then:

```sql
update public.orders set status = 'refunded' where id = '<order id>';
update public.course_enrolments set status = 'revoked' where order_id = '<order id>';
```

## Things to know about using Kraken

- **Use an account in the company's name.** Customer money for a company's courses should land in a company (business) account, not a personal one, for bookkeeping, tax and your CMA licensing. Check Kraken's terms for receiving third-party payments.
- **Check which tokens each deposit address accepts**, and the **minimum deposit** per network. Money sent in an unsupported token or below the minimum may not be credited. Keep course prices comfortably above those minimums.
- **Deposit addresses can change.** If Kraken ever issues a new address, update the setting. Do not change addresses while orders are open.
- Kraken credits deposits on its own schedule. This site unlocks the course when the transfer is confirmed on the network, which is usually sooner.
- Keep Kraken's deposit history and your `chain_transfers` table together for accounting.

## How long it takes

A payment unlocks after the network confirms it. These are conservative starting points and you can change them in `networks.ts`:

| Network | Wait before unlocking |
|---|---|
| Ethereum | 12 blocks (about 2.5 minutes) |
| Tron | until the network marks it confirmed (about a minute) |
| Solana | until finalized (about 15 seconds) |
| Arbitrum | 240 blocks (about 1 minute) |
| Polygon | 128 blocks (about 4 minutes) |
| Ink, Plasma, Conflux | 30 to 60 blocks (about 30 to 60 seconds) |
| Stellar | immediately final |

## Limits

- The customer must send the **exact** amount, all six decimals. Exchanges that deduct their withdrawal fee from the amount cause mismatches, which you then match by hand.
- A payment is open for 7 days.
- Stellar M... addresses are not supported by every wallet. Offer other networks as well.
- Only the Ethereum-style networks listed are watched. USDC sent on an unlisted network to the same 0x address will not unlock an order (it will not be lost either, but you would have to recover it yourself).
- If your node provider is down, payments are delayed, not lost: scanning picks up where it stopped.
- There are no automatic refunds, receipts by email or payments screen in the admin area yet.

## Legal and tax

Kenya's Virtual Asset Service Providers Act, 2025 is in force, and regulations were gazetted in July 2026. Taking stablecoins as payment for your own courses is different from running a payment service for other people, but the line matters for a firm seeking CMA licensing. Please get advice from a Kenyan lawyer on how to record these receipts, how they affect your CMA application, and their tax treatment. This document is not legal advice.
