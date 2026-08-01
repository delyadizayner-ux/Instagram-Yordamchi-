"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { buildChannelContext } from "@/lib/ai/context";
import { generateStrategyContent } from "@/lib/ai/gemini";

const SYSTEM_PERSONA = `Sen 15 yillik tajribaga ega professional Instagram SMM ekspertisan. Foydalanuvchi
bilan o'zbek tilida, do'stona lekin professional tarzda suhbatlashasan. Javoblaring aniq, amaliy va
qisqa bo'lsin — umumiy, mavhum gaplardan qoch, real raqamlar va misollarga tayan. Kerak bo'lsa
ro'yxat/qadamlar shaklida yoz.`;

async function runFirstAnalysis(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
  context: string
) {
  const prompt = `${SYSTEM_PERSONA}

Quyida foydalanuvchining Instagram kanali haqida ma'lumot berilgan. Shu asosida UNGA BIRINCHI MAROTABA
murojaat qilyapsan — kanalni tahlil qilib, samimiy va aniq xulosa ber:

${context}

Javobingda albatta shu tuzilishga amal qil:
1. **Yaxshi tomonlar** — nima to'g'ri ketyapti (2-3 band)
2. **Kamchiliklar** — nimalar sust, nima yetishmayapti (2-3 band)
3. **Birinchi navbatda nima qilish kerak** — 3 ta eng muhim, tezkor qadam

Oxirida savol ber: "Yana qaysi mavzu bo'yicha chuqurroq gaplashamiz?"`;

  const reply = await generateStrategyContent(prompt);
  await admin.from("chat_messages").insert({ account_id: accountId, role: "assistant", content: reply });
}

export async function sendChatMessage(formData: FormData) {
  const accountId = String(formData.get("accountId") || "");
  const text = String(formData.get("message") || "").trim();
  if (!text) redirect("/chat");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!account) redirect("/chat");

  await supabase.from("chat_messages").insert({ account_id: accountId, role: "user", content: text });

  const { data: competitors } = await supabase
    .from("competitors")
    .select("username")
    .eq("account_id", accountId);

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true })
    .limit(20);

  try {
    const accessToken = decryptToken(account!.access_token);
    const context = await buildChannelContext(
      account!,
      accessToken,
      (competitors || []).map((c) => c.username)
    );

    const conversation = (history || [])
      .map((m) => `${m.role === "user" ? "FOYDALANUVCHI" : "SEN"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${SYSTEM_PERSONA}

KANAL MA'LUMOTLARI:
${context}

SUHBAT TARIXI:
${conversation}

Yuqoridagi suhbatni davom ettir — foydalanuvchining oxirgi xabariga javob ber.`;

    const reply = await generateStrategyContent(prompt);
    await supabase.from("chat_messages").insert({ account_id: accountId, role: "assistant", content: reply });
  } catch (err) {
    await supabase.from("chat_messages").insert({
      account_id: accountId,
      role: "assistant",
      content: `⚠️ Xatolik: ${err instanceof Error ? err.message : "AI javob berolmadi"}`,
    });
  }

  redirect("/chat");
}

// Sahifa birinchi marta ochilganda (hali xabar yo'q) avtomatik tahlil boshlash uchun.
export async function ensureFirstAnalysis(accountId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (count && count > 0) return;

  const supabase = createClient();
  const { data: account } = await supabase.from("ig_accounts").select("*").eq("id", accountId).maybeSingle();
  if (!account) return;

  const { data: competitors } = await supabase
    .from("competitors")
    .select("username")
    .eq("account_id", accountId);

  try {
    const accessToken = decryptToken(account.access_token);
    const context = await buildChannelContext(
      account,
      accessToken,
      (competitors || []).map((c) => c.username)
    );
    await runFirstAnalysis(admin, accountId, context);
  } catch (err) {
    await admin.from("chat_messages").insert({
      account_id: accountId,
      role: "assistant",
      content: `⚠️ Tahlil boshlanmadi: ${err instanceof Error ? err.message : "xatolik"}`,
    });
  }
}
