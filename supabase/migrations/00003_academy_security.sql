-- ================================================================
-- 00003: Academy security hardening
-- ================================================================

-- 1. PROFILES: stop users editing their own role.
--    After this, clients can only update full_name.
--    Change roles from the SQL editor or with the service role key.
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. MODULES: only visible for published courses (or to staff)
drop policy if exists "Allow public read access on course_modules" on public.course_modules;
create policy "Read modules of published courses or as staff"
  on public.course_modules for select
  using (
    exists (select 1 from public.courses c
            where c.id = course_modules.course_id and c.is_published)
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('editor', 'administrator'))
  );

-- 3. LESSONS: video_url and content_body only for previews, enrolled learners, or staff
drop policy if exists "Allow public read access on course_lessons" on public.course_lessons;
create policy "Lessons: preview, enrolled learners, or staff"
  on public.course_lessons for select
  using (
    (is_preview = true and exists (
        select 1 from public.course_modules m
        join public.courses c on c.id = m.course_id
        where m.id = course_lessons.module_id and c.is_published))
    or exists (
        select 1 from public.course_modules m
        join public.course_enrolments e on e.course_id = m.course_id
        where m.id = course_lessons.module_id
          and e.user_id = auth.uid()
          and e.status in ('active', 'completed'))
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('editor', 'administrator'))
  );

-- 4. PUBLIC CURRICULUM VIEW: titles and types only, no video or body.
--    The course landing page reads this instead of course_lessons.
create or replace view public.course_curriculum as
select l.id, l.module_id, l.title, l.content_type,
       l.duration_minutes, l.is_preview, l.order_index
from public.course_lessons l
join public.course_modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
where c.is_published = true;

grant select on public.course_curriculum to anon, authenticated;

-- 5. CERTIFICATES: owners see their own; the public verifies by code only
drop policy if exists "Allow public read access for certificate verification" on public.certificates;
create policy "Users can view own certificates"
  on public.certificates for select
  using (auth.uid() = user_id);

create or replace function public.verify_certificate(p_code text)
returns table (holder_name text, course_title text, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, c.title, ce.issued_at
  from public.certificates ce
  join public.profiles p on p.id = ce.user_id
  join public.courses c on c.id = ce.course_id
  where ce.verification_code = p_code
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;