import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

const actionLabel: Record<string, string> = {
  sent_dm: "✅ Xabar yuborildi",
  sent_follow_prompt: "⚠️ Obuna so'raldi",
  error: "❌ Xatolik",
};

export default async function LogsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("ig_accounts")
    .select("id")
    .eq("user_id", user!.id);

  const accountIds = (accounts || []).map((a) => a.id);
  const { data: logs } = accountIds.length
    ? await supabase
        .from("message_logs")
        .select("*")
        .in("account_id", accountIds)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as any[] };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/logs" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-1">Yuborilgan xabarlar tarixi</h1>
        <p className="text-sm text-gray-500 mb-6">Oxirgi 100 ta hodisa</p>

        <div className="bg-white rounded-2xl border overflow-hidden">
          {!logs?.length && (
            <p className="text-sm text-gray-500 p-6">Hali hech qanday hodisa qayd etilmagan.</p>
          )}
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {logs?.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                    {new Date(l.created_at).toLocaleString("uz-UZ")}
                  </td>
                  <td className="px-4 py-3">{actionLabel[l.action] || l.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase">{l.trigger_type}</td>
                  <td className="px-4 py-3">
                    {l.sender_username ? `@${l.sender_username}` : l.sender_ig_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {l.was_follower === true && "obunachi"}
                    {l.was_follower === false && "obuna emas"}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate" title={l.detail}>
                    {l.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
