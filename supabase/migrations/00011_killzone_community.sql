-- ================================================================
-- 00011: The Killzone Journal (private Telegram community)
--   * Paid-course students get access automatically (derived from their confirmed course order)
--   * Everyone else can unlock it with a one-time fee, paid through the normal checkout
-- ================================================================

-- What an order is for. Existing orders are all course orders.
alter table public.orders
  add column if not exists kind text not null default 'course'
  check (kind in ('course', 'community'));

-- Who holds a community pass that is NOT tied to a paid course.
--   unlock_fee = paid the one-time fee (order_id points at the confirmed order)
--   manual     = granted by you from the SQL editor (comps, staff, giveaways)
create table if not exists public.community_access (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  source text not null check (source in ('unlock_fee', 'manual')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.community_access enable row level security;

-- Members can see their own pass. Nobody can write from the browser:
-- passes are created by the server (service role) after a payment is confirmed.
drop policy if exists "Users can view own community access" on public.community_access;
create policy "Users can view own community access"
  on public.community_access for select
  using (auth.uid() = user_id);
