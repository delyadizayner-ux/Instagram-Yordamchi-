"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { buildChannelContext } from "@/lib/ai/context";
import { generateStrategyContent } from "@/lib/ai/gemini";

export async function addCompetitor(formData: FormData) {
  const supabase = createClient();
  const accountId = String(formData.get("accountId") || "");
  const username = String(formData.get("username") || "")
    .trim()
    .replace(/^@/, "");
  if (username) {
    await supabase.from("competitors").insert({ account_id: accountId, username });
  }
  redirect("/strategy");
}

export async function removeCompetitor(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("competitors").delete().eq("id", id);
  redirect("/strategy");
}

export async function generateReport(formData: FormData) {
  const accountId = String(formData.get("accountId") || "");
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
  if (!account) redirect("/strategy");

  const { data: competitors } = await supabase
    .from("competitors")
    .select("username")
    .eq("account_id", accountId);

  const accessToken = decryptToken(account!.access_token);
  const context = await buildChannelContext(
    account!,
    accessToken,
    (competitors || []).map((c) => c.username)
  );

  const prompt = `Sen 15 yillik tajribaga ega professional Instagram SMM strategisan. O'zbek tilida, aniq va amaliy javob ber, umumiy gaplardan qoch.

${context}

Quyidagi tuzilishda javob ber (sarlavhalarni saqla):

1. UMUMIY TAHLIL — hozirgi holat, kuchli/zaif tomonlar
2. RAQOBATCHILARGA NISBATAN — nimada ortda qolyapmiz, nimada ustunmiz (agar raqobatchi bo'lmasa, shu bo'limni umumiy bozor tendensiyasi asosida yoz)
3. KONTENT-PLAN — keyingi 7 kunlik post/reels mavzulari ro'yxati (kun-kunga)
4. TREND G'OYALAR — hozirgi Instagram trendlariga mos 3-5 ta video g'oya (qanday suratga olish/montaj qilish kerakligi bilan)
5. ANIQ TAVSIYALAR — o'sishni tezlashtirish uchun 3 ta amaliy qadam`;

  let content: string;
  try {
    content = await generateStrategyContent(prompt);
  } catch (err) {
    redirect("/strategy?error=" + encodeURIComponent(err instanceof Error ? err.message : "AI xatosi"));
  }

  await supabase.from("strategy_reports").insert({ account_id: accountId, content });

  redirect("/strategy");
}
