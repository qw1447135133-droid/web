import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { DisplayLocale } from "@/lib/i18n-config";
import { displayLocales, normalizeDisplayLocale } from "@/lib/i18n-config";
import { getSiteAds } from "@/lib/content-data";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { db } from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function generateStaticParams() {
  return displayLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dl = locale as DisplayLocale;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯";
  const titles: Record<DisplayLocale, string> = {
    "zh-CN": `赛事比分 | ${siteName}`,
    "zh-TW": `賽事比分 | ${siteName}`,
    en: `Match Scores | ${siteName}`,
    th: `คะแนนการแข่งขัน | ${siteName}`,
    vi: `Tỷ số trận đấu | ${siteName}`,
    hi: `Match Scores | ${siteName}`,
  };
  return { title: titles[dl] ?? titles["zh-CN"] };
}

async function getTodayMatches() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return db.match.findMany({
    where: {
      sport: "football",
      kickoff: { gte: start, lte: end },
      adminVisible: true,
    },
    include: { league: true },
    orderBy: { kickoff: "asc" },
    take: 50,
  });
}

function getHeading(locale: DisplayLocale): string {
  const map: Record<DisplayLocale, string> = {
    "zh-CN": "今日赛事",
    "zh-TW": "今日賽事",
    en: "Today's Matches",
    th: "การแข่งขันวันนี้",
    vi: "Trận đấu hôm nay",
    hi: "Today's Matches",
  };
  return map[locale] ?? map["zh-CN"];
}

export default async function MatchesPage({ params }: Props) {
  const { locale } = await params;
  const dl = locale as DisplayLocale;
  if (!displayLocales.includes(dl)) notFound();

  const [matches, ads] = await Promise.all([
    getTodayMatches(),
    getSiteAds(dl, "sidebar"),
  ]);

  const initialMatches = matches.map((m) => ({
    id: m.id,
    homeTeamName: m.homeTeamName,
    awayTeamName: m.awayTeamName,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    kickoff: m.kickoff.toISOString(),
    leagueName: m.league.name ?? m.league.id,
    lastSyncedAt: m.lastSyncedAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader locale={dl} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h1 className="mb-6 text-2xl font-bold">{getHeading(dl)}</h1>
            <LiveScoreboard locale={dl} initialMatches={initialMatches} />
          </div>
          <aside className="space-y-6">
            {ads.length > 0 ? (
              <SiteAdSlot ads={ads} locale={dl} />
            ) : (
              <AdPlaceholder locale={dl} />
            )}
          </aside>
        </div>
      </main>
      <SiteFooter locale={dl} />
    </div>
  );
}
