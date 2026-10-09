-- ANVION Expense App - Phase 4
-- Run after supabase-phase2.sql in the Supabase SQL Editor.

create table if not exists public.expense_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('PAID','TAKEN')),
  statement text not null,
  amount numeric(14,2) not null default 0,
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expense_records enable row level security;

create index if not exists expense_records_user_date_idx on public.expense_records(user_id, transaction_date desc);

create policy "Users can read their own expense records"
on public.expense_records for select to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own expense records"
on public.expense_records for insert to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own expense records"
on public.expense_records for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own expense records"
on public.expense_records for delete to authenticated
using (user_id = auth.uid());

create or replace function public.set_expense_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists expense_records_updated_at on public.expense_records;
create trigger expense_records_updated_at before update on public.expense_records
for each row execute function public.set_expense_updated_at();
