-- Vaqtinchalik diagnostika jadvali — webhook'ga umuman so'rov kelayotganmi tekshirish uchun.
-- Supabase Dashboard → SQL Editor'da ishga tushiring (Run).

create table if not exists webhook_debug_log (
  id uuid primary key default gen_random_uuid(),
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table webhook_debug_log enable row level security;
-- Faqat service_role o'qiydi/yozadi (RLS'ni bypass qiladi), oddiy foydalanuvchiga policy yo'q.
