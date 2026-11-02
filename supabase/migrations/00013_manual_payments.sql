-- ================================================================
-- 00013: Pochi la Biashara and bank-transfer payments
-- Neither has a collection API, so the customer pays outside the site and then gives us the
-- M-Pesa code (Pochi) or the bank transaction reference (bank). Pochi payments are confirmed
-- automatically when the matching M-Pesa SMS reaches /api/webhooks/pochi. Bank payments (and
-- any Pochi payment the SMS never confirms) are confirmed by an admin on /admin/orders.
-- Browsers have no access to these tables.
-- ================================================================

create table public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('pochi', 'bank')),
  reference text not null,                          -- short order reference shown to the customer, e.g. SC-1A2B3C4D
  amount numeric(14, 2) not null check (amount > 0),  -- what the customer must pay, in `currency`
  currency text not null check (currency in ('KES', 'USD')),
  fx_rate numeric(12, 4),                           -- shillings per dollar, only when the order had to be converted
  provider_ref text,                                -- M-Pesa code or bank reference typed in by the customer
  payer_name text,
  attempts int not null default 0,
  status text not null default 'awaiting'
    check (status in ('awaiting', 'submitted', 'succeeded', 'expired')),
  submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index manual_payments_user_idx on public.manual_payments (user_id);
create index manual_payments_status_idx on public.manual_payments (status, created_at);

-- One open manual payment per order
create unique index manual_payments_one_open_per_order
  on public.manual_payments (order_id) where status in ('awaiting', 'submitted');

-- A code or reference can only back one payment
create unique index manual_payments_ref_unique
  on public.manual_payments (method, upper(provider_ref))
  where provider_ref is not null and status in ('submitted', 'succeeded');

-- Every "you have received" M-Pesa SMS the phone forwards to us (your reconciliation record)
create table public.pochi_messages (
  id uuid primary key default gen_random_uuid(),
  mpesa_code text not null unique,
  amount numeric(14, 2) not null check (amount > 0),
  sender_name text,
  raw text not null,
  claimed_by uuid unique references public.manual_payments(id),
  received_at timestamptz not null default now()
);
create index pochi_messages_unclaimed_idx on public.pochi_messages (received_at) where claimed_by is null;

alter table public.manual_payments enable row level security;
alter table public.pochi_messages enable row level security;

-- No policies on purpose: only the server (service role) can read or write these.
revoke all on public.manual_payments from anon, authenticated;
revoke all on public.pochi_messages from anon, authenticated;
