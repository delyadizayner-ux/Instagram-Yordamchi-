import { createBrowserClient } from "@supabase/ssr";

// Brauzer (Client Component) tomoni uchun Supabase client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
