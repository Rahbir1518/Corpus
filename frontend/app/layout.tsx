import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "500"],
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Corpus — Portable memory for every AI",
  description:
    "Corpus gives your AI a portable memory — one small file any model can read — so it never re-learns your work, and you stop paying to re-explain yourself.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
