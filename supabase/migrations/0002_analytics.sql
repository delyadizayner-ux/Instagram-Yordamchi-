-- Instagram Yordamchi — analitika uchun qo'shimcha sxema
-- Supabase Dashboard → SQL Editor'da ishga tushiring (Run).

-- ============================================================
-- Kunlik "surat" (snapshot) — obunachilar/post soni tarixi
-- Cron (/api/cron/snapshot) har kuni bitta qator qo'shadi, shu orqali
-- Analitika sahifasida o'sish grafigi chiziladi.
-- ============================================================
create table if not exists follower_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  followers_count integer not null,
  media_count integer,
  captured_at timestamptz not null default now()
);

create index if not exists idx_follower_snapshots_account on follower_snapshots(account_id, captured_at desc);

alter table follower_snapshots enable row level security;

create policy "follower_snapshots_owner_select" on follower_snapshots for select
  using (exists (select 1 from ig_accounts a where a.id = follower_snapshots.account_id and a.user_id = auth.uid()));

-- automation_rules.post_id bo'yicha qidiruvni tezlashtirish (Relislar sahifasi)
create index if not exists idx_automation_rules_post on automation_rules(post_id) where post_id is not null;
