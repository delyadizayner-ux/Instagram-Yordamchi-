import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

const CHART_W = 640;
const CHART_H = 200;
const PAD_X = 12;
const PAD_Y = 16;

function FollowerChart({
  points,
}: {
  points: { captured_at: string; followers_count: number }[];
}) {
  if (points.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
        O'sish grafigi uchun kamida 2 kunlik ma'lumot kerak.
        <br />
        Har kuni avtomatik "surat" olinadi (cron), bir necha kundan keyin bu yerda chiziq
        ko'rinadi.
      </div>
    );
  }

  const values = points.map((p) => p.followers_count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PAD_X + (i / (points.length - 1)) * (CHART_W - PAD_X * 2);
    const y = PAD_Y + (1 - (p.followers_count - min) / range) * (CHART_H - PAD_Y * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-[200px]" role="img" aria-label="Obunachilar o'sishi">
      {/* gridline */}
      <line x1={PAD_X} y1={CHART_H - PAD_Y} x2={CHART_W - PAD_X} y2={CHART_H - PAD_Y} stroke="#e1e0d9" strokeWidth={1} />
      <path d={path} fill="none" stroke="#833AB4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3.5} fill="#833AB4">
            <title>
              {new Date(c.captured_at).toLocaleDateString("uz-UZ")}: {c.followers_count} obunachi
            </title>
          </circle>
        </g>
      ))}
      <text x={PAD_X} y={12} fontSize={10} fill="#898781">
        {coords[0] && new Date(coords[0].captured_at).toLocaleDateString("uz-UZ")}
      </text>
      <text x={CHART_W - PAD_X} y={12} fontSize={10} fill="#898781" textAnchor="end">
        {coords[coords.length - 1] && new Date(coords[coords.length - 1].captured_at).toLocaleDateString("uz-UZ")}
      </text>
    </svg>
  );
}

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_active", true);

  if (!accounts?.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav active="/analytics" />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Avval <Link href="/settings" className="underline">Sozlamalar</Link> sahifasida Instagram
            akkauntingizni ulang.
          </p>
        </main>
      </div>
    );
  }

  const account = accounts[0];
  const accountIds = accounts.map((a) => a.id);

  const { data: snapshots } = await supabase
    .from("follower_snapshots")
    .select("followers_count, media_count, captured_at")
    .eq("account_id", account.id)
    .order("captured_at", { ascending: true })
    .limit(90);

  const latest = snapshots?.[snapshots.length - 1];
  const first = snapshots?.[0];
  const growth = latest && first ? latest.followers_count - first.followers_count : null;

  const { count: ruleCount } = await supabase
    .from("automation_rules")
    .select("id", { count: "exact", head: true })
    .in("account_id", accountIds)
    .eq("enabled", true);

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: sent30d } = await supabase
    .from("message_logs")
    .select("id", { count: "exact", head: true })
    .in("account_id", accountIds)
    .in("action", ["sent_dm", "sent_follow_prompt"])
    .gte("created_at", since30d);

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id, name, post_id")
    .in("account_id", accountIds)
    .not("post_id", "is", null);

  const { data: perRuleLogs } = rules?.length
    ? await supabase
        .from("message_logs")
        .select("rule_id")
        .in(
          "rule_id",
          rules.map((r) => r.id)
        )
    : { data: [] as { rule_id: string }[] };

  const countByRule = new Map<string, number>();
  for (const row of perRuleLogs || []) {
    countByRule.set(row.rule_id, (countByRule.get(row.rule_id) || 0) + 1);
  }
  const topRules = (rules || [])
    .map((r) => ({ ...r, count: countByRule.get(r.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const stats = [
    { label: "Obunachilar", value: latest?.followers_count ?? "—" },
    { label: "Postlar soni", value: latest?.media_count ?? "—" },
    { label: "Faol qoidalar", value: ruleCount || 0 },
    { label: "30 kunda yuborilgan", value: sent30d || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/analytics" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Analitika</h1>
          <p className="text-sm text-gray-500 mt-1">@{account.username || account.ig_user_id}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border p-5">
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Obunachilar o'sishi</h2>
            {growth !== null && (
              <span className={`text-sm font-medium ${growth >= 0 ? "text-green-700" : "text-red-600"}`}>
                {growth >= 0 ? "+" : ""}
                {growth} ({snapshots!.length} kun)
              </span>
            )}
          </div>
          <FollowerChart points={snapshots || []} />
        </section>

        <section className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Reels bo'yicha eng faol qoidalar</h2>
            <Link href="/reels" className="text-xs text-ig-purple hover:underline">
              Barcha relislar →
            </Link>
          </div>
          {!topRules.length && (
            <p className="text-sm text-gray-500">
              Hali hech qanday reels'ga qoida biriktirilmagan —{" "}
              <Link href="/reels" className="underline">
                Relislar
              </Link>{" "}
              sahifasidan boshlang.
            </p>
          )}
          <ul className="divide-y">
            {topRules.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                <span>{r.name}</span>
                <span className="tabular-nums text-gray-500">{r.count} marta yuborilgan</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
