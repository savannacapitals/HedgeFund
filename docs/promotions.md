# Promotions: opening offers, automatic discounts and promo codes

Staff create offers on `/admin/promotions`. Offers show on the home page, `/pricing` and the Academy as a banner, change the price on course cards and course pages, and are applied to the order when the customer enrols. Every payment method (Pochi, bank transfer, USDC/USDT) charges the discounted amount without any change to those payment flows, because they all read `orders.total_amount`.

## One-time setup

1. Run `supabase/migrations/00017_promotions.sql` in the Supabase SQL Editor.
2. Deploy. Nothing else is needed: no new environment variables.
3. Sign in as an administrator or finance operator, open **Promotions** and create an offer.

If the migration has not been run yet, the site still works: the banner simply does not appear.

## Two kinds of offer

| | Applies | Typical use |
|---|---|---|
| **Automatic** | To every eligible customer, with no code. Prices on the catalogue and course page already show the discount. | Opening offer, launch week |
| **Promo code** | Only when the customer types the code on the course page. | Campus codes, influencer codes, win-back emails |

An offer can be advertised on the website banner (code offers show the code with a copy button) or kept private (a campus code you only hand out yourself).

**Rules:** one offer per order, the largest wins and offers never stack. No discount can take more than 90% off, so a paid product never becomes a free order. Percentages are whole numbers. Fixed amounts apply only to products priced in the same currency (a KES offer does nothing on a USD course). Orders for AI Opportunities are not covered.

## How it stays correct

- **The browser never sends a price or a discount.** The server reads the product price from the database and works out the discount. The course page asks `/api/promotions/quote` and shows that answer.
- **A discounted order is created by one database function** (`create_order_with_promotion`). It locks the promotion, re-checks dates, scope, the cap and the per-customer limit, then writes the order and its redemption together. Eight people racing for three places get exactly three.
- **The order keeps a snapshot:** `subtotal_amount`, `discount_amount`, `promotion_id`, `promotion_code`. Ending or changing an offer later does not alter past orders. Checkout and `/admin/orders` show the discount line.
- **The redemption ledger follows the order automatically** (database trigger): confirmed becomes *redeemed*; failed or refunded becomes *released*, freeing the place. This works whichever code path changes the order (SMS webhook, admin confirm, blockchain scan).
- **Abandoned checkouts do not hold places forever.** A reserved place on an order that is still unpaid after **48 hours** is given back and the order is closed, unless a payment is in flight (a Pochi/bank payment the customer marked as sent, or a live crypto payment). This runs whenever the offer is next used and whenever the admin page loads.
- **A customer who already has an open order with the offer keeps that price** while they pay, and gets the same order back if they click Enrol again.
- **Editing is limited on purpose.** What a discount is worth cannot be edited after creation. End the offer and create a new one. You can pause, resume, end, change the number of places, and move the end date.
- Every create, pause, resume, end and update is written to the audit log.

## Creating the opening offer (example)

- Name: `Academy opening offer, Nov 2026`
- Headline: `Founding students save 30% on every course`
- How it applies: **Automatically**
- Discount: **Percentage off**, 30
- Applies to: **All paid courses**
- Ends: pick a date. A deadline keeps the countdown honest.
- Number of places: for example 50, so the banner shows "N places left"
- Advertise on the website banner: on

For a campus code: choose **With a promo code**, enter e.g. `MKU-STUDENT`, untick the banner, set uses per customer to 1.

## Known limits and sensible next steps

- Promo codes are not rate-limited. A guessable short code with a big discount can be brute-forced. Use unguessable codes for large discounts. Adding per-account attempt limiting to `/api/promotions/quote` is the natural next step.
- Abandoned-checkout release runs on use, not on a timer. To run it on a schedule as well, enable `pg_cron` in Supabase and schedule `select public.release_stale_promotion_reservations(null);` hourly.
- Extending offers to AI Opportunities membership means adding a scope and calling `openPurchaseOrder` from `openMembershipOrder`.
