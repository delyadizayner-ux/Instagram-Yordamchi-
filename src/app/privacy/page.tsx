export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-12 prose prose-sm">
        <h1 className="text-2xl font-semibold mb-2">Maxfiylik siyosati</h1>
        <p className="text-sm text-gray-500 mb-8">Instagram Yordamchi</p>

        <div className="space-y-5 text-sm leading-relaxed text-gray-700">
          <p>
            "Instagram Yordamchi" — bu Instagram Business akkauntiga kelgan kommentlar va
            to'g'ridan-to'g'ri xabarlarni (DM) o'qib, oldindan belgilangan qoidalar asosida
            avtomatik javob yuboruvchi shaxsiy avtomatika vositasidir. Bu sahifa dastur qanday
            ma'lumot bilan ishlashini tushuntiradi.
          </p>

          <h2 className="text-base font-semibold mt-6">Qanday ma'lumotlar qayta ishlanadi</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ulangan Instagram Business akkauntining username va ID raqami</li>
            <li>Kommentlar va DM xabarlarining matni (avtomatik qoidaga moslashtirish uchun)</li>
            <li>Xabar yuborgan foydalanuvchining Instagram ID/username'i va obuna holati</li>
            <li>Instagram Access Token — shifrlangan holda (AES-256-GCM) saqlanadi</li>
          </ul>

          <h2 className="text-base font-semibold mt-6">Ma'lumotlar qanday ishlatiladi</h2>
          <p>
            Yuqoridagi ma'lumotlar faqat quyidagi maqsadda ishlatiladi: kelgan komment/DM'ni
            oldindan sozlangan kalit so'zlarga moslashtirish, yuboruvchining obuna holatini
            tekshirish, va mos javobni (matn, havola yoki media) avtomatik yuborish. Ma'lumotlar
            uchinchi shaxslarga sotilmaydi yoki reklama maqsadida ishlatilmaydi.
          </p>

          <h2 className="text-base font-semibold mt-6">Ma'lumotlarni saqlash</h2>
          <p>
            Ma'lumotlar Supabase (Postgres) bazasida saqlanadi, faqat akkaunt egasi (autentifikatsiya
            orqali) o'z ma'lumotlariga kira oladi (Row Level Security orqali himoyalangan). Access
            token'lar shifrlangan holda saqlanadi.
          </p>

          <h2 className="text-base font-semibold mt-6">Ma'lumotlarni o'chirish</h2>
          <p>
            Akkauntingizni istalgan vaqtda Sozlamalar sahifasidan uzishingiz mumkin — bu bilan
            token va unga bog'liq qoidalar bazadan o'chiriladi.
          </p>

          <h2 className="text-base font-semibold mt-6">Bog'lanish</h2>
          <p>Savollar bo'yicha ilova egasiga to'g'ridan-to'g'ri murojaat qiling.</p>
        </div>
      </main>
    </div>
  );
}
