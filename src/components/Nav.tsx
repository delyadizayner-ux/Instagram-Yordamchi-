import Link from "next/link";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/dashboard", label: "Bosh sahifa" },
  { href: "/reels", label: "Relislar" },
  { href: "/rules", label: "Qoidalar" },
  { href: "/analytics", label: "Analitika" },
  { href: "/logs", label: "Loglar" },
  { href: "/settings", label: "Sozlamalar" },
];

export function Nav({ active }: { active: string }) {
  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="font-semibold text-sm">📸 Instagram Yordamchi</div>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm px-3 py-1.5 rounded-lg ${
                active === l.href
                  ? "bg-ig-purple/10 text-ig-purple font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <form action={signOut}>
            <button className="text-sm px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50">
              Chiqish
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
