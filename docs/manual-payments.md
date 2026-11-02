# Pochi la Biashara and bank-transfer payments

Added next to the existing USDC/USDT checkout. Customers now choose between **Pochi la Biashara**, **Bank transfer** and **USDC / USDT** on `/checkout/[orderId]`.

## Why it works this way (research summary)

- **Pochi la Biashara has no collection API.** Safaricom's Daraja portal offers STK Push and C2B only for Paybill and Till numbers. For Pochi, the only API is *Business to Pochi*, which **sends money out** to a Pochi wallet (useful later for refunds, not for taking payment). Customers pay a Pochi number themselves, from the M-Pesa app or `*334#`.
- So checkout cannot "push" a prompt to the customer's phone. Instead the customer pays, then gives us the **M-Pesa code** from their confirmation SMS.
- To avoid confirming every payment by hand, the phone that owns the Pochi number **forwards the incoming M-Pesa SMS** to `/api/webhooks/pochi`. When the code the customer typed matches a forwarded SMS and the amount covers the price, the order is confirmed and access unlocks within seconds.
- Bank transfers have no automatic signal, so an admin confirms them on `/admin/orders` after seeing the money in the account.
- M-Pesa limits still apply to Pochi: KSh 250,000 per transaction and KSh 500,000 per day (per Safaricom's Pochi FAQ). Larger orders are steered to bank transfer.

## How a Pochi payment flows

1. Customer picks **Pochi la Biashara** → **Show payment details**. The server saves a `manual_payments` row with the exact shilling amount (USD prices are converted with `USD_TO_KES_RATE` and rounded **up** to a whole shilling).
2. Customer pays `0700 021 380` and types the 10-character M-Pesa code (e.g. `SGL4ABC12D`) → **I have paid**.
3. The server checks whether the forwarded SMS for that code is already saved. If yes, and the SMS amount is at least the price, the order is confirmed immediately. If not, the payment stays `submitted` and the page keeps checking. When the SMS arrives later, the webhook confirms it.
4. If nothing matches (SMS forwarder offline, underpayment, typo), the order appears on `/admin/orders` with the code the customer typed, and you can **Confirm** it by hand.

Safety rules built in: one SMS can pay for only one order (atomic claim); one code can back only one payment; amounts always come from the saved order, never from the browser; underpayments are never auto-confirmed; the webhook needs a secret.

## Bank transfer flow

1. Customer picks **Bank transfer** → sees your bank details, the exact amount and a reference like `SC-1A2B3C4D` to put in the narration.
2. After transferring they enter the bank's transaction reference (and optionally the sender name).
3. The order shows on `/admin/orders` as `submitted · Bank transfer · … · ref …`. Check your statement, then **Confirm**.

Bank details are **not hard-coded**: they come from the `BANK_*` environment variables, and the Bank tab only appears once name, account name and account number are set.

## One-time setup

1. **Database.** Run `supabase/migrations/00013_manual_payments.sql` in the Supabase SQL Editor.
2. **Environment variables.** Add the variables from `docs/manual-payments.env.example` in Vercel (Production and Preview), then redeploy. At minimum: `POCHI_PHONE`, `POCHI_WEBHOOK_SECRET`, `USD_TO_KES_RATE` (and the `BANK_*` set for bank transfer).
3. **SMS forwarding.** On the Android phone with the SIM that owns `0700021380`, install an SMS-forwarder app that can POST incoming SMS to a URL, and set:
   - URL: `https://<your-domain>/api/webhooks/pochi`
   - Method: `POST`, content type JSON
   - Header: `x-webhook-secret: <POCHI_WEBHOOK_SECRET>` (if the app cannot set headers, add `?secret=<POCHI_WEBHOOK_SECRET>` to the URL instead)
   - Body: `{"from": "<sender>", "message": "<message text>"}` using the app's own placeholders
   - Filter: only SMS from `MPESA`
   Keep the phone on, charged, with data and with battery optimisation switched off for the forwarder app.
4. **Test with a real payment of KSh 10** before launch. The SMS reader (`src/lib/payments/manual/sms.ts`) matches the wording "Confirmed. You have received Ksh…" loosely, but Safaricom changes wording from time to time. If a real Pochi SMS is not recognised, the webhook answers `ignored: not_a_payment` and the payment simply falls back to manual confirmation on `/admin/orders`. Send me the SMS text (hide the name) and the parser can be adjusted.

## Day to day

- `/admin/orders` → filter **pending**. Rows for Pochi/bank show method, amount, the code or reference the customer typed and your order reference.
- **Confirm** only after you have seen the money in Pochi or the bank account. **Fail** closes the order and the open payment.
- Every forwarded SMS is kept in `pochi_messages` (unclaimed ones are payments nobody has claimed yet, handy for reconciliation). Each stores the SMS text, which includes the payer's name: keep Supabase access tight.

## Security notes

- The webhook secret is the only thing protecting auto-confirmation. Use a long random value and rotate it if the forwarder phone is lost.
- Anyone who learns another customer's valid, unclaimed M-Pesa code could try to submit it for their own order of equal or lower value. Risk is small (codes are not public), and both amounts and one-code-one-order are enforced. Keep the Pochi phone's SMS private.
- Orders in currencies other than KES/USD are rejected, as with the crypto checkout.

## Files

New: `supabase/migrations/00013_manual_payments.sql`, `src/lib/payments/manual/*`, `src/app/api/payments/manual/*`, `src/app/api/webhooks/pochi/route.ts`, `src/components/ManualPayPanel.tsx`.
Changed: `src/app/checkout/[orderId]/page.tsx` (method tabs), `src/app/api/admin/orders/route.ts` and `src/app/admin/orders/page.tsx` (show and settle Pochi/bank payments).
