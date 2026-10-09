-- ANVION Expense App - Phase 2
-- Run this in Supabase SQL Editor.
-- First create Auth users in Supabase Dashboard > Authentication > Users.
-- Use an internal email such as naveen@anvion.local for the Auth email,
-- then put the desired login name below. The email is never shown in the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique,
  role text not null default 'director',
  company_name text not null default 'ANVION INNOVATIONS PRIVATE LIMITED',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create or replace function public.get_login_email(p_name text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(trim(p.name)) = lower(trim(p_name))
  limit 1;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- After creating an Auth user, run an insert like this using that user's UUID:
-- insert into public.profiles (id, name, role)
-- values ('AUTH-USER-UUID-HERE', 'Naveen', 'director');
