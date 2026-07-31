import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/instagram/client";
import { processWebhookPayload } from "@/lib/instagram/webhook-handler";
import type { IgWebhookPayload } from "@/lib/instagram/types";

export const dynamic = "force-dynamic";

// Meta webhook tasdiqlash (Meta App → Webhooks sozlashda bir marta chaqiriladi).
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verify token mos kelmadi", { status: 403 });
}

// Real vaqtdagi komment/DM hodisalari shu yerga keladi.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const admin = createAdminClient();

  // VAQTINCHALIK DIAGNOSTIKA: har qanday kelgan so'rovni (mos kelmasa ham) yozib boradi.
  // Muammo hal bo'lgach bu blok va webhook_debug_log jadvali olib tashlanadi.
  try {
    await admin.from("webhook_debug_log").insert({
      payload: {
        headers: Object.fromEntries(req.headers.entries()),
        body: (() => {
          try {
            return JSON.parse(rawBody);
          } catch {
            return rawBody;
          }
        })(),
      },
    });
  } catch (err) {
    console.error("[ig-webhook] debug-log xatosi:", err);
  }

  const signature = req.headers.get("x-hub-signature-256");
  const isValid = verifyWebhookSignature(rawBody, signature, process.env.META_APP_SECRET);
  if (!isValid) {
    return new NextResponse("Imzo tekshiruvidan o'tmadi", { status: 401 });
  }

  let payload: IgWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Yaroqsiz JSON", { status: 400 });
  }

  // MUHIM: Vercel serverless funksiyasi javob qaytargandan keyin to'xtatilishi mumkin,
  // shuning uchun qayta ishlashni "fire-and-forget" qilmasdan to'liq kutamiz (odatda <2s).
  try {
    await processWebhookPayload(payload, admin);
  } catch (err) {
    console.error("[ig-webhook] processing xatosi:", err);
    // Baribir 200 qaytariladi — aks holda Meta bir xil hodisani qayta-qayta yuboraveradi.
  }

  return NextResponse.json({ received: true });
}
