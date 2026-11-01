# The Killzone Journal (Telegram community)

Access rules
- Any student with a confirmed PAID course order: active link, no extra payment.
- Everyone else (free-course students): the card is clickable but locked. Clicking it opens
  the normal checkout for a one-time fee (default $15, USDC/USDT). Once the payment is confirmed
  the pass is stored in `community_access` and the link activates.
- The invite link lives only in the server env var `KILLZONE_TELEGRAM_URL`. It is never in the repo
  or in browser code: the button opens `/api/community/killzone/join`, which checks the pass and redirects.

Setup
1. Run `supabase/migrations/00011_killzone_community.sql` in the Supabase SQL editor.
2. Add to `.env.local` AND your hosting provider's environment variables:
   KILLZONE_TELEGRAM_URL=<your t.me invite link>
   KILLZONE_UNLOCK_PRICE=15        (optional, defaults to 15)
   TELEGRAM_BOT_TOKEN=<from BotFather>   (optional: single-use links)
   TELEGRAM_CHAT_ID=<channel id, starts with -100>
   With the bot variables set, every click creates a fresh one-person link that expires in 24h.
   Without them (or if Telegram errors), the shared KILLZONE_TELEGRAM_URL is used.
   The bot must be an admin of the channel with the "Invite Users via Link" permission.
3. Redeploy.

Comping someone (staff, giveaway) from the SQL editor:
   insert into public.community_access (user_id, source) values ('<profile uuid>', 'manual');
