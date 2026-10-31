-- Catalogue fields the Academy pages already expect
alter table public.courses
  add column if not exists category text,
  add column if not exists level text check (level in ('Beginner', 'Intermediate', 'Advanced')),
  add column if not exists duration_hours numeric(5,1);

-- Link orders to courses (used by the server-side enrolment route in Step 3)
alter table public.orders
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists provider_payment_id text unique;