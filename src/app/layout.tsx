import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { business } from "@/lib/config";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const body = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(business.siteUrl),
  title: { default: `${business.name} · Turnos`, template: `%s · ${business.name}` },
  description: business.tagline,
  openGraph: { title: business.name, description: business.tagline, type: "website", locale: business.locale },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: `oklch(0.48 ${business.theme.chroma} ${business.theme.hue})`,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Los dos números del tema vienen validados como números en config.ts.
  const themeCss = `:root{--h:${business.theme.hue};--c:${business.theme.chroma};}`;

  return (
    <html lang={business.locale.split("-")[0]} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <style nonce={nonce}>{themeCss}</style>
      </head>
      <body className="min-h-full font-sans text-ink">{children}</body>
    </html>
  );
}
