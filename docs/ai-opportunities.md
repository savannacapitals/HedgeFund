# Savanna AI Opportunities: operating guide

An independent research and guidance division inside the Savanna Capitals site. It lists AI work platforms, explains how to register, and sells two things: a **KES 100 / 30-day membership** and an optional **USD 15 account-assistance** service. It never sells accounts, approvals or jobs.

## 1. First-time setup

1. Run `supabase/migrations/00014_ai_opportunities.sql` in the Supabase SQL editor (or `supabase db push`). It adds two new order kinds, the platform and guide tables, membership, assistance, saved/viewed/progress and announcement tables, and loads the 13 starting platforms.
2. Make sure the existing payment setup is in place (`docs/manual-payments.md`): `POCHI_PHONE`, `POCHI_WEBHOOK_SECRET`, `USD_TO_KES_RATE`, and optionally bank and crypto settings. AI Opportunities reuses that checkout. Optional overrides are in `docs/ai-opportunities.env.example`.
3. Give staff access: editors and administrators can open **Admin → AI Opportunities**. Only administrators can grant or revoke free access. Finance operators and administrators reconcile payments in **Admin → Orders** as before.
4. **Verify the seed data before promoting the platform.** See section 6.

## 2. What was added

| Area | Location |
|---|---|
| Nav tab "AI Opportunities" (desktop, mobile menu, footer) | `src/app/layout.tsx` |
| Landing page | `/ai-opportunities` |
| Directory (search, category / Kenya / status filters) | `/ai-opportunities/platforms` |
| Platform page (10-section guide, members only) | `/ai-opportunities/platforms/[slug]` |
| Membership, assistance request, dashboard | `/ai-opportunities/membership`, `/assistance`, `/dashboard` |
| Terms and privacy (drafts) | `/ai-opportunities/terms`, `/privacy` |
| Admin | `/admin/ai` (tabs: overview, platforms, assistance, memberships, announcements) |
| Config, prices, labels | `src/lib/ai/config.ts` |
| Membership logic | `src/lib/ai/membership.ts`, `src/lib/ai/fulfil.ts` |
| API | `src/app/api/ai/*` (members) and `src/app/api/admin/ai/*` (staff) |
| Daraja integration point (inactive) | `src/lib/payments/daraja/provider.ts` |

Existing code that was changed (small, additive edits): `lib/payments/fulfil.ts` and `manual/settle.ts` (two new order kinds), `api/payments/sandbox-complete`, `checkout/[orderId]/page.tsx` (labels), `api/admin/orders` (shows the new kinds and cancels an unpaid assistance request when its order is marked failed), `lib/auth/roles.ts` (new `ai` section), `AdminNav`, `MobileMenu`, `layout.tsx`, `globals.css` (`.aio-*` styles).

## 3. How payments and access work

- Buying creates an `orders` row with `kind = ai_membership` (KES) or `ai_assistance` (USD). The price is set on the server.
- The customer pays on the existing `/checkout/<orderId>` page by **Pochi la Biashara (M-Pesa)**, bank transfer, or USDC/USDT. Pochi payments confirm automatically when the matching M-Pesa SMS reaches `/api/webhooks/pochi` and the amount covers the price. Bank payments are confirmed by finance in **Admin → Orders**.
- Only `completeOrder()` activates anything, and it runs only after a verified payment or an audited admin confirmation. Nothing is activated from the browser. The "simulate payment" button exists only outside production, as it does for courses.
- **Membership**: a confirmed order adds a 30-day period (`ai_membership_periods`, keyed by order, so it cannot be applied twice). Renewing early starts the new period when the current one ends. Access = a period that has not ended whose order is still `confirmed`, so refunding the order ends access automatically.
- **Assistance**: the request starts as *Payment Pending* and moves to *Request Received* when its order is confirmed. Staff cannot move it past that until the payment is confirmed.
- **Daraja / STK Push** is not active. `provider.ts` documents the integration point and the rules (confirm only from a verified Safaricom callback; check amount; keep secrets server-side).

## 4. Access control and data protection

- `/ai-opportunities/dashboard` and every member API check the signed-in user on the server. Guide content lives in `ai_platform_guides`, which the browser cannot query at all; it is read on the server only after a membership check.
- `/admin/ai` and `/api/admin/ai/*` require the `ai` section roles (editor, administrator). Free grants require administrator. Changes are written to the audit log.
- Assistance requests (including internal notes), memberships, saved/viewed/progress have no browser access (RLS enabled, privileges revoked). The server returns a safe view to the customer.
- The assistance form blocks messages that look like they contain passwords, OTPs, PINs or card numbers, and nothing like that is stored.

## 5. Daily operation

- **Add or edit a platform**: Admin → AI Opportunities → Platforms. Leave unknown fields empty; members see "Not independently verified". Use `Label | https://link` per line for resources and sources.
- **Rules the system enforces**: *Verified* needs a last-verified date and at least one source link. *Restricted* needs restriction notes. Do not suggest VPNs, false identities or location changes anywhere.
- **Keep the four conditions separate** on each guide: accepting registrations, accepts Kenyan applicants, projects available now, pays in Kenya.
- **Handle an assistance request**: confirm the payment (Orders) if it is bank transfer, open the request, set the status, and write a message the customer sees. Use the internal note for staff-only detail. Never ask for or record credentials.
- **Free access** (staff, goodwill after a refund): Memberships → Grant free access. A reason is required.
- **Announcements** appear on members' dashboards.
- **Refunds**: Orders → Refund. A refunded membership stops granting access immediately. Money is returned manually, as for course orders.

## 6. Research status: please read

The 13 platforms are **research targets**. They were seeded as **Under Review** with Kenya eligibility **unknown** and no last-verified date, except OpenTrain AI, whose official documentation was read on 2 Nov 2026 (its Kenya payout availability is still unconfirmed, so it is *Conditional*).

- **Loggy3** has no website recorded because no official site could be confirmed.
- The other website addresses came from general knowledge and were **not** re-checked against each company's own site. Open each one, confirm it is the right company, and correct it if not.
- Descriptions and categories are brief and preliminary.
- No earnings, countries, payment methods or requirements were invented. Fill these in only from official pages, add the source links, then raise the status.
- No logos are bundled or fetched from third-party sites. Cards show a monogram until you paste a logo address you have the right to use.

## 7. Known limits

- The Terms and Privacy pages are plain-language drafts and need review by a Kenyan lawyer (including the Data Protection Act, 2019).
- Membership does not auto-renew; the member chooses to renew.
- The sign-in page has no "return to where you were" option, so members land on the normal login destination after signing in.

## 8. Testing checklist (staging)

1. Run the migration; open `/ai-opportunities` (platforms listed, filters work, no console errors).
2. Signed out: platform pages show the lock card; `/ai-opportunities/dashboard` redirects to login; `/admin/ai` redirects.
3. Sign up, click *Become a Member*, pay a small test via Pochi (SMS forwarder on) or confirm in Orders; the dashboard shows an expiry 30 days out and guides unlock.
4. Renew: expiry moves 30 days past the previous end date.
5. Refund the order in Orders: guides lock again.
6. Request assistance: it shows *Payment Pending*, pay, it becomes *Request Received*; staff update it and the customer sees the message.
7. Save a platform and set progress; check Recently viewed.
8. As an editor: edit a platform and publish an announcement. As a non-staff user: confirm `/api/admin/ai/platforms` returns 403.
