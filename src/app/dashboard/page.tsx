import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("ig_accounts")
    .select("id, username, is_active")
    .eq("user_id", user!.id);

  const accountIds = (accounts || []).map((a) => a.id);

  const { count: ruleCount } = accountIds.length
    ? await supabase
        .from("automation_rules")
        .select("id", { count: "exact", head: true })
        .in("account_id", accountIds)
        .eq("enabled", true)
    : { count: 0 };

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = accountIds.length
    ? await supabase
        .from("message_logs")
        .select("id", { count: "exact", head: true })
        .in("account_id", accountIds)
        .in("action", ["sent_dm", "sent_follow_prompt"])
        .gte("created_at", since24h)
    : { count: 0 };

  const stats = [
    { label: "Ulangan akkauntlar", value: accounts?.length || 0 },
    { label: "Faol qoidalar", value: ruleCount || 0 },
    { label: "So'nggi 24 soatda yuborilgan", value: sentToday || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/dashboard" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-xl font-semibold">Bosh sahifa</h1>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border p-5">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {!accounts?.length && (
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-600 mb-3">
              Hali Instagram akkaunt ulanmagan. Bot ishlashi uchun avval akkauntingizni ulang.
            </p>
            <Link
              href="/settings"
              className="inline-block bg-ig-purple text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Akkaunt ulash →
            </Link>
          </div>
        )}

        {!!accounts?.length && !ruleCount && (
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-600 mb-3">
              Akkaunt ulandi ✅ Endi komment/DM'ga qanday javob berilishini belgilang.
            </p>
            <Link
              href="/rules"
              className="inline-block bg-ig-purple text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Birinchi qoidani qo'shish →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
