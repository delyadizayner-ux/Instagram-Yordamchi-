import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto";
import {
  getUserProfile,
  sendDirectMessage,
  sendMediaAttachment,
  isVideoUrl,
  isImageUrl,
  sendPrivateReplyToComment,
  replyToComment,
} from "./client";
import type {
  AutomationRule,
  IgAccountRow,
  IgChangeItem,
  IgMessagingItem,
  IgWebhookPayload,
} from "./types";

function matchesKeyword(rule: AutomationRule, text: string): boolean {
  if (!rule.keyword || !rule.keyword.trim()) return true; // kalit so'zsiz qoida = hammasiga javob
  const needle = rule.keyword.trim().toLowerCase();
  const haystack = text.trim().toLowerCase();
  return rule.match_type === "exact" ? haystack === needle : haystack.includes(needle);
}

function pickMatchingRule(rules: AutomationRule[], text: string, postId?: string): AutomationRule | null {
  // Aniq kalit so'zli qoidalar avval tekshiriladi, keyin "hammasiga javob" (keyword=null) qoidalar.
  const sorted = [...rules].sort((a, b) => Number(!!b.keyword) - Number(!!a.keyword));
  for (const rule of sorted) {
    if (rule.post_id && postId && rule.post_id !== postId) continue;
    if (matchesKeyword(rule, text)) return rule;
  }
  return null;
}

async function alreadyProcessed(admin: SupabaseClient, eventKey: string): Promise<boolean> {
  const { error } = await admin.from("processed_events").insert({ event_key: eventKey });
  // unique constraint xatosi = avval qayta ishlangan
  return !!error;
}

async function logMessage(
  admin: SupabaseClient,
  row: {
    account_id: string;
    rule_id: string | null;
    trigger_type: string;
    sender_ig_id?: string;
    sender_username?: string;
    was_follower?: boolean | null;
    action: string;
    detail?: string;
  }
) {
  await admin.from("message_logs").insert(row);
}

async function getRulesForAccount(
  admin: SupabaseClient,
  accountId: string,
  trigger: "comment" | "dm"
): Promise<AutomationRule[]> {
  const { data } = await admin
    .from("automation_rules")
    .select("*")
    .eq("account_id", accountId)
    .eq("enabled", true)
    .in("trigger_type", [trigger, "both"]);
  return (data as AutomationRule[]) || [];
}

async function handleCommentEvent(
  admin: SupabaseClient,
  account: IgAccountRow,
  accessToken: string,
  change: IgChangeItem
) {
  const value = change.value;
  if (!value?.id || !value.from?.id || !value.text) return;
  if (value.from.id === account.ig_user_id) return; // o'z akkauntimizning kommentini e'tiborsiz qoldiramiz

  const eventKey = `comment:${value.id}`;
  if (await alreadyProcessed(admin, eventKey)) return;

  const rules = await getRulesForAccount(admin, account.id, "comment");
  const rule = pickMatchingRule(rules, value.text, value.media?.id);
  if (!rule) return;

  try {
    let isFollower = true;
    if (rule.require_follow) {
      const profile = await getUserProfile(value.from.id, accessToken);
      isFollower = !!profile.is_user_follow_business;
    }

    const replyText = isFollower ? rule.follow_reply_text : rule.not_follow_reply_text;
    const finalText = isFollower && rule.media_url ? `${replyText}\n\n${rule.media_url}` : replyText;

    await sendPrivateReplyToComment(value.id, finalText, accessToken);

    if (rule.comment_ack_text) {
      await replyToComment(value.id, rule.comment_ack_text, accessToken);
    }

    await logMessage(admin, {
      account_id: account.id,
      rule_id: rule.id,
      trigger_type: "comment",
      sender_ig_id: value.from.id,
      sender_username: value.from.username,
      was_follower: isFollower,
      action: isFollower ? "sent_dm" : "sent_follow_prompt",
    });
  } catch (err) {
    await logMessage(admin, {
      account_id: account.id,
      rule_id: rule.id,
      trigger_type: "comment",
      sender_ig_id: value.from.id,
      sender_username: value.from.username,
      action: "error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleMessagingEvent(
  admin: SupabaseClient,
  account: IgAccountRow,
  accessToken: string,
  item: IgMessagingItem
) {
  if (item.message?.is_echo) return; // o'zimiz yuborgan xabar (webhook orqali qaytib keladi)
  if (!item.message?.text) return; // rasm/ovoz — matn yo'q, hozircha e'tiborsiz
  if (item.sender.id === account.ig_user_id) return;

  const eventKey = `message:${item.message.mid}`;
  if (await alreadyProcessed(admin, eventKey)) return;

  const rules = await getRulesForAccount(admin, account.id, "dm");
  const rule = pickMatchingRule(rules, item.message.text);
  if (!rule) return;

  try {
    let isFollower = true;
    if (rule.require_follow) {
      const profile = await getUserProfile(item.sender.id, accessToken);
      isFollower = !!profile.is_user_follow_business;
    }

    const replyText = isFollower ? rule.follow_reply_text : rule.not_follow_reply_text;
    const media = isFollower ? rule.media_url : null;
    const isPlayableMedia = !!media && (isVideoUrl(media) || isImageUrl(media));

    // PDF/boshqa havolalar matn ichida link sifatida, video/rasm esa haqiqiy media sifatida yuboriladi.
    const finalText = media && !isPlayableMedia ? `${replyText}\n\n${media}` : replyText;
    await sendDirectMessage(item.sender.id, finalText, accessToken);

    if (media && isPlayableMedia) {
      await sendMediaAttachment(item.sender.id, media, isVideoUrl(media) ? "video" : "image", accessToken);
    }

    await logMessage(admin, {
      account_id: account.id,
      rule_id: rule.id,
      trigger_type: "dm",
      sender_ig_id: item.sender.id,
      was_follower: isFollower,
      action: isFollower ? "sent_dm" : "sent_follow_prompt",
    });
  } catch (err) {
    await logMessage(admin, {
      account_id: account.id,
      rule_id: rule.id,
      trigger_type: "dm",
      sender_ig_id: item.sender.id,
      action: "error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function processWebhookPayload(payload: IgWebhookPayload, admin: SupabaseClient) {
  if (payload.object !== "instagram") return;

  for (const entry of payload.entry || []) {
    const { data: account } = await admin
      .from("ig_accounts")
      .select("*")
      .eq("ig_user_id", entry.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!account) continue; // bu akkaunt tizimga ulanmagan — e'tiborsiz qoldiriladi

    const accessToken = decryptToken((account as IgAccountRow).access_token);

    for (const change of entry.changes || []) {
      if (change.field === "comments") {
        await handleCommentEvent(admin, account as IgAccountRow, accessToken, change);
      }
    }

    for (const item of entry.messaging || []) {
      await handleMessagingEvent(admin, account as IgAccountRow, accessToken, item);
    }
  }
}
