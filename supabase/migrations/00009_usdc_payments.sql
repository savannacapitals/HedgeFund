-- ================================================================
-- 00009: USDC payments
-- Every order gets its own deposit address. One row per payment.
-- Written and read by the server only (browsers have no access).
-- ================================================================

-- Numbers used to derive deposit addresses. Never reused, never reset.
create sequence if not exists public.usdc_deposit_index_seq start with 0 minvalue 0;

create or replace function public.next_usdc_deposit_index()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.usdc_deposit_index_seq')
$$;

revoke all on function public.next_usdc_deposit_index() from public, anon, authenticated;
grant execute on function public.next_usdc_deposit_index() to service_role;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'usdc',
  deposit_index bigint not null unique,
  deposit_address text not null unique,
  amount_units bigint not null check (amount_units > 0),       -- USDC due, in millionths (1 USDC = 1000000)
  received_units bigint not null default 0,                    -- USDC seen so far (confirmed)
  fx_rate numeric(12, 4),                                      -- shillings per dollar, only for KES-priced orders
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  failure_reason text,
  paid_at timestamptz,
  last_checked_at timestamptz,
  swept_at timestamptz,                                        -- set after you move the funds to your own wallet
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_pending_idx on public.payments (status, created_at);

-- An order can only have one open payment at a time
create unique index if not exists payments_one_pending_per_order
  on public.payments (order_id) where status = 'pending';

alter table public.payments enable row level security;

-- No policies on purpose: browsers cannot read or write payments at all.
revoke all on public.payments from anon, authenticated;
