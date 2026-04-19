import Link from "next/link";
import type { DisplayLocale } from "@/lib/i18n-config";
import { displayLocales } from "@/lib/i18n-config";

const navLabels: Record<DisplayLocale, { news: string; matches: string }> = {
  "zh-CN": { news: "资讯", matches: "赛事" },
  "zh-TW": { news: "資訊", matches: "賽事" },
  en: { news: "News", matches: "Matches" },
  th: { news: "ข่าว", matches: "การแข่งขัน" },
  vi: { news: "Tin tức", matches: "Trận đấu" },
  hi: { news: "News", matches: "Matches" },
};

export function PublicHeader({ locale }: { locale: DisplayLocale }) {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯";
  const nav = navLabels[locale] ?? navLabels["zh-CN"];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={`/${locale}/news`} className="text-lg font-bold text-white">
          {siteName}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-400">
          <Link href={`/${locale}/news`} className="hover:text-white">{nav.news}</Link>
          <Link href={`/${locale}/matches`} className="hover:text-white">{nav.matches}</Link>
        </nav>
        {/* Locale switcher */}
        <div className="flex items-center gap-1">
          {displayLocales.map((l) => (
            <Link
              key={l}
              href={`/${l}/news`}
              className={`rounded px-2 py-1 text-xs ${l === locale ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
            >
              {l === "zh-CN" ? "简" : l === "zh-TW" ? "繁" : l === "en" ? "EN" : l === "th" ? "TH" : l === "vi" ? "VI" : "HI"}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
