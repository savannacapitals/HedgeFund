-- ================================================================
-- 00014: Savanna AI Opportunities
--   * Two new order kinds, paid through the existing /checkout flow:
--       ai_membership  (KES 100, 30-day access)   ai_assistance (USD 15, per request)
--   * Platform directory (public summary) + platform guides (members only)
--   * Membership periods, assistance requests, saved / viewed / progress, announcements
-- Everything the browser must not write goes through the server (service role).
-- Guides, membership periods and assistance requests have NO browser access at all.
-- ================================================================

-- 1. New order kinds ------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders
  add constraint orders_kind_check
  check (kind in ('course', 'community', 'ai_membership', 'ai_assistance'));

-- 2. Platform directory (public summary) ----------------------------------------------
create table if not exists public.ai_platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  logo_url text,
  short_description text not null default '',
  category text not null check (category in (
    'ai_training', 'data_annotation', 'ai_evaluation',
    'language_transcription', 'expert_freelancing', 'remote_digital_work')),
  official_url text,
  -- Verified / Conditional / Restricted / Under Review
  verification_status text not null default 'under_review'
    check (verification_status in ('verified', 'conditional', 'restricted', 'under_review')),
  -- Does the platform accept Kenyan applicants? (separate from "accepting registrations")
  kenya_eligibility text not null default 'unknown'
    check (kenya_eligibility in ('yes', 'conditional', 'no', 'unknown')),
  last_verified date,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_platforms_category_idx on public.ai_platforms (category);
create index if not exists ai_platforms_status_idx on public.ai_platforms (verification_status);

alter table public.ai_platforms enable row level security;
drop policy if exists "Published AI platforms are public" on public.ai_platforms;
create policy "Published AI platforms are public"
  on public.ai_platforms for select using (is_published);

-- 3. Platform guides (members only: read by the server after a membership check) -------
create table if not exists public.ai_platform_guides (
  platform_id uuid primary key references public.ai_platforms(id) on delete cascade,
  -- The four separate conditions. Each is yes / no / varies / unknown.
  accepting_registrations text not null default 'unknown' check (accepting_registrations in ('yes','no','varies','unknown')),
  has_projects text not null default 'unknown' check (has_projects in ('yes','no','varies','unknown')),
  pays_in_kenya text not null default 'unknown' check (pays_in_kenya in ('yes','no','varies','unknown')),
  country_eligibility text,                 -- free text, as published by the platform
  min_age int check (min_age is null or (min_age between 13 and 99)),
  required_equipment text[] not null default '{}',
  required_skills text[] not null default '{}',
  registration_requirements text[] not null default '{}',
  assessment_requirements text,
  payment_methods text[] not null default '{}',
  compensation text,                        -- only what the platform officially publishes
  application_availability text,
  overview text,
  eligibility_notes text,
  account_steps text[] not null default '{}',
  assessment_notes text,
  earning_notes text,
  payments_notes text,
  common_mistakes text[] not null default '{}',
  recommendations text[] not null default '{}',
  restriction_notes text,
  resources jsonb not null default '[]'::jsonb,   -- [{label, url}] official registration, docs, support
  sources jsonb not null default '[]'::jsonb,     -- [{label, url}] where each fact came from
  updated_at timestamptz not null default now()
);
alter table public.ai_platform_guides enable row level security;
revoke all on public.ai_platform_guides from anon, authenticated;

-- 4. Membership periods ---------------------------------------------------------------
-- One row per paid order. Access = any period that has not ended whose order is still confirmed,
-- so a refunded order stops counting by itself.
create table if not exists public.ai_membership_periods (
  order_id uuid primary key references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'payment' check (source in ('payment', 'manual')),
  created_at timestamptz not null default now()
);
create index if not exists ai_membership_periods_user_idx on public.ai_membership_periods (user_id, ends_at desc);
alter table public.ai_membership_periods enable row level security;
drop policy if exists "Users see own AI membership periods" on public.ai_membership_periods;
create policy "Users see own AI membership periods"
  on public.ai_membership_periods for select using (auth.uid() = user_id);

-- Manual grants (comps, staff) have no order. They live here so the order key stays real.
create table if not exists public.ai_membership_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ends_at timestamptz not null,
  note text not null,
  granted_by uuid references public.profiles(id),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_membership_grants_user_idx on public.ai_membership_grants (user_id);
alter table public.ai_membership_grants enable row level security;
revoke all on public.ai_membership_grants from anon, authenticated;

-- 5. Account assistance requests ----------------------------------------------------------
create table if not exists public.ai_assistance_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform_id uuid references public.ai_platforms(id) on delete set null,
  platform_name text not null,              -- kept even if the platform is later removed
  challenge text not null check (char_length(challenge) between 10 and 2000),
  contact_preference text,                  -- how the customer would like to be reached (no secrets)
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'payment_pending'
    check (status in ('payment_pending','request_received','in_progress','awaiting_customer','completed','cancelled')),
  staff_note text,                          -- visible to the customer
  internal_note text,                       -- staff only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_assistance_user_idx on public.ai_assistance_requests (user_id, created_at desc);
create index if not exists ai_assistance_status_idx on public.ai_assistance_requests (status, created_at);
alter table public.ai_assistance_requests enable row level security;
-- No browser policies: internal_note must never reach the browser. The server returns a safe view.
revoke all on public.ai_assistance_requests from anon, authenticated;

-- 6. Member-owned lists --------------------------------------------------------------------
create table if not exists public.ai_saved_platforms (
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform_id uuid not null references public.ai_platforms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, platform_id)
);
create table if not exists public.ai_platform_views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform_id uuid not null references public.ai_platforms(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, platform_id)
);
-- Self-reported only. Savanna cannot verify third-party hiring or payment outcomes.
create table if not exists public.ai_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform_id uuid not null references public.ai_platforms(id) on delete cascade,
  stage text not null check (stage in (
    'interested','account_created','assessment_completed','application_submitted',
    'accepted','first_task_completed','first_payment_received')),
  updated_at timestamptz not null default now(),
  primary key (user_id, platform_id)
);
alter table public.ai_saved_platforms enable row level security;
alter table public.ai_platform_views enable row level security;
alter table public.ai_progress enable row level security;
revoke all on public.ai_saved_platforms, public.ai_platform_views, public.ai_progress from anon, authenticated;

-- 7. Announcements -------------------------------------------------------------------------
create table if not exists public.ai_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  platform_id uuid references public.ai_platforms(id) on delete set null,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.ai_announcements enable row level security;
revoke all on public.ai_announcements from anon, authenticated;

-- 8. Starting platform list ------------------------------------------------------------------
-- These are RESEARCH TARGETS, not endorsements. Every row starts as "Under Review" with Kenya
-- eligibility "unknown" and no last-verified date, except where official documentation was read
-- (OpenTrain AI). Staff must verify each website and fact in /admin/ai before changing a status.
insert into public.ai_platforms (slug, name, short_description, category, official_url, verification_status, kenya_eligibility, last_verified, is_featured) values
  ('loggy3',        'Loggy3',            'Initial research target. Official website and details are not yet confirmed.', 'ai_training',            null,                         'under_review', 'unknown', null, false),
  ('mercor',        'Mercor',            'Talent marketplace that connects domain experts with AI lab projects.',       'expert_freelancing',     'https://mercor.com',         'under_review', 'unknown', null, true),
  ('oneforma',      'OneForma',          'Crowd platform for data collection, annotation and language tasks, run by Centific.', 'data_annotation', 'https://www.oneforma.com',  'under_review', 'unknown', null, true),
  ('crowdgen',      'CrowdGen by Appen', 'Appen''s crowd work platform for AI data tasks such as annotation and evaluation.', 'data_annotation',  'https://crowdgen.com',       'under_review', 'unknown', null, false),
  ('micro1',        'micro1',            'AI-driven talent platform that places experts on AI training and evaluation work.', 'expert_freelancing', 'https://www.micro1.ai',   'under_review', 'unknown', null, false),
  ('cloudfactory',  'CloudFactory',      'Managed workforce provider for data annotation and review.',                  'data_annotation',        'https://www.cloudfactory.com','under_review','unknown', null, false),
  ('welo-data',     'Welo Data',         'AI data services from Welocalize, covering language, annotation and evaluation.', 'language_transcription','https://www.welodata.ai', 'under_review', 'unknown', null, false),
  ('dataannotation','DataAnnotation',    'Platform offering AI training and evaluation tasks to qualified contributors.', 'ai_training',         'https://www.dataannotation.tech','under_review','unknown', null, true),
  ('alignerr',      'Alignerr',          'Platform that connects experts with AI training and evaluation projects.',    'ai_training',            'https://www.alignerr.com',   'under_review', 'unknown', null, false),
  ('mindrift',      'Mindrift',          'Platform for AI model evaluation and training tasks for subject experts.',    'ai_evaluation',          'https://mindrift.ai',        'under_review', 'unknown', null, false),
  ('toloka',        'Toloka',            'Data platform that supplies human data for AI through crowd and expert contributors.', 'data_annotation', 'https://toloka.ai',      'under_review', 'unknown', null, false),
  ('outlier',       'Outlier',           'AI training platform operated by Scale AI.',                                  'ai_training',            'https://outlier.ai',         'under_review', 'unknown', null, false),
  ('opentrain-ai',  'OpenTrain AI',      'Marketplace that connects employers with AI trainers and data labelers, with AI-led screening interviews.', 'expert_freelancing', 'https://www.opentrain.ai', 'conditional', 'conditional', date '2026-11-02', true)
on conflict (slug) do nothing;

-- Empty guides for every platform so the admin screen always has a row to edit
insert into public.ai_platform_guides (platform_id)
  select id from public.ai_platforms
  on conflict (platform_id) do nothing;

-- The one platform whose official documentation was read when this was written.
-- "Kenya on the payout list" was NOT confirmed, so pays_in_kenya stays unknown.
update public.ai_platform_guides g set
  accepting_registrations = 'yes',
  overview = 'OpenTrain AI is a marketplace that connects employers with AI trainers and data labelers. Employers post projects; trainers build a profile, complete an AI-led interview and submit proposals. Work can include data labeling and annotation across text, image, audio, video and code, and RLHF-style tasks such as ranking, rating and evaluating model outputs.',
  eligibility_notes = 'Payout availability depends on the AI trainer''s bank country. Whether Kenya is on the current payout list was not independently verified. Check the official payout country page before you start.',
  account_steps = array[
    'Go to the official sign-up page at app.opentrain.ai and choose the AI trainer account type.',
    'Enter the 6-digit one-time code the platform emails you to verify your address.',
    'Complete your profile: upload your resume and set your skills and language abilities.',
    'Browse projects that match your skills and complete the AI-driven interview before you submit a proposal.',
    'Connect a payout method once the platform asks for one, after checking your country is supported.'
  ],
  assessment_notes = 'Candidates complete an AI-led interview before submitting a proposal. The platform records structured answers for the employer to review.',
  earning_notes = 'Not independently verified. Pay is set per project between the employer and the trainer. Do not rely on example earnings shown in marketing material.',
  payments_notes = 'Payments run through the platform using milestones and a connected payout method. Payout availability depends on your bank country. Check the official payout country page.',
  restriction_notes = 'Kenya on the official payout country list: not independently verified.',
  common_mistakes = array[
    'Submitting proposals before completing the profile and the AI interview.',
    'Assuming you can be paid without checking that your bank country is supported.'
  ],
  recommendations = array[
    'Read the official payout country page before investing time in a profile.',
    'Keep your resume and skills consistent with what you claim in the interview.'
  ],
  resources = '[{"label":"Official website","url":"https://www.opentrain.ai"},{"label":"Official sign-up (app)","url":"https://app.opentrain.ai"},{"label":"Official documentation","url":"https://www.opentrain.ai/docs/"},{"label":"AI trainer overview","url":"https://www.opentrain.ai/docs/trainers/overview"}]'::jsonb,
  sources = '[{"label":"OpenTrain AI documentation","url":"https://www.opentrain.ai/docs/"},{"label":"OpenTrain AI account setup","url":"https://www.opentrain.ai/docs/account-setup/"},{"label":"OpenTrain AI trainer overview","url":"https://www.opentrain.ai/docs/trainers/overview"}]'::jsonb
from public.ai_platforms p
where g.platform_id = p.id and p.slug = 'opentrain-ai';
