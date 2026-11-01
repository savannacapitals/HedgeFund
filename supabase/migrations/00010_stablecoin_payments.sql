-- ================================================================
-- 00010: Stablecoin payments (USDC and USDT)
-- Customers pay an exact amount to a fixed deposit address. Every transfer we see on the blockchain
-- is saved, and matched to the order that was given that exact amount.
-- Browsers have no access to these tables.
-- ================================================================

-- Clean up an earlier draft of this feature, if it was ever applied
drop table if exists public.payments cascade;
drop function if exists public.next_usdc_deposit_index();
drop sequence if exists public.usdc_deposit_index_seq;

-- Every incoming transfer we have seen, matched or not (your reconciliation record)
create table public.chain_transfers (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  token text not null check (token in ('USDC', 'USDT')),
  ref text not null,                       -- unique id of the transfer within its network
  txid text not null,
  from_address text,
  to_address text not null,
  amount_units bigint not null check (amount_units > 0),   -- 1 USDC or 1 USDT = 1000000
  occurred_at timestamptz not null,
  payment_id uuid,
  created_at timestamptz not null default now(),
  unique (network, ref)
);
create index chain_transfers_unmatched_idx on public.chain_transfers (occurred_at) where payment_id is null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'stablecoin',
  amount_units bigint not null check (amount_units > 0),   -- the exact amount to send, including the identifying last digits
  fx_rate numeric(12, 4),                                  -- shillings per dollar, only for KES-priced orders
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'expired')),
  matched_transfer_id uuid unique references public.chain_transfers(id),
  paid_network text,
  paid_token text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chain_transfers
  add constraint chain_transfers_payment_fk foreign key (payment_id) references public.payments(id);

create index payments_order_idx on public.payments (order_id);
create index payments_user_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status, created_at);

-- One open payment per order, and no two open payments with the same exact amount
create unique index payments_one_pending_per_order on public.payments (order_id) where status = 'pending';
create unique index payments_unique_pending_amount on public.payments (amount_units) where status = 'pending';

-- Where each blockchain scan stopped
create table public.scan_cursors (
  network text primary key,
  cursor text,
  last_scan_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.chain_transfers enable row level security;
alter table public.payments enable row level security;
alter table public.scan_cursors enable row level security;

-- No policies on purpose: browsers cannot read or write any of this. Only the server can.
revoke all on public.chain_transfers from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.scan_cursors from anon, authenticated;
