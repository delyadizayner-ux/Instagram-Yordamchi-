import crypto from "crypto";
import type { IgUserProfile, IgMediaItem } from "./types";

// Instagram API with Instagram Login (graph.instagram.com) — Facebook Graph API EMAS.
// Hujjat: https://developers.facebook.com/docs/instagram-platform
const API_BASE = "https://graph.instagram.com/v21.0";

export class InstagramApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = "InstagramApiError";
  }
}

async function igFetch(path: string, accessToken: string, init?: RequestInit) {
  const url = new URL(`${API_BASE}${path}`);
  if (!init?.method || init.method === "GET") {
    url.searchParams.set("access_token", accessToken);
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new InstagramApiError(
      (body as any)?.error?.message || `Instagram API xatosi (${res.status})`,
      res.status,
      body
    );
  }
  return body;
}

// Bog'langan token qaysi akkauntga tegishli ekanligini tekshirish (Settings sahifasida "Ulash" tugmasi bosilganda).
export async function getMe(accessToken: string): Promise<{ user_id: string; username: string }> {
  return igFetch(
    `/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`,
    accessToken
  );
}

// Akkaunt darajasidagi asosiy statistika (obunachilar, post soni) — instagram_business_basic
// ruxsati bilan ochiq, alohida instagram_manage_insights talab qilmaydi.
export async function getAccountStats(
  igUserId: string,
  accessToken: string
): Promise<{ followers_count: number; media_count: number; profile_picture_url?: string }> {
  return igFetch(
    `/${igUserId}?fields=followers_count,media_count,profile_picture_url&access_token=${encodeURIComponent(
      accessToken
    )}`,
    accessToken
  );
}

// Akkauntning postlari (Reels/Feed) ro'yxati — har biriga alohida DM/komment
// qoidasi biriktirish uchun (Relislar sahifasi).
export async function getUserMedia(
  igUserId: string,
  accessToken: string,
  limit = 50
): Promise<IgMediaItem[]> {
  const res = await igFetch(
    `/${igUserId}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,like_count,comments_count,timestamp&limit=${limit}&access_token=${encodeURIComponent(
      accessToken
    )}`,
    accessToken
  );
  return res.data || [];
}

// Komment/DM yuborgan foydalanuvchi obuna bo'lganmi — Instagram Messaging API'ning
// is_user_follow_business maydoni orqali tekshiriladi.
export async function getUserProfile(
  igScopedUserId: string,
  accessToken: string
): Promise<IgUserProfile> {
  return igFetch(
    `/${igScopedUserId}?fields=id,username,is_user_follow_business,is_business_follow_user&access_token=${encodeURIComponent(
      accessToken
    )}`,
    accessToken
  );
}

// DM (Instagram Messaging API) yuborish — komment orqali kelgan foydalanuvchiga ham,
// to'g'ridan-to'g'ri DM yozganlarga ham shu endpoint ishlatiladi.
export async function sendDirectMessage(
  recipientIgId: string,
  text: string,
  accessToken: string
): Promise<void> {
  await igFetch(`/me/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text },
    }),
  });
}

// Video/rasm fayl havolasini DM ichida HAQIQIY media (playable) sifatida yuborish.
// Eslatma: bu faqat to'g'ridan-to'g'ri DM (/me/messages) uchun ishlaydi — kommentga
// private_reply orqali javobda Meta faqat matnni qo'llab-quvvatlaydi (shuning uchun
// komment oqimida havola matn ichida link sifatida yuboriladi, pastga qarang).
export async function sendMediaAttachment(
  recipientIgId: string,
  mediaUrl: string,
  type: "image" | "video",
  accessToken: string
): Promise<void> {
  await igFetch(`/me/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: {
        attachment: { type, payload: { url: mediaUrl, is_reusable: true } },
      },
    }),
  });
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url.trim());
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url.trim());
}

// Kommentga JAVOBAN shaxsiy DM (private reply) — komment ostidan to'g'ridan-to'g'ri
// foydalanuvchi DM'iga tushadi, ManyChat'dagi "komment→DM" funneliga o'xshash.
export async function sendPrivateReplyToComment(
  commentId: string,
  text: string,
  accessToken: string
): Promise<void> {
  await igFetch(`/${commentId}/private_replies`, accessToken, {
    method: "POST",
    body: JSON.stringify({ message: text }),
  });
}

// Kommentga OCHIQ (public) javob — ixtiyoriy, masalan "DM'ga yubordim ✅".
export async function replyToComment(
  commentId: string,
  text: string,
  accessToken: string
): Promise<void> {
  await igFetch(`/${commentId}/replies`, accessToken, {
    method: "POST",
    body: JSON.stringify({ message: text }),
  });
}

// Meta webhook so'rovi imzosini tekshirish (X-Hub-Signature-256).
// META_APP_SECRET sozlangan bo'lsa ishlatiladi — spoofing'dan himoya qiladi.
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  if (!appSecret) return true; // sozlanmagan bo'lsa tekshiruv o'tkazib yuboriladi (ixtiyoriy himoya)
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
