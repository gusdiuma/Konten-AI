import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { getServerLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/common/locale-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Creative Studio",
  description:
    "Multi-tenant SaaS platform for generating Brand DNA-consistent Instagram carousels with an editable Konva canvas and PNG/JPG/PDF export.",
  openGraph: {
    title: "AI Creative Studio",
    description:
      "Multi-tenant SaaS platform for generating Brand DNA-consistent Instagram carousels with an editable Konva canvas and PNG/JPG/PDF export.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FAFAFA] text-slate-900 antialiased"
      >
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
