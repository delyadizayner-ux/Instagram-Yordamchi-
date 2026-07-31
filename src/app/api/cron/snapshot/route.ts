import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { getAccountStats } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Har kuni ishga tushadi (vercel.json crons) — har bir ulangan akkaunt uchun
// obunachilar sonini "suratga oladi", Analitika sahifasidagi o'sish grafigi shu asosda chiziladi.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: accounts } = await admin.from("ig_accounts").select("*").eq("is_active", true);

  const results: { account: string; ok: boolean; error?: string }[] = [];

  for (const account of accounts || []) {
    try {
      const accessToken = decryptToken(account.access_token);
      const stats = await getAccountStats(account.ig_user_id, accessToken);
      await admin.from("follower_snapshots").insert({
        account_id: account.id,
        followers_count: stats.followers_count,
        media_count: stats.media_count,
      });
      results.push({ account: account.username || account.ig_user_id, ok: true });
    } catch (err) {
      results.push({
        account: account.username || account.ig_user_id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
