import { getAccountStats, getUserMedia, getBusinessDiscovery } from "@/lib/instagram/client";
import type { IgAccountRow } from "@/lib/instagram/types";

// AI'ga yuboriladigan "kanal holati" matnini bir joyda tayyorlaydi — Strateg va
// Chat sahifalari ikkalasi ham shu funksiyadan foydalanadi, natija bir xil bo'ladi.
export async function buildChannelContext(
  account: IgAccountRow,
  accessToken: string,
  competitorUsernames: string[]
): Promise<string> {
  const [stats, media] = await Promise.all([
    getAccountStats(account.ig_user_id, accessToken).catch(() => null),
    getUserMedia(account.ig_user_id, accessToken, 15).catch(() => []),
  ]);

  const topPosts = media
    .slice()
    .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    .slice(0, 10)
    .map(
      (m) =>
        `- "${(m.caption || "").slice(0, 90)}" | ❤${m.like_count ?? 0} 💬${m.comments_count ?? 0} | ${
          m.media_product_type || m.media_type
        } | ${new Date(m.timestamp).toLocaleDateString("uz-UZ")}`
    )
    .join("\n");

  const worstPosts = media
    .slice()
    .sort((a, b) => (a.like_count || 0) - (b.like_count || 0))
    .slice(0, 5)
    .map((m) => `- "${(m.caption || "").slice(0, 90)}" | ❤${m.like_count ?? 0} 💬${m.comments_count ?? 0}`)
    .join("\n");

  const competitorData = [];
  for (const username of competitorUsernames) {
    const data = await getBusinessDiscovery(account.ig_user_id, username, accessToken);
    if (data) competitorData.push(data);
  }

  const competitorSummary = competitorData
    .map(
      (c) =>
        `@${c.username}: ${c.followers_count ?? "?"} obunachi, ${c.media_count ?? "?"} post\n` +
        (c.media || [])
          .slice(0, 5)
          .map((m) => `  - "${(m.caption || "").slice(0, 60)}" | ❤${m.like_count ?? 0} 💬${m.comments_count ?? 0}`)
          .join("\n")
    )
    .join("\n\n");

  return `MENING AKKAUNTIM: @${account.username || account.ig_user_id}
Obunachilar: ${stats?.followers_count ?? "noma'lum"}
Postlar soni: ${stats?.media_count ?? "noma'lum"}

ENG YAXSHI NATIJALI POSTLARIM (like/komment bo'yicha):
${topPosts || "(ma'lumot yo'q)"}

ENG PAST NATIJALI POSTLARIM:
${worstPosts || "(ma'lumot yo'q)"}

RAQOBATCHILAR:
${competitorSummary || "(qo'shilmagan)"}`;
}
