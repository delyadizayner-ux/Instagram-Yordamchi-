# 📸 Instagram Yordamchi

Instagram sahifangizga tushgan **komment** va **DM (direct)** xabarlarni real vaqtda o'qib,
yuboruvchi obuna bo'lgan-bo'lmaganini tekshirib, oldindan tayyorlangan xabarni (matn/havola)
avtomatik yuboruvchi tizim. To'liq serverless — Vercel'da 24/7 ishlaydi (polling emas, Meta
webhook orqali "push" qiladi).

## Qanday ishlaydi

```
Instagram foydalanuvchisi           Meta                 Sizning tizim (Vercel)
      │  komment yozadi yoki DM        │                         │
      │────────────────────────────────▶  webhook POST           │
      │                                 ────────────────────────▶│ /api/instagram/webhook
      │                                                           │ 1) kalit so'zga mos qoidani topadi
      │                                                           │ 2) obunani tekshiradi (Instagram API)
      │                                                           │ 3) tayyor javobni DM orqali yuboradi
      │◀──────────────────────────────────────────────────────────│
```

Bot polling qilmaydi (doim ishlab, resurs sarflab o'tirmaydi) — Meta o'zi hodisa yuz berganda
webhook'ni chaqiradi, Vercel funksiyasi uyg'onib javob beradi. Shu sabab "24/7" uchun alohida
server kerak emas, Vercel Hobby rejasi ham yetarli.

## Arxitektura / papka tuzilishi

```
Instagram-Yordamchi/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Landing sahifa
│   │   ├── layout.tsx                   # Root layout
│   │   ├── login/                       # Kirish/ro'yxatdan o'tish
│   │   ├── dashboard/                   # Statistika (ulangan akkaunt, faol qoidalar, so'nggi 24soat)
│   │   ├── settings/                    # Instagram akkaunt ulash + webhook ma'lumotlari
│   │   ├── rules/                       # Avtomatika qoidalari (kalit so'z → javob)
│   │   ├── logs/                        # Yuborilgan xabarlar tarixi
│   │   └── api/
│   │       └── instagram/webhook/       # Meta webhook endpoint (GET verify, POST hodisalar)
│   ├── lib/
│   │   ├── instagram/
│   │   │   ├── client.ts                # graph.instagram.com API wrapper
│   │   │   ├── webhook-handler.ts       # Biznes logika: qoida moslash → obuna tekshirish → yuborish
│   │   │   └── types.ts
│   │   ├── supabase/                    # server/client/admin/middleware Supabase clientlar
│   │   └── crypto.ts                    # Access tokenlarni AES-256-GCM bilan shifrlash
│   └── middleware.ts                    # Auth himoyasi (sessiya bo'lmasa /login'ga)
├── supabase/migrations/0001_init.sql    # Butun DB sxema (RLS bilan)
├── vercel.json                          # Webhook funksiyasi uchun maxDuration
└── .env.example
```

**Ma'lumotlar bazasi (Supabase / Postgres):**
- `ig_accounts` — ulangan Instagram Business akkauntlar (token shifrlangan holda)
- `automation_rules` — har bir qoida: qayerda (komment/DM), qanday kalit so'z, obuna talabmi, javob matni
- `message_logs` — har bir yuborilgan/o'tkazib yuborilgan hodisa tarixi
- `processed_events` — Meta webhook'ni ikki marta yubormasligi uchun himoya (idempotency)

---

## 1-qadam — Supabase loyihasi

1. https://supabase.com → New Project → nom bering (masalan `instagram-yordamchi`), hudud
   sifatida imkon qadar O'zbekistonga yaqinini tanlang (masalan Singapur/Mumbai).
2. Loyiha tayyor bo'lgach: **SQL Editor** → yangi query → `supabase/migrations/0001_init.sql`
   faylining butun mazmunini joylashtiring → **Run**.
3. **Project Settings → API** bo'limidan quyidagilarni ko'chirib oling:
   - `Project URL` → `.env` dagi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` kalit → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` kalit (⚠️ maxfiy, hech qachon frontendga chiqarilmaydi) → `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication → Providers → Email** yoqilganligiga ishonch hosil qiling (odatda default
   yoqilgan). Tezroq test qilish uchun **Authentication → Settings → "Confirm email"** ni
   vaqtincha o'chirib qo'yishingiz mumkin (aks holda ro'yxatdan o'tgach emailni tasdiqlash kerak
   bo'ladi).

## 2-qadam — Meta App va Instagram akkauntni ulash

Bu qism eng muhim qism — yangi Instagram akkauntingizni tizimga ulash uchun.

### 2.1 Instagram akkauntni Business/Creator turiga o'tkazish

Instagram ilovasi → Profil → ☰ Menyu → **Sozlamalar va maxfiylik → Akkaunt turi va vositalar
→ Professional akkauntga o'tish** → **Biznes** turini tanlang. (Agar akkaunt allaqachon
Biznes/Creator bo'lsa, bu qadamni o'tkazib yuboring.)

### 2.2 Meta App yaratish

1. https://developers.facebook.com → yuqori o'ngda **Mening ilovalarim → Ilova yaratish**.
2. Ilova nomini kiriting (masalan "Instagram Yordamchi"), aloqa emailingizni tasdiqlang.
3. Ilova turi so'ralganda **Boshqa (Other)** → **Biznes (Business)** ni tanlang.
4. Ilova paneli ochilgach, chap menyudan **"Add Product"** (Mahsulot qo'shish) tugmasini toping
   va **Instagram** mahsulotini qidirib **Set up** bosing.

### 2.3 Instagram Business Login orqali token olish

1. Instagram mahsuloti sahifasida **"Instagram Business Login"** bo'limiga o'ting.
2. **"Add Instagram Business Account"** yoki **"Generate Token"** tugmasi orqali o'zingizning
   Instagram akkauntingizni tizimga kiritib, ruxsat berasiz (browser'da IG login oynasi ochiladi).
3. Ruxsatlar (Permissions) so'ralganda quyidagilarni yoqing:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - `instagram_business_manage_comments`
4. Muvaffaqiyatli bo'lgach sizga **qisqa muddatli (short-lived, 1 soatlik) token** beriladi.

> **Eslatma:** Shaxsiy foydalanish uchun (faqat o'zingizning akkauntingiz bilan) Meta App
> **Development** rejimida qolishi mumkin — App Review shart emas. App Review faqat siz bu
> tizimni BOSHQA odamlarning Instagram akkauntlariga ham ulanadigan xizmat sifatida (masalan
> SaaS) taqdim qilmoqchi bo'lsangiz kerak bo'ladi. Sizning postingizga komment qoldiradigan yoki
> DM yozadigan **oddiy tomoshabinlar** uchun review talab qilinmaydi — chunki webhook faqat
> SIZNING (Development rejimidagi ilova admini) akkauntingizga kelgan xabarlarni tinglaydi.

### 2.4 Tokenni uzoq muddatliga (60 kun) almashtirish

Terminalda (yoki brauzer manzil satrida) quyidagi so'rovni yuboring:

```
https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret=<META_APP_SECRET>
  &access_token=<QISQA_MUDDATLI_TOKEN>
```

Javobda kelgan `access_token` — 60 kunlik uzoq muddatli token. Shu tokenni saqlab qo'ying,
u ilova Sozlamalar sahifasiga kiritiladi (4-qadamga qarang).

> ⚠️ Token 60 kunda tugaydi. Amal qilish muddati tugashiga yaqinda xuddi shu tokenni
> `grant_type=ig_refresh_token` bilan yangilash kerak bo'ladi (hozircha qo'lda; kelajakda
> avtomatik cron qo'shilishi mumkin).

### 2.5 App Secret'ni topish

**App paneli → Settings → Basic** — shu yerda `App ID` va `App Secret` ko'rinadi. `App Secret`
qiymati `.env` dagi `META_APP_SECRET` (webhook imzosini tekshirish uchun, xavfsizlikni oshiradi).

---

## 3-qadam — Loyihani lokal ishga tushirish

```bash
npm install
cp .env.example .env.local
```

`.env.local` faylini to'ldiring:
- Supabase 3 ta qiymat (1-qadam)
- `META_APP_SECRET` (2.5-qadam)
- `APP_ENCRYPTION_KEY` — yaratish: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `IG_WEBHOOK_VERIFY_TOKEN` — o'zingiz o'ylab topgan istalgan maxfiy so'z (masalan
  `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)
- `CRON_SECRET` — hozircha ishlatilmaydi, kelajakdagi cron endpointlar uchun zaxira

```bash
npm run dev
```

`http://localhost:3000` da ochiladi. `/login` orqali ro'yxatdan o'ting (birinchi foydalanuvchi
— siz, admin bo'lasiz).

---

## 4-qadam — GitHub'ga joylash

```bash
git init
git add .
git commit -m "Instagram Yordamchi — boshlang'ich versiya"
```

GitHub'da yangi bo'sh repo yarating (masalan `instagram-yordamchi`), so'ng:

```bash
git remote add origin https://github.com/<username>/instagram-yordamchi.git
git branch -M main
git push -u origin main
```

## 5-qadam — Vercel'ga deploy

1. https://vercel.com → **Add New → Project** → yuqoridagi GitHub repo'ni tanlang → **Import**.
2. **Environment Variables** bo'limida `.env.local` dagi barcha qiymatlarni bittalab qo'shing
   (Production + Preview muhitlari uchun).
3. **Deploy** tugmasini bosing. Bir necha daqiqada `https://instagram-yordamchi-xxxx.vercel.app`
   manzili tayyor bo'ladi.
4. (Ixtiyoriy) O'zingizning domeningizni ulashingiz mumkin — Meta webhook uchun HTTPS manzil
   shart, Vercel avtomatik SSL beradi.

## 6-qadam — Webhookni Meta App'da faollashtirish

1. Meta App paneli → **Instagram → Webhooks** (yoki chap menyudagi **Webhooks**).
2. **Callback URL:** `https://<vercel-domeningiz>/api/instagram/webhook`
3. **Verify Token:** `.env` dagi `IG_WEBHOOK_VERIFY_TOKEN` bilan bir xil qiymat.
4. **Verify and Save** tugmasini bosing (agar to'g'ri sozlangan bo'lsa, darhol tasdiqlanadi).
5. **Subscribe** ro'yxatidan `messages` va `comments` fieldlarini yoqing.

## 7-qadam — Ilovada akkauntni ulash va qoida yaratish

1. Deploy qilingan sayt → `/login` → kiring.
2. **Sozlamalar** sahifasida 2.4-qadamda olgan uzoq muddatli tokenni joylashtiring → **Ulash**.
   Tizim avtomatik ravishda akkaunt ID va username'ni tekshirib oladi.
3. **Qoidalar** sahifasida birinchi qoidangizni yarating: masalan kalit so'z `"PDF"`, "Obuna
   bo'lganlarga javob" maydoniga tayyor xabar/havola, "Obuna bo'lmaganlarga javob" maydoniga
   avval obuna bo'lishni so'ragan matn.
4. Test qiling: boshqa (yoki test) akkauntdan sahifangizga shu kalit so'z bilan komment yozing
   yoki DM yuboring — bir necha soniya ichida javob kelishi kerak. **Loglar** sahifasida
   natijani ko'rasiz.

---

## Muhim cheklovlar va eslatmalar

- Instagram token **60 kunda** tugaydi — muddati tugashidan oldin qayta almashtirib, Sozlamalar
  sahifasida qayta kiritish kerak.
- "Private reply" (kommentga shaxsiy DM) faqat **kommentdan keyingi 7 kun ichida** yuborilishi
  mumkin — bu Meta'ning o'z cheklovi.
- Bitta foydalanuvchiga bir xil qoidadan navbatdagi xabar cheksiz yuborilaveradi (spam cheklovi
  hozircha yo'q) — agar kerak bo'lsa, `message_logs` asosida "oxirgi 24 soatda yuborilganmi"
  tekshiruvi keyingi bosqichda qo'shilishi mumkin.
- Rasm/ovoz xabarlar (matnsiz DM) hozircha e'tiborsiz qoldiriladi — faqat matnli komment/DM
  ishlanadi.
- `npm audit` ikkita "high" darajali ogohlantirish ko'rsatadi (Next.js 14 → 16'ga o'tishni talab
  qiladi, breaking change) — hozircha xavf past (rewrites va custom server ishlatilmaydi), lekin
  vaqti kelib Next.js 15/16'ga yangilash tavsiya etiladi.
