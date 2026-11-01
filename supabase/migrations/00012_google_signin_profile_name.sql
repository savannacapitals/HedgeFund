-- Google sign-in: pick up the display name Google provides.
-- Email sign-ups store it as raw_user_meta_data.full_name; Google supplies full_name and/or name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'learner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
