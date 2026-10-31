-- ================================================================
-- 00008: Quizzes with server-side scoring
-- Questions are readable by learners. Correct answers are NOT:
-- they live in a table only the server (service role) can read.
-- ================================================================

-- 1. Pass mark per quiz lesson
alter table public.course_lessons
  add column if not exists pass_percent int not null default 70
  check (pass_percent between 1 and 100);

-- 2. Questions (no answers in this table)
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  prompt text not null,
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  order_index int not null default 0,
  created_at timestamptz default now()
);
create index if not exists quiz_questions_lesson_idx on public.quiz_questions (lesson_id, order_index);

-- 3. Answer key: server only
create table if not exists public.quiz_answers (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index int not null check (correct_index >= 0),
  explanation text
);

-- 4. Attempts: written by the server only
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  score int not null,
  total int not null,
  passed boolean not null,
  created_at timestamptz default now()
);
create index if not exists quiz_attempts_user_lesson_idx on public.quiz_attempts (user_id, lesson_id);

alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_attempts enable row level security;

-- A learner can read the questions of any lesson they are allowed to open
-- (the subquery on course_lessons is itself subject to the lesson access rules)
create policy "Read questions of lessons you can open"
  on public.quiz_questions for select
  using (exists (select 1 from public.course_lessons l where l.id = quiz_questions.lesson_id));

create policy "Users view own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

-- Belt and braces: browsers get no access to answers and no writes anywhere here
revoke all on public.quiz_answers from anon, authenticated;
revoke insert, update, delete on public.quiz_questions from anon, authenticated;
revoke insert, update, delete on public.quiz_attempts from anon, authenticated;

-- 5. Quiz lessons can only be completed by passing, never by clicking "mark complete"
create or replace function public.is_quiz_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_lessons
    where id = p_lesson_id and content_type = 'quiz'
  )
$$;

revoke all on function public.is_quiz_lesson(uuid) from public;
grant execute on function public.is_quiz_lesson(uuid) to authenticated;

drop policy if exists "Enrolled users can record own progress" on public.lesson_progress;
create policy "Enrolled users can record own progress"
  on public.lesson_progress for insert
  with check (
    auth.uid() = user_id
    and not public.is_quiz_lesson(lesson_id)
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

drop policy if exists "Users can modify own progress" on public.lesson_progress;
create policy "Users can modify own progress"
  on public.lesson_progress for update
  using (auth.uid() = user_id and not public.is_quiz_lesson(lesson_id))
  with check (auth.uid() = user_id and not public.is_quiz_lesson(lesson_id));
