"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveRule(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");

  const row = {
    account_id: String(formData.get("accountId") || ""),
    name: String(formData.get("name") || "Yangi qoida"),
    trigger_type: String(formData.get("triggerType") || "both"),
    keyword: String(formData.get("keyword") || "").trim() || null,
    match_type: String(formData.get("matchType") || "contains"),
    require_follow: formData.get("requireFollow") === "on",
    follow_reply_text: String(formData.get("followReplyText") || ""),
    not_follow_reply_text: String(formData.get("notFollowReplyText") || ""),
    comment_ack_text: String(formData.get("commentAckText") || "").trim() || null,
    media_url: String(formData.get("mediaUrl") || "").trim() || null,
    enabled: true,
  };

  if (id) {
    await supabase.from("automation_rules").update(row).eq("id", id);
  } else {
    await supabase.from("automation_rules").insert(row);
  }

  redirect("/rules");
}

export async function toggleRule(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const enabled = formData.get("enabled") === "true";
  await supabase.from("automation_rules").update({ enabled: !enabled }).eq("id", id);
  redirect("/rules");
}

export async function deleteRule(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("automation_rules").delete().eq("id", id);
  redirect("/rules");
}
