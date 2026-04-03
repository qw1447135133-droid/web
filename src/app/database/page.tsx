import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getArticlePlans } from "@/lib/content-data";
import { getCricketLeagueDepth, type CricketNarrative, type CricketTeamIntel } from "@/lib/cricket-depth";
import { getEsportsLeagueDepth } from "@/lib/esports-depth";
import { getCurrentLocale } from "@/lib/i18n";
import { getDatabaseSnapshot } from "@/lib/sports-data";
import type { HeadToHeadRow, ScheduleRow, StandingRow, Team } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function formatWinRate(row: StandingRow) {
  if (!row.played) {
    return "--";
  }

  return `${((row.win / row.played) * 100).toFixed(1)}%`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function getSpecialDatabaseCopy(locale: string, sport: "cricket" | "esports") {
  if (sport === "esports") {
    if (locale === "en") {
      return {
        sportLabel: "Esports",
        standingsDescription: "Review record, form, and map-level momentum for the active esports league.",
        scheduleDescription: "Scan esports fixtures, completed series, and tactical note tags.",
        teamsDescription: "Review esports team rank, form, and venue split in one place.",
        h2hDescription: "Review recent series samples and key tags for the active esports league.",
      };
    }

    if (locale === "zh-TW") {
      return {
        sportLabel: "電競",
        standingsDescription: "查看目前電競聯賽的戰績、狀態與地圖/小局走勢。",
        scheduleDescription: "查看電競賽程、完場比分與戰術重點標籤。",
        teamsDescription: "集中查看電競戰隊排名、近期狀態與主客場分佈。",
        h2hDescription: "回看目前電競聯賽的近期系列賽樣本與關鍵標籤。",
      };
    }

    return {
      sportLabel: "电竞",
      standingsDescription: "查看当前电竞联赛的战绩、状态和地图/小局走势。",
      scheduleDescription: "查看电竞赛程、完场比分和战术重点标签。",
      teamsDescription: "集中查看电竞战队排名、近期状态和主客场分布。",
      h2hDescription: "回看当前电竞联赛的近期系列赛样本与关键标签。",
    };
  }

  if (locale === "en") {
    return {
      sportLabel: "Cricket",
      standingsDescription: "Review rank, win rate, form, and home-away splits for the active cricket league.",
      scheduleDescription: "Scan cricket fixtures, final scores, and over-phase notes.",
      teamsDescription: "Review cricket team rank, form, and home-away splits in one place.",
      h2hDescription: "Review recent matchup samples and key tags for the current cricket league.",
    };
  }

  if (locale === "zh-TW") {
    return {
      sportLabel: "板球",
      standingsDescription: "查看目前板球聯賽的排名、勝率、近期狀態與主客場分佈。",
      scheduleDescription: "查看板球賽程、完場比分與回合重點備註。",
      teamsDescription: "集中查看板球球隊排名、近期狀態與主客場分佈。",
      h2hDescription: "回看目前板球聯賽的近期對戰樣本與關鍵標籤。",
    };
  }

  return {
    sportLabel: "板球",
    standingsDescription: "查看当前板球联赛的排名、胜率、近期状态与主客场分布。",
    scheduleDescription: "查看板球赛程、完场比分和回合重点备注。",
    teamsDescription: "集中查看板球球队排名、近期状态和主客场分布。",
    h2hDescription: "回看当前板球联赛的近期对战样本与关键标签。",
  };
}

function getPlanActionLabel(locale: string) {
  if (locale === "en") {
    return "View plan";
  }

  if (locale === "zh-TW") {
    return "查看計畫單";
  }

  return "查看计划单";
}

function FootballStandingsTable({
  rows,
  columns,
}: {
  rows: StandingRow[];
  columns: ReturnType<typeof getSiteCopy>["databasePageCopy"]["standingsColumns"];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-300">
          <tr>
            <th className="px-4 py-3">{columns.rank}</th>
            <th className="px-4 py-3">{columns.team}</th>
            <th className="px-4 py-3">{columns.played}</th>
            <th className="px-4 py-3">{columns.win}</th>
            <th className="px-4 py-3">{columns.draw}</th>
            <th className="px-4 py-3">{columns.loss}</th>
            <th className="px-4 py-3">{columns.points}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId ?? row.team} className="border-t border-white/6">
              <td className="px-4 py-3 text-orange-200">{row.rank}</td>
              <td className="px-4 py-3 text-white">{row.team}</td>
              <td className="px-4 py-3 text-slate-300">{row.played}</td>
              <td className="px-4 py-3 text-slate-300">{row.win}</td>
              <td className="px-4 py-3 text-slate-300">{row.draw}</td>
              <td className="px-4 py-3 text-slate-300">{row.loss}</td>
              <td className="px-4 py-3 font-semibold text-lime-100">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BasketballStandingsTable({
  rows,
  columns,
}: {
  rows: StandingRow[];
  columns: ReturnType<typeof getSiteCopy>["databasePageCopy"]["standingsColumns"];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-300">
          <tr>
            <th className="px-4 py-3">{columns.rank}</th>
            <th className="px-4 py-3">{columns.team}</th>
            <th className="px-4 py-3">{columns.played}</th>
            <th className="px-4 py-3">{columns.win}</th>
            <th className="px-4 py-3">{columns.loss}</th>
            <th className="px-4 py-3">{columns.winRate}</th>
            <th className="px-4 py-3">{columns.recentForm}</th>
            <th className="px-4 py-3">{columns.home}</th>
            <th className="px-4 py-3">{columns.away}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId ?? row.team} className="border-t border-white/6">
              <td className="px-4 py-3 text-orange-200">{row.rank}</td>
              <td className="px-4 py-3 text-white">{row.team}</td>
              <td className="px-4 py-3 text-slate-300">{row.played}</td>
              <td className="px-4 py-3 text-slate-300">{row.win}</td>
              <td className="px-4 py-3 text-slate-300">{row.loss}</td>
              <td className="px-4 py-3 font-semibold text-lime-100">{formatWinRate(row)}</td>
              <td className="px-4 py-3 text-slate-300">{row.form ?? "--"}</td>
              <td className="px-4 py-3 text-slate-300">{row.homeRecord ?? "--"}</td>
              <td className="px-4 py-3 text-slate-300">{row.awayRecord ?? "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CricketStandingsTable({
  rows,
  columns,
}: {
  rows: StandingRow[];
  columns: ReturnType<typeof getSiteCopy>["databasePageCopy"]["standingsColumns"];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-300">
          <tr>
            <th className="px-4 py-3">{columns.rank}</th>
            <th className="px-4 py-3">{columns.team}</th>
            <th className="px-4 py-3">{columns.played}</th>
            <th className="px-4 py-3">{columns.win}</th>
            <th className="px-4 py-3">{columns.loss}</th>
            <th className="px-4 py-3">{columns.points}</th>
            <th className="px-4 py-3">{columns.recentForm}</th>
            <th className="px-4 py-3">{columns.home}</th>
            <th className="px-4 py-3">{columns.away}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId ?? row.team} className="border-t border-white/6">
              <td className="px-4 py-3 text-orange-200">{row.rank}</td>
              <td className="px-4 py-3 text-white">{row.team}</td>
              <td className="px-4 py-3 text-slate-300">{row.played}</td>
              <td className="px-4 py-3 text-slate-300">{row.win}</td>
              <td className="px-4 py-3 text-slate-300">{row.loss}</td>
              <td className="px-4 py-3 font-semibold text-lime-100">{row.points}</td>
              <td className="px-4 py-3 text-slate-300">{row.form ?? "--"}</td>
              <td className="px-4 py-3 text-slate-300">{row.homeRecord ?? "--"}</td>
              <td className="px-4 py-3 text-slate-300">{row.awayRecord ?? "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleList({
  rows,
  matchActionLabel,
  secondaryActionLabel,
  planHrefByMatchId = {},
  supplementalNoteByMatchId,
}: {
  rows: ScheduleRow[];
  matchActionLabel: string;
  secondaryActionLabel?: string;
  planHrefByMatchId?: Record<string, string>;
  supplementalNoteByMatchId?: Record<string, string>;
}) {
  return (
    <div className="mt-6 grid gap-4">
      {rows.map((row) => {
        const planHref = row.id ? planHrefByMatchId[row.id] : undefined;
        const supplementalNote = row.id ? supplementalNoteByMatchId?.[row.id] : undefined;

        return (
          <div key={`${row.date}-${row.fixture}`} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{row.fixture}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{row.result}</span>
                {row.id ? (
                  <Link
                    href={`/matches/${row.id}`}
                    className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15"
                  >
                    {matchActionLabel}
                  </Link>
                ) : null}
                {planHref ? (
                  <Link
                    href={planHref}
                    className="rounded-full border border-lime-300/18 bg-lime-300/8 px-3 py-1 text-xs text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                  >
                    {secondaryActionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {row.date} | {row.note}
            </p>
            {supplementalNote ? <p className="mt-2 text-sm leading-6 text-lime-100/80">{supplementalNote}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function TeamCards({
  teams,
  columns,
  teamIntelById,
  nextMatchActionLabel,
  planActionLabel,
  planHrefByMatchId,
}: {
  teams: Team[];
  columns: ReturnType<typeof getSiteCopy>["databasePageCopy"]["standingsColumns"];
  teamIntelById?: Record<string, CricketTeamIntel>;
  nextMatchActionLabel?: string;
  planActionLabel?: string;
  planHrefByMatchId?: Record<string, string>;
}) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {teams.map((team) => {
        const intel = teamIntelById?.[team.id];
        const nextPlanHref = intel?.nextMatchId ? planHrefByMatchId?.[intel.nextMatchId] : undefined;

        return (
          <div key={team.id} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{team.shortName}</p>
              </div>
              <span className="rounded-full bg-sky-400/12 px-3 py-1 text-xs text-sky-100">#{team.ranking}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-slate-500">{columns.recentForm}</p>
                <p className="mt-1 text-white">{team.form}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-slate-500">{columns.home}</p>
                <p className="mt-1 text-white">{team.homeRecord}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-slate-500">{columns.away}</p>
                <p className="mt-1 text-white">{team.awayRecord}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-slate-500">{columns.shortName}</p>
                <p className="mt-1 text-white">{team.shortName}</p>
              </div>
            </div>
            {intel ? (
              <div className="mt-4 rounded-[1.1rem] border border-lime-300/10 bg-lime-300/5 p-4">
                <p className="text-sm leading-6 text-slate-300">{intel.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {intel.indicators.map((item) => (
                    <div key={`${team.id}-${item.label}`} className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-sm text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                {intel.nextMatchId && nextMatchActionLabel ? (
                  <Link
                    href={`/matches/${intel.nextMatchId}`}
                    className="mt-4 inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                  >
                    {nextMatchActionLabel}
                  </Link>
                ) : null}
                {nextPlanHref && planActionLabel ? (
                  <Link
                    href={nextPlanHref}
                    className="mt-4 ml-3 inline-flex rounded-full border border-orange-300/18 bg-orange-400/8 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/12"
                  >
                    {planActionLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function HeadToHeadList({
  rows,
  storylines,
  actionLinks,
}: {
  rows: HeadToHeadRow[];
  storylines?: CricketNarrative[];
  actionLinks?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="mt-6 space-y-4">
      {storylines && storylines.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {storylines.map((storyline) => (
              <article key={storyline.title} className="rounded-[1.2rem] border border-lime-300/12 bg-lime-300/5 p-4">
                <h3 className="text-base font-semibold text-white">{storyline.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{storyline.description}</p>
              </article>
            ))}
          </div>
          {actionLinks && actionLinks.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {actionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {rows.map((row) => (
        <div key={`${row.season}-${row.fixture}`} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-white">{row.fixture}</p>
            <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{row.tag}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{row.season}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-6 rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default async function DatabasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { databasePageCopy, livePageCopy, siteNavItems, uiCopy } = getSiteCopy(locale);
  const resolved = await searchParams;
  const sport = pickValue(resolved.sport, "football");
  const normalizedSport =
    sport === "basketball"
      ? "basketball"
      : sport === "cricket"
        ? "cricket"
        : sport === "esports"
          ? "esports"
          : "football";
  const leagueSlug = pickValue(
    resolved.league,
    normalizedSport === "football"
      ? "premier-league"
      : normalizedSport === "basketball"
        ? "cba"
        : normalizedSport === "cricket"
          ? "ipl"
          : "lpl",
  );
  const view = pickValue(resolved.view, "standings");
  const isBasketball = normalizedSport === "basketball";
  const isCricket = normalizedSport === "cricket";
  const isEsports = normalizedSport === "esports";
  const specialDatabaseCopy = isCricket || isEsports ? getSpecialDatabaseCopy(locale, isCricket ? "cricket" : "esports") : null;
  const [snapshot, articlePlans] = await Promise.all([
    getDatabaseSnapshot(normalizedSport, leagueSlug, locale),
    view === "schedule" || isCricket || isEsports ? getArticlePlans(normalizedSport, locale) : Promise.resolve([]),
  ]);
  const availableLeagues = snapshot.leagues.filter((item) => item.sport === normalizedSport);
  const leagueMeta = availableLeagues.find((item) => item.slug === leagueSlug) ?? availableLeagues[0];
  const leagueTeams = snapshot.teams.filter((item) => item.leagueSlug === leagueSlug);
  const leagueMatchIds = snapshot.schedule.flatMap((row) => (row.id ? [row.id] : []));
  const planHrefByMatchId = Object.fromEntries(
    leagueMatchIds.flatMap((matchId) => {
      const primaryPlan = articlePlans.find((plan) => plan.matchId === matchId);
      return primaryPlan ? [[matchId, `/plans/${primaryPlan.slug}`] as const] : [];
    }),
  );
  const cricketDepth = isCricket ? getCricketLeagueDepth(leagueSlug, locale) : null;
  const esportsDepth = isEsports ? getEsportsLeagueDepth(leagueSlug, locale) : null;
  const sportLabel = isCricket
    ? livePageCopy.cricket.sportLabel
    : isEsports
      ? livePageCopy.esports.sportLabel
      : isBasketball
        ? databasePageCopy.basketball
        : databasePageCopy.football;
  const leagueName = leagueMeta?.name ?? leagueSlug;
  const standingsTitle = isCricket
    ? specialDatabaseCopy?.standingsDescription ?? databasePageCopy.cricketStandingsDescription
    : isEsports
      ? specialDatabaseCopy?.standingsDescription ?? databasePageCopy.esportsStandingsDescription
    : isBasketball
      ? databasePageCopy.basketballStandingsDescription
      : databasePageCopy.footballStandingsDescription;
  const viewEyebrow =
    view === "schedule"
      ? locale === "en"
        ? "Schedule"
        : "Schedule"
      : view === "teams"
        ? locale === "en"
          ? "Teams"
          : "Teams"
        : view === "h2h"
          ? locale === "en"
            ? "Head To Head"
            : "Head To Head"
          : locale === "en"
            ? "Standings"
            : "Standings";
  const viewTitle =
    view === "schedule"
      ? uiCopy.scheduleResults
      : view === "teams"
        ? uiCopy.teamProfile
        : view === "h2h"
          ? uiCopy.historicalH2H
          : databasePageCopy.defaultViewTitle;
  const cricketQuickLinks = [
    { href: "/live/cricket", label: siteNavItems.find((item) => item.href === "/live/cricket")?.label ?? "板球比分" },
    { href: "/plans", label: siteNavItems.find((item) => item.href === "/plans")?.label ?? "计划单" },
    { href: "/ai-predictions", label: siteNavItems.find((item) => item.href === "/ai-predictions")?.label ?? "AI 预测" },
  ];
  const esportsQuickLinks = [
    { href: "/live/esports", label: siteNavItems.find((item) => item.href === "/live/esports")?.label ?? "电竞比分" },
    { href: `/database?sport=esports&league=${leagueSlug}&view=standings`, label: databasePageCopy.defaultViewTitle },
    { href: "/plans?sport=esports", label: siteNavItems.find((item) => item.href === "/plans")?.label ?? "计划单" },
    { href: "/ai-predictions?sport=esports", label: siteNavItems.find((item) => item.href === "/ai-predictions")?.label ?? "AI 预测" },
  ];
  const openNextMatchLabel = locale === "en" ? "Open match" : locale === "zh-TW" ? "查看比賽" : "查看比赛";
  const planActionLabel = getPlanActionLabel(locale);
  const firstLeaguePlanHref = leagueMatchIds.map((matchId) => planHrefByMatchId[matchId]).find(Boolean);
  const h2hActionLinks = isCricket
    ? [
        { href: `/database?sport=cricket&league=${leagueSlug}&view=schedule`, label: uiCopy.scheduleResults },
        ...(firstLeaguePlanHref ? [{ href: firstLeaguePlanHref, label: planActionLabel }] : []),
      ]
    : isEsports
      ? [
          { href: `/database?sport=esports&league=${leagueSlug}&view=schedule`, label: uiCopy.scheduleResults },
          { href: `/database?sport=esports&league=${leagueSlug}&view=teams`, label: uiCopy.teamProfile },
          ...(firstLeaguePlanHref ? [{ href: firstLeaguePlanHref, label: planActionLabel }] : []),
        ]
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={databasePageCopy.heroEyebrow}
          title={databasePageCopy.heroTitle(sportLabel)}
          description={databasePageCopy.heroDescription}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label={databasePageCopy.currentSport} value={sportLabel} />
          <SummaryCard label={databasePageCopy.currentLeague} value={leagueName} />
          <SummaryCard label={databasePageCopy.season} value={leagueMeta?.season ?? "--"} />
        </div>

        <form className="mt-6 grid gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{databasePageCopy.sportFilter}</span>
            <select
              name="sport"
              defaultValue={normalizedSport}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="football">{databasePageCopy.football}</option>
              <option value="basketball">{databasePageCopy.basketball}</option>
              <option value="cricket">{getSpecialDatabaseCopy(locale, "cricket").sportLabel}</option>
              <option value="esports">{getSpecialDatabaseCopy(locale, "esports").sportLabel}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{databasePageCopy.leagueFilter}</span>
            <select
              name="league"
              defaultValue={leagueSlug}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              {availableLeagues.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{databasePageCopy.viewFilter}</span>
            <div className="flex gap-3">
              <select
                name="view"
                defaultValue={view}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              >
                <option value="standings">{databasePageCopy.standingsOption}</option>
                <option value="schedule">{uiCopy.scheduleResults}</option>
                <option value="teams">{uiCopy.teamProfile}</option>
                <option value="h2h">{uiCopy.historicalH2H}</option>
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {uiCopy.query}
              </button>
            </div>
          </label>
        </form>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={viewEyebrow}
          title={viewTitle}
          description={
            view === "standings"
              ? standingsTitle
              : view === "schedule"
                ? isCricket || isEsports
                  ? specialDatabaseCopy?.scheduleDescription ?? databasePageCopy.scheduleDescription
                  : databasePageCopy.scheduleDescription
                : view === "teams"
                  ? isCricket || isEsports
                    ? specialDatabaseCopy?.teamsDescription ?? databasePageCopy.teamsDescription
                    : databasePageCopy.teamsDescription
                  : isCricket || isEsports
                    ? specialDatabaseCopy?.h2hDescription ?? databasePageCopy.h2hDescription
                    : databasePageCopy.h2hDescription
          }
        />

        {isCricket ? (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              {cricketQuickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {cricketDepth?.overviewCards && cricketDepth.overviewCards.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {cricketDepth.overviewCards.map((card) => (
                  <article key={card.label} className="rounded-[1.2rem] border border-lime-300/12 bg-lime-300/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-lime-100/75">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-300">{card.detail}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {isEsports ? (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              {esportsQuickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-sky-300/30 hover:bg-white/[0.07] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {esportsDepth?.overviewCards && esportsDepth.overviewCards.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {esportsDepth.overviewCards.map((card) => (
                  <article key={card.label} className="rounded-[1.2rem] border border-sky-300/12 bg-sky-300/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-300">{card.detail}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {view === "standings" && snapshot.standings.length > 0 ? (
          isCricket ? (
            <CricketStandingsTable rows={snapshot.standings} columns={databasePageCopy.standingsColumns} />
          ) : isBasketball || isEsports ? (
            <BasketballStandingsTable rows={snapshot.standings} columns={databasePageCopy.standingsColumns} />
          ) : (
            <FootballStandingsTable rows={snapshot.standings} columns={databasePageCopy.standingsColumns} />
          )
        ) : null}

        {view === "standings" && snapshot.standings.length === 0 ? (
          <EmptyState
            title={databasePageCopy.emptyStandingsTitle}
            description={databasePageCopy.emptyStandingsDescription}
          />
        ) : null}

        {view === "schedule" && snapshot.schedule.length > 0 ? (
          <ScheduleList
            rows={snapshot.schedule}
            matchActionLabel={uiCopy.viewMatch}
            secondaryActionLabel={planActionLabel}
            planHrefByMatchId={planHrefByMatchId}
            supplementalNoteByMatchId={cricketDepth?.scheduleNotesByMatchId ?? esportsDepth?.scheduleNotesByMatchId}
          />
        ) : null}

        {view === "schedule" && snapshot.schedule.length === 0 ? (
          <EmptyState
            title={databasePageCopy.emptyScheduleTitle}
            description={databasePageCopy.emptyScheduleDescription}
          />
        ) : null}

        {view === "teams" && leagueTeams.length > 0 ? (
          <TeamCards
            teams={leagueTeams}
            columns={databasePageCopy.standingsColumns}
            teamIntelById={cricketDepth?.teamIntelById ?? esportsDepth?.teamIntelById}
            nextMatchActionLabel={isCricket || isEsports ? openNextMatchLabel : undefined}
            planActionLabel={isCricket || isEsports ? planActionLabel : undefined}
            planHrefByMatchId={planHrefByMatchId}
          />
        ) : null}

        {view === "teams" && leagueTeams.length === 0 ? (
          <EmptyState title={databasePageCopy.emptyTeamsTitle} description={databasePageCopy.emptyTeamsDescription} />
        ) : null}

        {view === "h2h" && snapshot.h2h.length > 0 ? (
          <HeadToHeadList rows={snapshot.h2h} storylines={cricketDepth?.storylines ?? esportsDepth?.storylines} actionLinks={h2hActionLinks} />
        ) : null}

        {view === "h2h" && snapshot.h2h.length === 0 ? (
          <EmptyState title={databasePageCopy.emptyH2HTitle} description={databasePageCopy.emptyH2HDescription} />
        ) : null}
      </section>
    </div>
  );
}
