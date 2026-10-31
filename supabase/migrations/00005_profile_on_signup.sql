-- Create a profile row automatically whenever someone signs up.
-- Orders and enrolments reference profiles(id), so without this they fail for new users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'learner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this trigger existed
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name', 'learner'
from auth.users u
on conflict (id) do nothing;
