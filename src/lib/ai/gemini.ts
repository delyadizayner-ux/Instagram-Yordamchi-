// Google AI Studio (Gemini) orqali strategik tahlil/kontent-plan generatsiya qilish.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

export async function generateStrategyContent(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY sozlanmagan — Vercel va .env.local'ga qo'shing.");
  }

  const res = await fetch(`${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as any)?.error?.message || `Gemini API xatosi (${res.status})`);
  }

  const text = (body as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
  if (!text) throw new Error("Gemini bo'sh javob qaytardi.");
  return text;
}
