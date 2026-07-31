import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// RLS'ni chetlab o'tuvchi service-role client.
// FAQAT server-only kodda ishlatiladi: webhook handler, cron route'lar.
// Hech qachon Client Component yoki brauzerga oshkor qilinmasin.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
