-- Instagram Yordamchi — boshlang'ich sxema
-- Supabase Dashboard → SQL Editor'da to'liq shu faylni ishga tushiring (Run).

create extension if not exists "pgcrypto";

-- ============================================================
-- 1) Ulangan Instagram (Business) akkauntlar
-- ============================================================
create table if not exists ig_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_user_id text not null,
  username text,
  access_token text not null,           -- AES-256-GCM bilan shifrlangan (src/lib/crypto.ts)
  token_expires_at timestamptz,         -- long-lived token ~60 kun
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ig_user_id)
);

-- ============================================================
-- 2) Avtomatika qoidalari (komment/DM → kalit so'z → javob)
-- ============================================================
create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  name text not null default 'Yangi qoida',
  trigger_type text not null default 'both' check (trigger_type in ('comment', 'dm', 'both')),
  keyword text,                          -- null/bo'sh = har qanday komment/xabarga javob
  match_type text not null default 'contains' check (match_type in ('contains', 'exact')),
  post_id text,                          -- ixtiyoriy: faqat shu post/reels kommentlariga tegishli
  require_follow boolean not null default true,
  follow_reply_text text not null default 'Salom! Mana siz so''ragan ma''lumot 🙌',
  not_follow_reply_text text not null default 'Avval sahifamizga obuna bo''ling, keyin qayta yozing 🙏',
  comment_ack_text text,                 -- ixtiyoriy: kommentga ochiq javob ("DM'ga yubordim ✅")
  media_url text,                        -- ixtiyoriy: yuboriladigan fayl/havola (PDF, link va h.k.)
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_automation_rules_account on automation_rules(account_id);

-- ============================================================
-- 3) Yuborilgan xabarlar tarixi (dashboard "Loglar" sahifasi)
-- ============================================================
create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  rule_id uuid references automation_rules(id) on delete set null,
  trigger_type text not null,
  sender_ig_id text,
  sender_username text,
  was_follower boolean,
  action text not null,                  -- sent_dm | sent_follow_prompt | skipped | error
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_logs_account on message_logs(account_id, created_at desc);

-- ============================================================
-- 4) Webhook hodisalarini takrorlanishdan himoya qilish (idempotency)
-- Meta ba'zan bir hodisani qayta yuborishi mumkin — shu jadval oldini oladi.
-- ============================================================
create table if not exists processed_events (
  event_key text primary key,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table ig_accounts enable row level security;
alter table automation_rules enable row level security;
alter table message_logs enable row level security;
alter table processed_events enable row level security;

-- ig_accounts: faqat egasi ko'radi/boshqaradi
create policy "ig_accounts_owner_select" on ig_accounts for select using (auth.uid() = user_id);
create policy "ig_accounts_owner_insert" on ig_accounts for insert with check (auth.uid() = user_id);
create policy "ig_accounts_owner_update" on ig_accounts for update using (auth.uid() = user_id);
create policy "ig_accounts_owner_delete" on ig_accounts for delete using (auth.uid() = user_id);

-- automation_rules: account orqali egalik tekshiriladi
create policy "automation_rules_owner_select" on automation_rules for select
  using (exists (select 1 from ig_accounts a where a.id = automation_rules.account_id and a.user_id = auth.uid()));
create policy "automation_rules_owner_insert" on automation_rules for insert
  with check (exists (select 1 from ig_accounts a where a.id = automation_rules.account_id and a.user_id = auth.uid()));
create policy "automation_rules_owner_update" on automation_rules for update
  using (exists (select 1 from ig_accounts a where a.id = automation_rules.account_id and a.user_id = auth.uid()));
create policy "automation_rules_owner_delete" on automation_rules for delete
  using (exists (select 1 from ig_accounts a where a.id = automation_rules.account_id and a.user_id = auth.uid()));

-- message_logs: faqat o'qish (yozish service_role — webhook orqali)
create policy "message_logs_owner_select" on message_logs for select
  using (exists (select 1 from ig_accounts a where a.id = message_logs.account_id and a.user_id = auth.uid()));

-- processed_events: faqat service_role foydalanadi, oddiy foydalanuvchiga policy yo'q (yopiq)

-- updated_at avto-yangilanishi
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_ig_accounts_updated_at before update on ig_accounts
  for each row execute function set_updated_at();
create trigger trg_automation_rules_updated_at before update on automation_rules
  for each row execute function set_updated_at();
