-- ================================================================
-- 00017: Promotions (opening offers, automatic discounts and promo codes)
--
-- Design rules:
--   * The database is the single source of truth for what a discount is worth. The browser never
--     sends a price or a discount; orders are created by create_order_with_promotion(), which
--     re-validates the promotion, applies the cap and creates the order in ONE transaction.
--   * orders.total_amount stays "what the customer must pay". Every payment path (Pochi, bank,
--     USDC/USDT) already reads it, so none of them needed to change.
--   * subtotal_amount, discount_amount and promotion_id are snapshotted on the order, so receipts
--     and the books stay correct even if the promotion is edited or ended later.
--   * promotion_redemptions is a ledger. It is kept in step with the order by a trigger, so it
--     stays correct whichever code path confirms, fails or refunds an order.
--   * Browsers have no access to the promotion tables. Public display goes through the server.
-- ================================================================

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),               -- internal label
  headline text not null check (char_length(headline) between 3 and 90),       -- shown to the public
  description text check (description is null or char_length(description) <= 240),
  code text,                                                                    -- stored upper-case; null for automatic offers
  auto_apply boolean not null default false,                                    -- applies without a code
  show_banner boolean not null default false,                                   -- advertised on the site
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  percent_off integer check (percent_off between 1 and 90),
  amount_off numeric(12, 2) check (amount_off > 0),
  currency text check (currency in ('KES', 'USD')),                             -- fixed discounts only
  scope text not null check (scope in ('all_courses', 'course', 'community')),
  course_id uuid references public.courses(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions > 0),                          -- null = unlimited
  max_per_user integer not null default 1 check (max_per_user > 0),
  is_active boolean not null default true,                                      -- the pause switch
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promotions_discount_shape check (
    (discount_type = 'percent' and percent_off is not null and amount_off is null and currency is null) or
    (discount_type = 'fixed' and amount_off is not null and percent_off is null and currency is not null)
  ),
  constraint promotions_scope_course check ((scope = 'course') = (course_id is not null)),
  constraint promotions_has_trigger check (auto_apply or code is not null),
  constraint promotions_code_format check (code is null or code ~ '^[A-Z0-9-]{5,24}$'),
  constraint promotions_window check (ends_at is null or ends_at > starts_at)
);

create unique index promotions_code_unique on public.promotions (code) where code is not null;
create index promotions_live_idx on public.promotions (is_active, starts_at, ends_at);

-- One row per order that used a promotion
create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  discount_amount numeric(12, 2) not null check (discount_amount > 0),
  status text not null default 'reserved' check (status in ('reserved', 'redeemed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promotion_redemptions_promo_idx on public.promotion_redemptions (promotion_id, status);
create index promotion_redemptions_user_idx on public.promotion_redemptions (user_id, promotion_id);

-- What the order was worth before the discount, what was taken off, and which promotion did it
alter table public.orders
  add column if not exists subtotal_amount numeric(12, 2) check (subtotal_amount is null or subtotal_amount >= 0),
  add column if not exists discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists promotion_code text;

alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

-- No policies on purpose: only the server (service role) can read or write these.
revoke all on public.promotions from anon, authenticated;
revoke all on public.promotion_redemptions from anon, authenticated;

-- ----------------------------------------------------------------
-- What a promotion is worth on a given price (in whole cents, half rounded up).
-- No discount may take more than 90% off, so a paid product never becomes a free order.
-- src/lib/promotions/pricing.ts mirrors this arithmetic for on-screen previews only.
-- ----------------------------------------------------------------
create or replace function public.promotion_discount(
  p_type text,
  p_percent integer,
  p_amount numeric,
  p_promo_currency text,
  p_subtotal numeric,
  p_currency text
) returns numeric
language sql
immutable
as $$
  select case
    when p_type = 'percent' then least(round(p_subtotal * p_percent / 100, 2), round(p_subtotal * 0.9, 2))
    when p_type = 'fixed' and p_promo_currency = p_currency then least(p_amount, round(p_subtotal * 0.9, 2))
    else 0
  end
$$;

-- ----------------------------------------------------------------
-- Gives back reservations on orders that were never paid, so an abandoned checkout does not
-- hold a limited place forever. A reservation is only released when the order is still pending,
-- older than the hold window, and has no payment in flight (a Pochi/bank payment the customer
-- marked as sent, or a live crypto payment). Pass null to sweep every promotion.
-- ----------------------------------------------------------------
create or replace function public.release_stale_promotion_reservations(
  p_promotion_id uuid default null,
  p_hold interval default interval '48 hours'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  released integer := 0;
begin
  for rec in
    select r.order_id
    from public.promotion_redemptions r
    join public.orders o on o.id = r.order_id
    where r.status = 'reserved'
      and o.status = 'pending'
      and r.created_at < now() - p_hold
      and (p_promotion_id is null or r.promotion_id = p_promotion_id)
      and not exists (select 1 from public.manual_payments m where m.order_id = o.id and m.status = 'submitted')
      and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'pending' and p.expires_at > now())
  loop
    -- The trigger below marks the redemption as released
    update public.orders set status = 'failed', updated_at = now() where id = rec.order_id and status = 'pending';
    update public.manual_payments set status = 'expired', updated_at = now() where order_id = rec.order_id and status = 'awaiting';
    update public.payments set status = 'expired', updated_at = now() where order_id = rec.order_id and status = 'pending';
    released := released + 1;
  end loop;
  return released;
end
$$;

-- ----------------------------------------------------------------
-- Creates a discounted order atomically. The promotion row is locked, so two customers cannot
-- both take the last place, and one customer cannot beat their own limit with parallel requests.
-- Raises: promo_unavailable, promo_not_applicable, promo_exhausted, promo_user_limit.
-- ----------------------------------------------------------------
create or replace function public.create_order_with_promotion(
  p_user_id uuid,
  p_kind text,
  p_course_id uuid,
  p_subtotal numeric,
  p_currency text,
  p_promotion_id uuid
) returns table (new_order_id uuid, out_subtotal numeric, out_discount numeric, out_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  promo public.promotions;
  v_discount numeric(12, 2);
  v_used integer;
  v_user_used integer;
  v_order uuid;
begin
  if p_kind not in ('course', 'community') then
    raise exception 'promo_not_applicable';
  end if;
  if p_subtotal is null or p_subtotal <= 0 then
    raise exception 'promo_not_applicable';
  end if;

  select * into promo from public.promotions where id = p_promotion_id for update;
  if not found
     or not promo.is_active
     or promo.starts_at > now()
     or (promo.ends_at is not null and promo.ends_at <= now()) then
    raise exception 'promo_unavailable';
  end if;

  if not (
    (promo.scope = 'all_courses' and p_kind = 'course') or
    (promo.scope = 'course' and p_kind = 'course' and promo.course_id = p_course_id) or
    (promo.scope = 'community' and p_kind = 'community')
  ) then
    raise exception 'promo_not_applicable';
  end if;

  v_discount := public.promotion_discount(promo.discount_type, promo.percent_off, promo.amount_off, promo.currency, p_subtotal, p_currency);
  if v_discount <= 0 then
    raise exception 'promo_not_applicable';
  end if;

  perform public.release_stale_promotion_reservations(promo.id);

  if promo.max_redemptions is not null then
    select count(*) into v_used
    from public.promotion_redemptions
    where promotion_id = promo.id and status in ('reserved', 'redeemed');
    if v_used >= promo.max_redemptions then
      raise exception 'promo_exhausted';
    end if;
  end if;

  select count(*) into v_user_used
  from public.promotion_redemptions
  where promotion_id = promo.id and user_id = p_user_id and status in ('reserved', 'redeemed');
  if v_user_used >= promo.max_per_user then
    raise exception 'promo_user_limit';
  end if;

  insert into public.orders
    (user_id, kind, course_id, subtotal_amount, discount_amount, total_amount, currency, status, promotion_id, promotion_code)
  values
    (p_user_id, p_kind, p_course_id, p_subtotal, v_discount, p_subtotal - v_discount, p_currency, 'pending', promo.id, promo.code)
  returning id into v_order;

  insert into public.promotion_redemptions (promotion_id, order_id, user_id, discount_amount)
  values (promo.id, v_order, p_user_id, v_discount);

  return query select v_order, p_subtotal, v_discount, p_subtotal - v_discount;
end
$$;

-- ----------------------------------------------------------------
-- Keeps the ledger in step with the order, whichever code path changes the order's status:
--   confirmed -> redeemed     failed / refunded -> released (the place and the user's use are freed)
-- ----------------------------------------------------------------
create or replace function public.sync_promotion_redemption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.promotion_redemptions
    set status = case new.status
                   when 'confirmed' then 'redeemed'
                   when 'failed' then 'released'
                   when 'refunded' then 'released'
                   else status
                 end,
        updated_at = now()
    where order_id = new.id
      and status <> case new.status
                      when 'confirmed' then 'redeemed'
                      when 'failed' then 'released'
                      when 'refunded' then 'released'
                      else status
                    end;
  end if;
  return new;
end
$$;

create trigger orders_sync_promotion_redemption
  after update of status on public.orders
  for each row execute function public.sync_promotion_redemption();

-- Only the server (service role) may call these
revoke all on function public.release_stale_promotion_reservations(uuid, interval) from public, anon, authenticated;
revoke all on function public.create_order_with_promotion(uuid, text, uuid, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.release_stale_promotion_reservations(uuid, interval) to service_role;
grant execute on function public.create_order_with_promotion(uuid, text, uuid, numeric, text, uuid) to service_role;
