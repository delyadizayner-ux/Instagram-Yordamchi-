import { signIn, signUp } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ig-purple via-ig-pink to-ig-orange p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-1">Instagram Yordamchi</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Komment/DM avtomatikasi boshqaruv paneli
        </p>

        {searchParams.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{searchParams.error}</p>
        )}
        {searchParams.message && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-2 mb-4">
            {searchParams.message}
          </p>
        )}

        <form className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Parol"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2 pt-2">
            <button
              formAction={signIn}
              className="flex-1 bg-ig-purple text-white rounded-lg py-2 text-sm font-medium hover:opacity-90"
            >
              Kirish
            </button>
            <button
              formAction={signUp}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
