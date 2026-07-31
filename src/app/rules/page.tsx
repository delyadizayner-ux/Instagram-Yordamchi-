import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { saveRule, toggleRule, deleteRule } from "./actions";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("ig_accounts")
    .select("id, username, ig_user_id")
    .eq("user_id", user!.id);

  const accountIds = (accounts || []).map((a) => a.id);
  const { data: rules } = accountIds.length
    ? await supabase
        .from("automation_rules")
        .select("*")
        .in("account_id", accountIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const editingRule = searchParams.edit ? rules?.find((r) => r.id === searchParams.edit) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/rules" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Avtomatika qoidalari</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kalit so'z + obuna tekshiruvi + tayyor javob — komment yoki DM uchun.
          </p>
        </div>

        {!accounts?.length && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Avval <a href="/settings" className="underline">Sozlamalar</a> sahifasida Instagram akkauntingizni ulang.
          </p>
        )}

        {!!accounts?.length && (
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="font-medium mb-3">
              {editingRule ? "Qoidani tahrirlash" : "Yangi qoida qo'shish"}
            </h2>
            <form action={saveRule} className="space-y-3">
              {editingRule && <input type="hidden" name="id" value={editingRule.id} />}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Instagram akkaunt</label>
                  <select
                    name="accountId"
                    defaultValue={editingRule?.account_id || accounts[0]?.id}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.username || a.ig_user_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qoida nomi</label>
                  <input
                    name="name"
                    defaultValue={editingRule?.name}
                    placeholder="Masalan: PDF so'rovi"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qayerda ishlasin</label>
                  <select
                    name="triggerType"
                    defaultValue={editingRule?.trigger_type || "both"}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="both">Komment + DM</option>
                    <option value="comment">Faqat komment</option>
                    <option value="dm">Faqat DM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kalit so'z</label>
                  <input
                    name="keyword"
                    defaultValue={editingRule?.keyword || ""}
                    placeholder="bo'sh = hammasiga javob"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Moslik turi</label>
                  <select
                    name="matchType"
                    defaultValue={editingRule?.match_type || "contains"}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="contains">O'z ichiga olsa</option>
                    <option value="exact">Aynan mos kelsa</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requireFollow"
                  defaultChecked={editingRule?.require_follow ?? true}
                />
                Obuna bo'lganlarga tekshirilsin
              </label>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Obuna bo'lganlarga yuboriladigan javob
                </label>
                <textarea
                  name="followReplyText"
                  required
                  rows={2}
                  defaultValue={editingRule?.follow_reply_text}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Obuna bo'lmaganlarga yuboriladigan javob
                </label>
                <textarea
                  name="notFollowReplyText"
                  required
                  rows={2}
                  defaultValue={editingRule?.not_follow_reply_text}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Havola/media (ixtiyoriy)
                  </label>
                  <input
                    name="mediaUrl"
                    defaultValue={editingRule?.media_url || ""}
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Kommentga ochiq javob (ixtiyoriy)
                  </label>
                  <input
                    name="commentAckText"
                    defaultValue={editingRule?.comment_ack_text || ""}
                    placeholder="DM'ga yubordim ✅"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button className="bg-ig-purple text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
                {editingRule ? "Saqlash" : "Qo'shish"}
              </button>
            </form>
          </section>
        )}

        <section className="bg-white rounded-2xl border p-6">
          <h2 className="font-medium mb-3">Mavjud qoidalar</h2>
          {!rules?.length && <p className="text-sm text-gray-500">Hali qoida qo'shilmagan.</p>}
          <ul className="divide-y">
            {rules?.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.name} {!r.enabled && <span className="text-gray-400">(o'chirilgan)</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.trigger_type} · kalit so'z: {r.keyword || "(hammasi)"} · obuna talab:{" "}
                    {r.require_follow ? "ha" : "yo'q"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <a href={`/rules?edit=${r.id}`} className="text-ig-purple hover:underline">
                    Tahrirlash
                  </a>
                  <form action={toggleRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="enabled" value={String(r.enabled)} />
                    <button className="text-gray-600 hover:underline">
                      {r.enabled ? "O'chirish" : "Yoqish"}
                    </button>
                  </form>
                  <form action={deleteRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-red-600 hover:underline">O'chirib tashlash</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
