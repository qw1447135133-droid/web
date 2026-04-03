import Link from "next/link";
import { ScoreboardTable } from "@/components/scoreboard-table";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatOdd, formatPrice } from "@/lib/format";
import { getArticlePlans, getAuthorTeams, getPredictions } from "@/lib/content-data";
import { getCurrentLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";
import { getDatabaseSnapshot, getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import type { AuthorTeam, Match, PredictionRecord, Team } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CricketPageCopy = {
  summaryEyebrow: string;
  summaryTitle: string;
  summaryDescription: string;
  priorityTitle: string;
  priorityDescription: string;
  liveMatches: string;
  matchesOnBoard: string;
  averageTotal: string;
  strongestFavorite: string;
  activeOvers: string;
  favoriteLabel: string;
  totalLineLabel: string;
  activeOverLabel: string;
  noFavorite: string;
  noOvers: string;
  noPriority: string;
  snapshotEyebrow: string;
  snapshotTitle: string;
  snapshotDescription: string;
  snapshotRank: string;
  snapshotTeam: string;
  snapshotForm: string;
  snapshotHome: string;
  snapshotAway: string;
  snapshotNoTeams: string;
  contentEyebrow: string;
  contentTitle: string;
  contentDescription: string;
  plansTitle: string;
  aiTitle: string;
  expertsTitle: string;
  authorLabel: string;
  marketLabel: string;
  confidenceLabel: string;
  viewPlan: string;
  viewAllPlans: string;
  viewAiHub: string;
  noPlans: string;
  noPredictions: string;
  noExperts: string;
  scheduleEyebrow: string;
  scheduleTitle: string;
  scheduleDescription: string;
  coverageEyebrow: string;
  coverageTitle: string;
  coverageDescription: string;
  noSchedule: string;
  noCoverage: string;
};

function pickValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getCricketPageCopy(locale: Locale): CricketPageCopy {
  switch (locale) {
    case "zh-TW":
      return {
        summaryEyebrow: "Cricket Pulse",
        summaryTitle: "今日板球摘要",
        summaryDescription: "把直播數、總分線、強勢熱門與進行中回合節奏壓縮成同一屏，方便快速掃描當天盤面。",
        priorityTitle: "重點場次",
        priorityDescription: "優先顯示正在進行與即將開賽的場次，直接帶出目前最有交易感的板球對局。",
        liveMatches: "進行中場次",
        matchesOnBoard: "看板場次",
        averageTotal: "平均總分線",
        strongestFavorite: "最強熱門",
        activeOvers: "進行中回合",
        favoriteLabel: "熱門方",
        totalLineLabel: "總分線",
        activeOverLabel: "目前進度",
        noFavorite: "暫無明確熱門",
        noOvers: "目前沒有進行中的回合資訊",
        noPriority: "目前沒有可優先展示的板球場次。",
        snapshotEyebrow: "League Snapshot",
        snapshotTitle: "聯賽快照",
        snapshotDescription: "先用當前有資料的聯賽做輕量排名視圖，補足板球頁的隊伍狀態感知。",
        snapshotRank: "排名",
        snapshotTeam: "球隊",
        snapshotForm: "近期",
        snapshotHome: "主場",
        snapshotAway: "客場",
        snapshotNoTeams: "目前沒有可顯示的球隊快照。",
        contentEyebrow: "Cricket Content",
        contentTitle: "板球內容模組",
        contentDescription: "把板球推薦、AI 角度與專家席位直接放進頻道頁，先把內容消費鏈路做實。",
        plansTitle: "焦點計畫單",
        aiTitle: "AI 角度",
        expertsTitle: "專家席位",
        authorLabel: "作者",
        marketLabel: "玩法",
        confidenceLabel: "信心",
        viewPlan: "查看計畫單",
        viewAllPlans: "查看全部板球計畫",
        viewAiHub: "前往 AI 預測中心",
        noPlans: "目前沒有可顯示的板球計畫單。",
        noPredictions: "目前沒有可顯示的板球 AI 角度。",
        noExperts: "目前沒有可顯示的板球作者。",
        scheduleEyebrow: "Schedule & Results",
        scheduleTitle: "今日賽程與完場賽果",
        scheduleDescription: "把板球入口最常用的第二層資訊直接放進同一頁，方便從 live board 往下看待開賽與已完場場次。",
        coverageEyebrow: "Coverage",
        coverageTitle: "目前聯賽覆蓋",
        coverageDescription: "目前先覆蓋熱門板球聯賽入口，後續再補資料庫、球員統計與資訊模組。",
        noSchedule: "目前篩選條件下沒有可顯示的板球賽程。",
        noCoverage: "目前沒有可顯示的板球聯賽。",
      };
    case "en":
      return {
        summaryEyebrow: "Cricket Pulse",
        summaryTitle: "Today’s cricket snapshot",
        summaryDescription: "Compress the live count, total lines, strongest favorite, and active over tempo into one scan-friendly layer.",
        priorityTitle: "Priority fixtures",
        priorityDescription: "Surface live and near-start matches first so the page feels closer to an actual cricket trading desk.",
        liveMatches: "Live now",
        matchesOnBoard: "Fixtures on board",
        averageTotal: "Average total line",
        strongestFavorite: "Strongest favorite",
        activeOvers: "Active overs",
        favoriteLabel: "Favorite",
        totalLineLabel: "Total line",
        activeOverLabel: "Current progress",
        noFavorite: "No clear favorite right now",
        noOvers: "No live over progress available",
        noPriority: "No cricket fixtures are ready for priority display.",
        snapshotEyebrow: "League Snapshot",
        snapshotTitle: "League snapshot",
        snapshotDescription: "Use the first league with available team data as a light standings layer so cricket has more than just scores and schedules.",
        snapshotRank: "Rank",
        snapshotTeam: "Team",
        snapshotForm: "Form",
        snapshotHome: "Home",
        snapshotAway: "Away",
        snapshotNoTeams: "No team snapshot is available right now.",
        contentEyebrow: "Cricket Content",
        contentTitle: "Cricket content modules",
        contentDescription: "Place previews, AI angles, and expert voices on the channel page so cricket has an actual content layer, not just data blocks.",
        plansTitle: "Featured plans",
        aiTitle: "AI angles",
        expertsTitle: "Expert desk",
        authorLabel: "Author",
        marketLabel: "Market",
        confidenceLabel: "Confidence",
        viewPlan: "Open plan",
        viewAllPlans: "Browse all cricket plans",
        viewAiHub: "Open AI prediction hub",
        noPlans: "No cricket plans are available right now.",
        noPredictions: "No cricket AI angles are available right now.",
        noExperts: "No cricket experts are available right now.",
        scheduleEyebrow: "Schedule & Results",
        scheduleTitle: "Today’s fixtures and finals",
        scheduleDescription: "Place the most useful second-layer cricket information under the live board so users can scan upcoming and finished fixtures in one pass.",
        coverageEyebrow: "Coverage",
        coverageTitle: "Current league coverage",
        coverageDescription: "This phase covers the most active cricket competitions first, with deeper archives, player stats, and news queued for later.",
        noSchedule: "No cricket fixtures match the current filters.",
        noCoverage: "No cricket leagues are available right now.",
      };
    default:
      return {
        summaryEyebrow: "Cricket Pulse",
        summaryTitle: "今日板球摘要",
        summaryDescription: "把直播数、总分线、强势热门和进行中回合节奏压缩到同一屏，方便快速扫盘。",
        priorityTitle: "重点场次",
        priorityDescription: "优先展示正在进行和即将开赛的场次，让页面更像一个真的板球频道入口。",
        liveMatches: "进行中场次",
        matchesOnBoard: "看板场次",
        averageTotal: "平均总分线",
        strongestFavorite: "最强热门",
        activeOvers: "进行中回合",
        favoriteLabel: "热门方",
        totalLineLabel: "总分线",
        activeOverLabel: "当前进度",
        noFavorite: "暂无明确热门",
        noOvers: "当前没有进行中的回合信息",
        noPriority: "当前没有可优先展示的板球场次。",
        snapshotEyebrow: "League Snapshot",
        snapshotTitle: "联赛快照",
        snapshotDescription: "先用当前有数据的联赛做一层轻量排名视图，补足板球页的球队状态感知。",
        snapshotRank: "排名",
        snapshotTeam: "球队",
        snapshotForm: "近期",
        snapshotHome: "主场",
        snapshotAway: "客场",
        snapshotNoTeams: "当前没有可显示的球队快照。",
        contentEyebrow: "Cricket Content",
        contentTitle: "板球内容模块",
        contentDescription: "把板球推荐、AI 角度和专家席位直接放进频道页，先把内容消费链路做完整。",
        plansTitle: "焦点计划单",
        aiTitle: "AI 角度",
        expertsTitle: "专家席位",
        authorLabel: "作者",
        marketLabel: "玩法",
        confidenceLabel: "信心",
        viewPlan: "查看计划单",
        viewAllPlans: "查看全部板球计划",
        viewAiHub: "前往 AI 预测中心",
        noPlans: "当前没有可显示的板球计划单。",
        noPredictions: "当前没有可显示的板球 AI 角度。",
        noExperts: "当前没有可显示的板球作者。",
        scheduleEyebrow: "Schedule & Results",
        scheduleTitle: "今日赛程与完场赛果",
        scheduleDescription: "把板球入口最常用的第二层信息直接放进同一页，方便从 live board 往下看待开赛与已完场场次。",
        coverageEyebrow: "Coverage",
        coverageTitle: "当前联赛覆盖",
        coverageDescription: "当前先覆盖热门板球联赛入口，后续再补资料库、球员统计与资讯模块。",
        noSchedule: "当前筛选条件下没有可显示的板球赛程。",
        noCoverage: "当前没有可显示的板球联赛。",
      };
  }
}

function parseNumericValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOvers(clock?: string) {
  if (!clock) {
    return null;
  }

  const matched = clock.match(/(\d+(?:\.\d+)?)/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseFloat(matched[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFavorite(match: Match) {
  const candidates = [
    { team: match.homeTeam, odd: match.odds.home },
    { team: match.awayTeam, odd: match.odds.away },
  ].filter((item): item is { team: string; odd: number } => typeof item.odd === "number" && Number.isFinite(item.odd));

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => left.odd - right.odd)[0];
}

function formatMetric(value: number, locale: Locale, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function sortTeams(teams: Team[]) {
  return [...teams].sort((left, right) => left.ranking - right.ranking);
}

function sortAuthors(authors: AuthorTeam[]) {
  return [...authors].sort((left, right) => {
    const leftFollowers = Number.parseFloat(left.followers.replace(/[^\d.]/g, ""));
    const rightFollowers = Number.parseFloat(right.followers.replace(/[^\d.]/g, ""));
    return rightFollowers - leftFollowers;
  });
}

function sortPredictions(predictions: PredictionRecord[]) {
  return [...predictions].sort((left, right) => {
    const leftEdge = Number.parseFloat(left.expectedEdge.replace(/[^\d.-]/g, ""));
    const rightEdge = Number.parseFloat(right.expectedEdge.replace(/[^\d.-]/g, ""));
    return rightEdge - leftEdge;
  });
}

export default async function CricketLivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { homePageCopy, livePageCopy, matchStatusLabels, uiCopy } = getSiteCopy(locale);
  const cricketPageCopy = getCricketPageCopy(locale);
  const resolved = await searchParams;
  const league = pickValue(resolved.league, "all");
  const status = pickValue(resolved.status, "all");
  const sort = pickValue(resolved.sort, "time");
  const [allLeagues, allMatches, cricketPlans, cricketPredictions, allAuthors] = await Promise.all([
    getTrackedLeagues("cricket", locale),
    getMatchesBySport("cricket", locale),
    getArticlePlans("cricket", locale),
    getPredictions("cricket", locale),
    getAuthorTeams(locale),
  ]);
  const snapshotLeagueSlug =
    league !== "all"
      ? league
      : allLeagues.find((currentLeague) => allMatches.some((match) => match.leagueSlug === currentLeague.slug))?.slug ??
        allLeagues[0]?.slug;
  const snapshot =
    snapshotLeagueSlug ? await getDatabaseSnapshot("cricket", snapshotLeagueSlug, locale) : { leagues: [], standings: [], schedule: [], teams: [], h2h: [] };

  let items = allMatches;

  if (league !== "all") {
    items = items.filter((item) => item.leagueSlug === league);
  }

  if (status !== "all") {
    items = items.filter((item) => item.status === status);
  }

  items = [...items].sort((left, right) => {
    if (sort === "league") {
      return left.leagueSlug.localeCompare(right.leagueSlug, locale);
    }

    return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
  });

  const scheduleGroups = [
    { key: "live", label: matchStatusLabels.live, items: items.filter((item) => item.status === "live") },
    { key: "upcoming", label: matchStatusLabels.upcoming, items: items.filter((item) => item.status === "upcoming") },
    { key: "finished", label: matchStatusLabels.finished, items: items.filter((item) => item.status === "finished") },
  ] as const;

  const leagueCoverage = allLeagues.map((currentLeague) => ({
    ...currentLeague,
    totalMatches: allMatches.filter((item) => item.leagueSlug === currentLeague.slug).length,
  }));

  const liveMatches = items.filter((item) => item.status === "live");
  const totals = items
    .map((item) => parseNumericValue(item.odds.total))
    .filter((value): value is number => value !== null);
  const activeOvers = liveMatches
    .map((item) => parseOvers(item.clock))
    .filter((value): value is number => value !== null);
  const strongestFavorite = items
    .map((item) => {
      const favorite = getFavorite(item);
      if (!favorite) {
        return null;
      }

      return {
        match: item,
        ...favorite,
      };
    })
    .filter((value): value is { match: Match; team: string; odd: number } => value !== null)
    .sort((left, right) => left.odd - right.odd)[0];
  const priorityMatches = [
    ...scheduleGroups.find((group) => group.key === "live")!.items,
    ...scheduleGroups.find((group) => group.key === "upcoming")!.items,
    ...scheduleGroups.find((group) => group.key === "finished")!.items,
  ].slice(0, 3);
  const snapshotLeague = allLeagues.find((currentLeague) => currentLeague.slug === snapshotLeagueSlug);
  const snapshotTeams = sortTeams(snapshot.teams);
  const featuredPlans = [...cricketPlans].sort((left, right) => Number(right.isHot) - Number(left.isHot)).slice(0, 2);
  const featuredPredictions = sortPredictions(cricketPredictions).slice(0, 2);
  const featuredAuthors = sortAuthors(
    allAuthors.filter((author) => featuredPlans.some((plan) => plan.authorId === author.id)),
  ).slice(0, 2);

  const metricCards = [
    {
      label: cricketPageCopy.liveMatches,
      value: String(liveMatches.length),
      detail: matchStatusLabels.live,
    },
    {
      label: cricketPageCopy.matchesOnBoard,
      value: String(items.length),
      detail: `${allLeagues.length} ${cricketPageCopy.coverageTitle}`,
    },
    {
      label: cricketPageCopy.averageTotal,
      value: totals.length > 0 ? formatMetric(totals.reduce((sum, value) => sum + value, 0) / totals.length, locale) : "--",
      detail: cricketPageCopy.totalLineLabel,
    },
    {
      label: cricketPageCopy.activeOvers,
      value: activeOvers.length > 0 ? formatMetric(activeOvers.reduce((sum, value) => sum + value, 0), locale) : "--",
      detail: activeOvers.length > 0 ? cricketPageCopy.activeOverLabel : cricketPageCopy.noOvers,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={livePageCopy.cricket.eyebrow}
          title={livePageCopy.cricket.title}
          description={livePageCopy.cricket.description}
        />

        <form className="mt-6 grid gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.filterLeague}</span>
            <select
              name="league"
              defaultValue={league}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{uiCopy.allLeagues}</option>
              {allLeagues.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.filterStatus}</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{uiCopy.allStatuses}</option>
              <option value="upcoming">{matchStatusLabels.upcoming}</option>
              <option value="live">{matchStatusLabels.live}</option>
              <option value="finished">{matchStatusLabels.finished}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.sortMode}</span>
            <div className="flex gap-3">
              <select
                name="sort"
                defaultValue={sort}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              >
                <option value="time">{uiCopy.sortByTime}</option>
                <option value="league">{uiCopy.sortByLeague}</option>
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {uiCopy.refresh}
              </button>
            </div>
          </label>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.summaryEyebrow}
            title={cricketPageCopy.summaryTitle}
            description={cricketPageCopy.summaryDescription}
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
                <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-sky-300/12 bg-sky-300/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{cricketPageCopy.strongestFavorite}</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {strongestFavorite ? strongestFavorite.team : cricketPageCopy.noFavorite}
                </p>
              </div>
              {strongestFavorite ? (
                <div className="text-right">
                  <p className="text-2xl font-semibold text-sky-100">{formatOdd(strongestFavorite.odd)}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {strongestFavorite.match.homeTeam} vs {strongestFavorite.match.awayTeam}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.summaryEyebrow}
            title={cricketPageCopy.priorityTitle}
            description={cricketPageCopy.priorityDescription}
          />
          {priorityMatches.length === 0 ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
              {cricketPageCopy.noPriority}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {priorityMatches.map((match) => {
                const favorite = getFavorite(match);

                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="block rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-sky-300/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {match.leagueName ?? match.leagueSlug}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-white">
                          {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                        {matchStatusLabels[match.status]}
                        {match.clock ? ` | ${match.clock}` : ""}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span className="rounded-full bg-slate-950/50 px-3 py-1">{match.score}</span>
                      <span>{formatDateTime(match.kickoff, locale)}</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketPageCopy.favoriteLabel}</p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {favorite ? `${favorite.team} ${formatOdd(favorite.odd)}` : cricketPageCopy.noFavorite}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketPageCopy.totalLineLabel}</p>
                        <p className="mt-2 text-sm font-medium text-white">{match.odds.total}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketPageCopy.activeOverLabel}</p>
                        <p className="mt-2 text-sm font-medium text-white">{match.clock ?? matchStatusLabels[match.status]}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">{match.statLine}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ScoreboardTable matches={items} sportLabel={livePageCopy.cricket.sportLabel} locale={locale} />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.contentEyebrow}
            title={cricketPageCopy.contentTitle}
            description={cricketPageCopy.contentDescription}
          />
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {cricketPageCopy.plansTitle}
            </h3>
            {featuredPlans.length === 0 ? (
              <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {cricketPageCopy.noPlans}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {featuredPlans.map((plan) => {
                  const author = allAuthors.find((item) => item.id === plan.authorId);

                  return (
                    <article key={plan.id} className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.league}</span>
                          <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{plan.performance}</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-200">{formatPrice(plan.price, locale)}</span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-white">{plan.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {plan.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-sm text-slate-400">
                        <div>
                          <p>{formatDateTime(plan.kickoff, locale)}</p>
                          <p className="mt-1">
                            {cricketPageCopy.authorLabel} {author?.name ?? "--"}
                          </p>
                        </div>
                        <Link
                          href={`/plans/${plan.slug}`}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                        >
                          {cricketPageCopy.viewPlan}
                        </Link>
                      </div>
                    </article>
                  );
                })}
                <Link
                  href="/plans"
                  className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                >
                  {cricketPageCopy.viewAllPlans}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketPageCopy.contentEyebrow}
              title={cricketPageCopy.aiTitle}
              description={cricketPageCopy.contentDescription}
            />
            {featuredPredictions.length === 0 ? (
              <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {cricketPageCopy.noPredictions}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {featuredPredictions.map((prediction) => {
                  const match = allMatches.find((item) => item.id === prediction.matchId);

                  return (
                    <article key={prediction.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {cricketPageCopy.marketLabel} | {prediction.market}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{prediction.pick}</h3>
                          <p className="mt-2 text-sm text-slate-400">
                            {match ? `${match.homeTeam} vs ${match.awayTeam}` : prediction.matchId}
                          </p>
                        </div>
                        <div className="rounded-[1.1rem] border border-lime-300/20 bg-lime-300/8 px-3 py-2 text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-lime-100">{cricketPageCopy.confidenceLabel}</p>
                          <p className="mt-1 text-xl font-semibold text-lime-100">{prediction.confidence}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-300">{prediction.explanation}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {prediction.factors.map((factor) => (
                          <span key={factor} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                            {factor}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                        <p className="text-sm font-semibold text-orange-200">{prediction.expectedEdge}</p>
                        {match ? (
                          <Link
                            href={`/matches/${match.id}`}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-sky-300/30 hover:text-white"
                          >
                            {uiCopy.viewMatch}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                <Link
                  href="/ai-predictions"
                  className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:text-white"
                >
                  {cricketPageCopy.viewAiHub}
                </Link>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketPageCopy.contentEyebrow}
              title={cricketPageCopy.expertsTitle}
              description={cricketPageCopy.contentDescription}
            />
            {featuredAuthors.length === 0 ? (
              <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {cricketPageCopy.noExperts}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {featuredAuthors.map((author) => (
                  <article key={author.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{author.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{author.focus}</p>
                      </div>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{author.badge}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{homePageCopy.authorStats.streak}</p>
                        <p className="mt-2 font-medium text-white">{author.streak}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{homePageCopy.authorStats.winRate}</p>
                        <p className="mt-2 font-medium text-white">{author.winRate}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ROI</p>
                        <p className="mt-2 font-medium text-white">{author.monthlyRoi}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.snapshotEyebrow}
            title={snapshotLeague ? `${cricketPageCopy.snapshotTitle} | ${snapshotLeague.name}` : cricketPageCopy.snapshotTitle}
            description={cricketPageCopy.snapshotDescription}
          />
          {snapshotTeams.length === 0 ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
              {cricketPageCopy.snapshotNoTeams}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.03]">
              <div className="grid grid-cols-[0.5fr_1.4fr_1fr_0.9fr_0.9fr] gap-3 border-b border-white/8 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                <span>{cricketPageCopy.snapshotRank}</span>
                <span>{cricketPageCopy.snapshotTeam}</span>
                <span>{cricketPageCopy.snapshotForm}</span>
                <span>{cricketPageCopy.snapshotHome}</span>
                <span>{cricketPageCopy.snapshotAway}</span>
              </div>
              <div className="divide-y divide-white/6">
                {snapshotTeams.map((team) => (
                  <div
                    key={team.id}
                    className="grid grid-cols-[0.5fr_1.4fr_1fr_0.9fr_0.9fr] gap-3 px-4 py-3 text-sm text-slate-300"
                  >
                    <span className="font-semibold text-white">{team.ranking}</span>
                    <span>
                      <span className="font-medium text-white">{team.name}</span>
                      <span className="ml-2 text-xs uppercase tracking-[0.16em] text-slate-500">{team.shortName}</span>
                    </span>
                    <span>{team.form}</span>
                    <span>{team.homeRecord}</span>
                    <span>{team.awayRecord}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.scheduleEyebrow}
            title={cricketPageCopy.scheduleTitle}
            description={cricketPageCopy.scheduleDescription}
          />
          {items.length === 0 ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
              {cricketPageCopy.noSchedule}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {scheduleGroups.map((group) => (
                <div key={group.key} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                    <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300">{group.items.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.items.length > 0 ? (
                      group.items.slice(0, 3).map((match) => (
                        <Link
                          key={match.id}
                          href={`/matches/${match.id}`}
                          className="block rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3 transition hover:border-sky-300/20 hover:bg-white/[0.05]"
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {match.leagueName ?? match.leagueSlug}
                          </p>
                          <p className="mt-2 font-medium text-white">
                            {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                          </p>
                          <p className="mt-2 text-sm text-sky-100">{match.score}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDateTime(match.kickoff, locale)}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-slate-500">
                        {cricketPageCopy.noSchedule}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={cricketPageCopy.coverageEyebrow}
            title={cricketPageCopy.coverageTitle}
            description={cricketPageCopy.coverageDescription}
          />
          {leagueCoverage.length === 0 ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
              {cricketPageCopy.noCoverage}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {leagueCoverage.map((currentLeague) => (
                <div key={currentLeague.slug} className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{currentLeague.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {currentLeague.region} | {currentLeague.season}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                      {currentLeague.totalMatches}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
