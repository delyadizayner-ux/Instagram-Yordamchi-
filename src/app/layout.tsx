import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Yordamchi",
  description: "Instagram komment/DM avtomatikasi — obuna tekshiruvi bilan tayyor xabar yuborish",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
