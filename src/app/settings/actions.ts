"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import { getMe, subscribeAccountToWebhooks, InstagramApiError } from "@/lib/instagram/client";

export async function connectInstagramAccount(formData: FormData) {
  const accessToken = String(formData.get("accessToken") || "").trim();
  if (!accessToken) redirect("/settings?error=" + encodeURIComponent("Token kiritilmadi."));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const me = await getMe(accessToken);

    const { error } = await supabase.from("ig_accounts").upsert(
      {
        user_id: user!.id,
        ig_user_id: me.user_id,
        username: me.username,
        access_token: encryptToken(accessToken),
        is_active: true,
      },
      { onConflict: "user_id,ig_user_id" }
    );

    if (error) redirect("/settings?error=" + encodeURIComponent(error.message));

    // MUHIM: shu qadam bo'lmasa, akkaunt ulangan bo'lsa ham haqiqiy komment/DM
    // hodisalari webhook'ga kelmaydi (faqat Meta'ning sinov signali keladi).
    try {
      await subscribeAccountToWebhooks(me.user_id, accessToken);
    } catch (subErr) {
      console.error("[settings] webhook obunasi xatosi:", subErr);
    }
  } catch (err) {
    if (err instanceof InstagramApiError) {
      redirect("/settings?error=" + encodeURIComponent(`Instagram tokeni tekshirilmadi: ${err.message}`));
    }
    redirect("/settings?error=" + encodeURIComponent(err instanceof Error ? err.message : "Noma'lum xatolik"));
  }

  redirect("/settings?success=1");
}

export async function disconnectInstagramAccount(formData: FormData) {
  const accountId = String(formData.get("accountId") || "");
  const supabase = createClient();
  await supabase.from("ig_accounts").delete().eq("id", accountId);
  redirect("/settings");
}
