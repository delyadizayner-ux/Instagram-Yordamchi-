import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { connectInstagramAccount, disconnectInstagramAccount } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .order("connected_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/settings" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Sozlamalar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Instagram Business akkauntingizni ulang va botni ishga tushiring.
          </p>
        </div>

        {searchParams.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{searchParams.error}</p>
        )}
        {searchParams.success && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
            Akkaunt muvaffaqiyatli ulandi ✅
          </p>
        )}

        <section className="bg-white rounded-2xl border p-6">
          <h2 className="font-medium mb-1">Ulangan akkauntlar</h2>
          {!accounts?.length && (
            <p className="text-sm text-gray-500">Hali hech qanday akkaunt ulanmagan.</p>
          )}
          <ul className="divide-y">
            {accounts?.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">@{a.username || a.ig_user_id}</p>
                  <p className="text-xs text-gray-400">
                    IG ID: {a.ig_user_id} · Ulangan: {new Date(a.connected_at).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
                <form action={disconnectInstagramAccount}>
                  <input type="hidden" name="accountId" value={a.id} />
                  <button className="text-xs text-red-600 hover:underline">Uzish</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border p-6">
          <h2 className="font-medium mb-3">Yangi Instagram akkaunt ulash</h2>
          <form action={connectInstagramAccount} className="space-y-3">
            <label className="block text-sm text-gray-600">
              Uzoq muddatli (long-lived) Instagram access token
            </label>
            <textarea
              name="accessToken"
              required
              rows={3}
              placeholder="IGAA... bilan boshlanadigan token"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button className="bg-ig-purple text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
              Ulash
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-3">
            Tokenni qanday olish kerakligi bo'yicha to'liq yo'riqnoma — loyihaning README.md faylida.
          </p>
        </section>

        <section className="bg-white rounded-2xl border p-6">
          <h2 className="font-medium mb-2">Webhook ma'lumotlari</h2>
          <p className="text-sm text-gray-500 mb-2">
            Meta App → Webhooks sozlamalarida shu qiymatlarni kiriting:
          </p>
          <div className="text-xs font-mono bg-gray-50 rounded-lg p-3 space-y-1">
            <p>Callback URL: https://&lt;domeningiz&gt;/api/instagram/webhook</p>
            <p>Verify Token: .env dagi IG_WEBHOOK_VERIFY_TOKEN qiymati</p>
            <p>Obuna maydonlari (Fields): messages, comments</p>
          </div>
        </section>
      </main>
    </div>
  );
}
