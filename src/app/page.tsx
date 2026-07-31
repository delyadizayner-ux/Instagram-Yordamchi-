import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ig-purple via-ig-pink to-ig-orange p-4">
      <div className="text-center text-white space-y-4">
        <h1 className="text-3xl font-bold">📸 Instagram Yordamchi</h1>
        <p className="text-white/90 max-w-md mx-auto">
          Instagram komment va DM'larni o'qib, obunani tekshirib, tayyor xabarni avtomatik
          yuboruvchi tizim.
        </p>
        <Link
          href="/login"
          className="inline-block bg-white text-ig-purple rounded-lg px-6 py-2.5 font-medium hover:opacity-90"
        >
          Kirish →
        </Link>
      </div>
    </div>
  );
}
