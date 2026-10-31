-- Only enrolled learners can record progress, and progress rows can't be re-pointed
-- at other lessons or other users afterwards.

drop policy if exists "Users can update own progress" on public.lesson_progress;
drop policy if exists "Users can modify own progress" on public.lesson_progress;

create policy "Enrolled users can record own progress"
  on public.lesson_progress for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.course_enrolments e on e.course_id = m.course_id
      where l.id = lesson_progress.lesson_id
        and e.user_id = auth.uid()
        and e.status in ('active', 'completed')
    )
  );

create policy "Users can modify own progress"
  on public.lesson_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only these two columns can change on an existing row
revoke update on public.lesson_progress from anon, authenticated;
grant update (is_completed, completed_at) on public.lesson_progress to authenticated;
