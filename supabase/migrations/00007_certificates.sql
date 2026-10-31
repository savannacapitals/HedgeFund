-- Certificates: one per learner per course, with the learner's name saved at issue time

alter table public.certificates
  add column if not exists holder_name text;

create unique index if not exists certificates_user_course_key
  on public.certificates (user_id, course_id);

-- Public verification by code. Returns only what a verifier needs.
create or replace function public.verify_certificate(p_code text)
returns table (holder_name text, course_title text, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(ce.holder_name, p.full_name), c.title, ce.issued_at
  from public.certificates ce
  join public.profiles p on p.id = ce.user_id
  join public.courses c on c.id = ce.course_id
  where ce.verification_code = p_code
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
