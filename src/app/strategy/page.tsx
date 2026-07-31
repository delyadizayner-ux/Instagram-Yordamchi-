import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { addCompetitor, removeCompetitor, generateReport } from "./actions";

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
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
        <Nav active="/strategy" />
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

  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  const { data: reports } = await supabase
    .from("strategy_reports")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestReport = reports?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/strategy" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">🧠 AI Strateg</h1>
          <p className="text-sm text-gray-500 mt-1">
            @{account.username || account.ig_user_id} — 15 yillik tajribali SMM strateg sifatida
            tahlil, raqobatchi kuzatuvi va kontent-plan
          </p>
        </div>

        {searchParams.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{searchParams.error}</p>
        )}

        <section className="bg-white rounded-2xl border p-6">
          <h2 className="font-medium mb-3">Raqobatchilar (ixtiyoriy)</h2>
          <form action={addCompetitor} className="flex gap-2 mb-4">
            <input type="hidden" name="accountId" value={account.id} />
            <input
              name="username"
              placeholder="@raqobatchi_username"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button className="bg-ig-purple text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
              Qo'shish
            </button>
          </form>
          {!competitors?.length && (
            <p className="text-sm text-gray-400">
              Hali raqobatchi qo'shilmagan — qo'shsangiz AI ularning postlarini ham tahlil qiladi.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {competitors?.map((c) => (
              <form
                key={c.id}
                action={removeCompetitor}
                className="flex items-center gap-1 bg-gray-100 rounded-full pl-3 pr-1 py-1 text-xs"
              >
                <span>@{c.username}</span>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-gray-400 hover:text-red-600 px-1">✕</button>
              </form>
            ))}
          </div>
        </section>

        <form action={generateReport}>
          <input type="hidden" name="accountId" value={account.id} />
          <button className="w-full bg-ig-purple text-white rounded-2xl py-4 text-sm font-medium hover:opacity-90">
            🧠 AI tahlil va kontent-plan yaratish
          </button>
        </form>

        {latestReport && (
          <section className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">So'nggi tahlil</h2>
              <span className="text-xs text-gray-400">
                {new Date(latestReport.created_at).toLocaleString("uz-UZ")}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{latestReport.content}</div>
          </section>
        )}

        {reports && reports.length > 1 && (
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="font-medium mb-3">Oldingi tahlillar</h2>
            <ul className="divide-y">
              {reports.slice(1).map((r) => (
                <li key={r.id} className="py-2 text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleString("uz-UZ")}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
