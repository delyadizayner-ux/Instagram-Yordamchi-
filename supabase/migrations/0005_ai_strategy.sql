-- Instagram Yordamchi — AI Strateg (raqobatchi tahlili + kontent-plan)
-- Supabase Dashboard → SQL Editor'da ishga tushiring (Run).

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  unique (account_id, username)
);

create table if not exists strategy_reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table competitors enable row level security;
alter table strategy_reports enable row level security;

create policy "competitors_owner_all" on competitors for all
  using (exists (select 1 from ig_accounts a where a.id = competitors.account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from ig_accounts a where a.id = competitors.account_id and a.user_id = auth.uid()));

create policy "strategy_reports_owner_select" on strategy_reports for select
  using (exists (select 1 from ig_accounts a where a.id = strategy_reports.account_id and a.user_id = auth.uid()));
