import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getUserMedia, InstagramApiError } from "@/lib/instagram/client";
import type { IgAccountRow } from "@/lib/instagram/types";

export default async function ReelsPage() {
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
        <Nav active="/reels" />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Avval <Link href="/settings" className="underline">Sozlamalar</Link> sahifasida Instagram
            akkauntingizni ulang.
          </p>
        </main>
      </div>
    );
  }

  const accountIds = accounts.map((a) => a.id);
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .in("account_id", accountIds)
    .not("post_id", "is", null);

  const { data: ruleCounts } = rules?.length
    ? await supabase
        .from("message_logs")
        .select("rule_id")
        .in(
          "rule_id",
          rules.map((r) => r.id)
        )
        .in("action", ["sent_dm", "sent_follow_prompt"])
    : { data: [] as { rule_id: string }[] };

  const countByRule = new Map<string, number>();
  for (const row of ruleCounts || []) {
    countByRule.set(row.rule_id, (countByRule.get(row.rule_id) || 0) + 1);
  }

  let reels: Awaited<ReturnType<typeof getUserMedia>> = [];
  let fetchError: string | null = null;
  const account = accounts[0] as IgAccountRow;

  try {
    const accessToken = decryptToken(account.access_token);
    const media = await getUserMedia(account.ig_user_id, accessToken, 50);
    reels = media.filter((m) => m.media_product_type === "REELS" || m.media_type === "VIDEO");
  } catch (err) {
    fetchError =
      err instanceof InstagramApiError ? err.message : err instanceof Error ? err.message : "Xatolik";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav active="/reels" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Relislar</h1>
          <p className="text-sm text-gray-500 mt-1">
            @{account.username || account.ig_user_id} — har bir reels uchun alohida komment/DM
            qoidasi biriktiring.
          </p>
        </div>

        {fetchError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            Relislarni yuklab bo'lmadi: {fetchError}
          </p>
        )}

        {!fetchError && !reels.length && (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border p-6">
            Hali reels topilmadi (yoki token ruxsati postlarni ko'rishga yetarli emas).
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reels.map((reel) => {
            const reelRules = (rules || []).filter((r) => r.post_id === reel.id);
            const totalSent = reelRules.reduce((sum, r) => sum + (countByRule.get(r.id) || 0), 0);
            return (
              <div key={reel.id} className="bg-white rounded-2xl border overflow-hidden flex flex-col">
                <div className="aspect-[9/16] bg-gray-100 relative">
                  {reel.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reel.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                      🎬
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <p className="text-xs text-gray-400">
                    {new Date(reel.timestamp).toLocaleDateString("uz-UZ")} · ❤ {reel.like_count ?? 0} · 💬{" "}
                    {reel.comments_count ?? 0}
                  </p>
                  <p className="text-sm line-clamp-2 flex-1">{reel.caption || "(izohsiz)"}</p>

                  {reelRules.length > 0 ? (
                    <div className="space-y-1">
                      {reelRules.map((r) => (
                        <div
                          key={r.id}
                          className="text-xs bg-ig-purple/10 text-ig-purple rounded-lg px-2 py-1 flex items-center justify-between"
                        >
                          <span>
                            {r.enabled ? "🟢" : "⚪"} {r.name} ({r.keyword || "hammasi"})
                          </span>
                          <span className="text-gray-500">{countByRule.get(r.id) || 0} marta</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Hali qoida biriktirilmagan</p>
                  )}

                  <Link
                    href={`/rules?postId=${encodeURIComponent(reel.id)}&postLabel=${encodeURIComponent(
                      (reel.caption || reel.id).slice(0, 40)
                    )}`}
                    className="mt-auto text-center text-xs bg-ig-purple text-white rounded-lg py-1.5 hover:opacity-90"
                  >
                    + Yangi DM/komment qoidasi
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
