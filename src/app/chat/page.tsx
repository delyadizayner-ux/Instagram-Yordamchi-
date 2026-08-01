import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { sendChatMessage, ensureFirstAnalysis } from "./actions";

export const maxDuration = 60;

export default async function ChatPage() {
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
        <Nav active="/chat" />
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

  await ensureFirstAnalysis(account.id);

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav active="/chat" />
      <main className="max-w-3xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">💬 Yordamchi Chat</h1>
          <p className="text-sm text-gray-500 mt-1">
            @{account.username || account.ig_user_id} — 15 yillik tajribali SMM ekspert bilan suhbat
          </p>
        </div>

        <div className="flex-1 bg-white rounded-2xl border p-4 space-y-4 overflow-y-auto mb-4 min-h-[400px]">
          {!messages?.length && (
            <p className="text-sm text-gray-400 text-center py-8">Tahlil tayyorlanmoqda...</p>
          )}
          {messages?.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-ig-purple text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <form action={sendChatMessage} className="flex gap-2">
          <input type="hidden" name="accountId" value={account.id} />
          <input
            name="message"
            required
            placeholder="Savolingizni yozing..."
            className="flex-1 border rounded-xl px-4 py-3 text-sm"
            autoComplete="off"
          />
          <button className="bg-ig-purple text-white rounded-xl px-5 py-3 text-sm font-medium hover:opacity-90">
            Yuborish
          </button>
        </form>
      </main>
    </div>
  );
}
