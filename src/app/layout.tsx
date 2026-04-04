import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { getSiteAnnouncements } from "@/lib/content-data";
import { getCurrentDisplayLocale, getCurrentLocale, getIntlLocale } from "@/lib/i18n";
import { getSessionContext } from "@/lib/session";

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Signal Nine Sports",
    template: "%s | Signal Nine Sports",
  },
  description:
    "A sports data MVP covering live scores, statistics, member plans, AI picks, and admin operations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const [{ session, entitlements }, announcements] = await Promise.all([
    getSessionContext(),
    getSiteAnnouncements(locale),
  ]);

  return (
    <html
      lang={getIntlLocale(displayLocale)}
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteShell
          displayLocale={displayLocale}
          locale={locale}
          session={session}
          entitlements={entitlements}
          announcements={announcements}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
