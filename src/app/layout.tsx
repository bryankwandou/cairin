import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cairin.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cairin — cairkan kripto jadi rupiah",
    template: "%s · Cairin",
  },
  description:
    "Bakar IDRX di jaringan Base, rupiahnya masuk ke rekening atau e-wallet mana pun. Satu kali menunggu, biaya tetap Rp5.000, tanpa menahan dana Anda.",
  keywords: [
    "cairkan kripto",
    "IDRX",
    "Base",
    "rupiah",
    "pencairan",
    "e-wallet",
    "QRIS",
  ],
  authors: [{ name: "Cairin" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Cairin",
    title: "Cairin — cairkan kripto jadi rupiah",
    description:
      "Bakar IDRX di Base, rupiahnya masuk ke rekening atau e-wallet mana pun. Satu kali menunggu, biaya tetap Rp5.000.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cairin — cairkan kripto jadi rupiah",
    description:
      "Bakar IDRX di Base, rupiahnya masuk ke rekening atau e-wallet mana pun.",
  },
  icons: {
    icon: [{ url: "/brand/cairin-mark.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
