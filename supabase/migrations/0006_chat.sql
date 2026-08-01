-- Instagram Yordamchi — AI Chat Yordamchi (suhbat tarixi)
-- Supabase Dashboard → SQL Editor'da ishga tushiring (Run).

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references ig_accounts(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_account on chat_messages(account_id, created_at);

alter table chat_messages enable row level security;

create policy "chat_messages_owner_all" on chat_messages for all
  using (exists (select 1 from ig_accounts a where a.id = chat_messages.account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from ig_accounts a where a.id = chat_messages.account_id and a.user_id = auth.uid()));
