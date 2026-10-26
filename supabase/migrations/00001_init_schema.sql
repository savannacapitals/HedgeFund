-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ENUMS & ROLES
-- -----------------------------------------------------------------------------
create type user_role as enum (
  'visitor',
  'learner',
  'customer',
  'researcher',
  'editor',
  'administrator',
  'finance_operator'
);

create type article_status as enum (
  'draft',
  'review',
  'published',
  'archived'
);

create type order_status as enum (
  'pending',
  'confirmed',
  'failed',
  'refunded'
);

-- -----------------------------------------------------------------------------
-- 2. USER PROFILES & ACCOUNTS
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role default 'visitor'::user_role not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Profile RLS Policies
create policy "Public profiles are viewable by authenticated users." on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 3. RESEARCH MODULE
-- -----------------------------------------------------------------------------
create table public.research_articles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  summary text,
  body text not null,
  author_id uuid references public.profiles(id) not null,
  status article_status default 'draft'::article_status not null,
  category text not null,
  tags text[] default '{}'::text[],
  published_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.research_articles enable row level security;

-- Research RLS Policies
create policy "Published articles are viewable by everyone." on public.research_articles
  for select using (status = 'published');

create policy "Editors and Researchers can create/manage articles." on public.research_articles
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('editor', 'researcher', 'administrator')
    )
  );

-- -----------------------------------------------------------------------------
-- 4. ACADEMY & COURSES
-- -----------------------------------------------------------------------------
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  is_published boolean default false not null,
  price numeric(12, 2) default 0.00 not null check (price >= 0),
  currency text default 'USD' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.courses enable row level security;

create policy "Published courses are viewable by everyone." on public.courses
  for select using (is_published = true);

-- -----------------------------------------------------------------------------
-- 5. COMMERCE & ORDERS (DECIMAL PRECISION LEDGER)
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text default 'USD' not null,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Active products are viewable by everyone." on public.products
  for select using (is_active = true);

create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency text default 'USD' not null,
  status order_status default 'pending'::order_status not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Users can view own orders." on public.orders
  for select using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. AUDIT TRAIL (APPEND-ONLY)
-- -----------------------------------------------------------------------------
create table public.audit_events (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.audit_events enable row level security;

create policy "Only administrators can view audit logs." on public.audit_events
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'administrator'
    )
  );