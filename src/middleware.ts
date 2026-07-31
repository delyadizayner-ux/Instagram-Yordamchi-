import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // /api/instagram/webhook Meta tomonidan chaqiriladi — sessiya tekshiruvi shart emas,
    // shuning uchun butun /api shoxobchasi middleware'dan chetlab o'tiladi (route.ts ichida allaqachon hisobga olingan).
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
