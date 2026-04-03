import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatOdd } from "@/lib/format";
import { getArticlePlans, getAuthorTeams } from "@/lib/content-data";
import { getCricketMatchDepth } from "@/lib/cricket-depth";
import { getCurrentLocale } from "@/lib/i18n";
import { getDatabaseSnapshot, getMatchById, getPredictionByMatchId } from "@/lib/sports-data";
import type { Match } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type Params = Promise<{ id: string }>;

function getCricketMatchCopy(locale: string) {
  if (locale === "en") {
    return {
      pulseEyebrow: "Cricket Pulse",
      pulseTitle: "Live over pulse",
      pulseDescription: "Expose the current over progress, favorite side, total line, and movement so the cricket detail page has an actual trading layer.",
      progressLabel: "Current progress",
      favoriteLabel: "Favorite side",
      totalLabel: "Total line",
      movementLabel: "Line move",
      phaseTitle: "Phase map",
      phaseDescription: "Break the match into powerplay, middle, and death-over pressure so the detail view carries a real innings structure.",
      phaseLinks: {
        schedule: "Open schedule",
        h2h: "Open head to head",
      },
      venueTitle: "Venue and player watch",
      venueDescription: "Add ground bias and the key player triggers most likely to move the live line.",
      watchTitle: "Key player watch",
      watchLinks: {
        teams: "Open team profiles",
        ai: "Open AI predictions",
        plan: "Open linked plan",
      },
      contentEyebrow: "Cricket Content",
      contentTitle: "Related coverage",
      contentDescription: "Bring the closest cricket plans onto the match page so the detail flow leads into paid content instead of ending at raw data.",
      noRelatedPlans: "No related cricket plans are available right now.",
      openPlan: "Open plan",
      archiveTitle: "Archive context",
      archiveDescription: "Bring team form, matchup samples, and the cricket database entry into the match detail flow.",
      archiveLinks: {
        schedule: "Open schedule",
        teams: "Open team profiles",
        h2h: "Open head to head",
        plan: "Open linked plan",
      },
      teamPulseTitle: "Team form",
      h2hTitle: "Matchup samples",
      homeLabel: "Home",
      awayLabel: "Away",
      formLabel: "Form",
      openDatabase: "Open cricket database",
      noArchive: "No cricket archive data is available right now.",
      movement: {
        up: "Up",
        flat: "Flat",
        down: "Down",
      },
    };
  }

  if (locale === "zh-TW") {
    return {
      pulseEyebrow: "Cricket Pulse",
      pulseTitle: "回合脈搏",
      pulseDescription: "把目前回合進度、熱門方、總分線與盤口方向直接放進詳情頁，讓板球詳情頁不只停留在原始數據。",
      progressLabel: "目前進度",
      favoriteLabel: "熱門方",
      totalLabel: "總分線",
      movementLabel: "盤口方向",
      phaseTitle: "回合地圖",
      phaseDescription: "把比賽拆成 powerplay、中段與死亡回合壓力，讓詳情頁具備真正的局內結構。",
      phaseLinks: {
        schedule: "打開賽程",
        h2h: "打開歷史交鋒",
      },
      venueTitle: "場地與球員觀察",
      venueDescription: "把球場偏向和最可能改變即時盤口的關鍵球員一起帶進來。",
      watchTitle: "關鍵球員觀察",
      watchLinks: {
        teams: "打開球隊資料",
        ai: "打開 AI 預測",
        plan: "打開關聯計畫單",
      },
      contentEyebrow: "Cricket Content",
      contentTitle: "相關內容",
      contentDescription: "把最接近這場比賽的板球計畫單帶進詳情頁，讓詳情鏈路可以直接承接內容解讀。",
      noRelatedPlans: "目前沒有可顯示的相關板球計畫單。",
      openPlan: "查看計畫單",
      archiveTitle: "檔案脈絡",
      archiveDescription: "把球隊近況、對戰樣本與板球資料庫入口一起帶進賽事詳情頁。",
      archiveLinks: {
        schedule: "打開賽程",
        teams: "打開球隊資料",
        h2h: "打開歷史交鋒",
        plan: "打開關聯計畫單",
      },
      teamPulseTitle: "球隊狀態",
      h2hTitle: "對戰樣本",
      homeLabel: "主場",
      awayLabel: "客場",
      formLabel: "近期",
      openDatabase: "打開板球資料庫",
      noArchive: "目前沒有可顯示的板球檔案資料。",
      movement: {
        up: "上行",
        flat: "持平",
        down: "下行",
      },
    };
  }

  return {
    pulseEyebrow: "Cricket Pulse",
    pulseTitle: "回合脉搏",
    pulseDescription: "把当前回合进度、热门方、总分线和盘口方向直接放进详情页，让板球详情页不只是原始数据。",
    progressLabel: "当前进度",
    favoriteLabel: "热门方",
    totalLabel: "总分线",
    movementLabel: "盘口方向",
    phaseTitle: "回合地图",
    phaseDescription: "把比赛拆成 powerplay、中段和死亡回合压力，让详情页具备真正的局内结构。",
    phaseLinks: {
      schedule: "打开赛程",
      h2h: "打开历史交锋",
    },
    venueTitle: "场地与球员观察",
    venueDescription: "把球场倾向和最可能改变即时盘口的关键球员一起带进来。",
    watchTitle: "关键球员观察",
    watchLinks: {
      teams: "打开球队资料",
      ai: "打开 AI 预测",
      plan: "打开关联计划单",
    },
    contentEyebrow: "Cricket Content",
    contentTitle: "相关内容",
    contentDescription: "把最接近这场比赛的板球计划单带进详情页，让详情链路可以直接承接内容解读。",
    noRelatedPlans: "当前没有可显示的相关板球计划单。",
    openPlan: "查看计划单",
    archiveTitle: "档案脉络",
    archiveDescription: "把球队近况、对战样本和板球资料库入口一起带进赛事详情页。",
    archiveLinks: {
      schedule: "打开赛程",
      teams: "打开球队资料",
      h2h: "打开历史交锋",
      plan: "打开关联计划单",
    },
    teamPulseTitle: "球队状态",
    h2hTitle: "对战样本",
    homeLabel: "主场",
    awayLabel: "客场",
    formLabel: "近期",
    openDatabase: "打开板球资料库",
    noArchive: "当前没有可显示的板球档案资料。",
    movement: {
      up: "上行",
      flat: "持平",
      down: "下行",
    },
  };
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

export default async function MatchDetailPage({ params }: { params: Params }) {
  const locale = await getCurrentLocale();
  const { matchDetailCopy, matchStatusLabels } = getSiteCopy(locale);
  const cricketMatchCopy = getCricketMatchCopy(locale);
  const { id } = await params;
  const match = await getMatchById(id, locale);

  if (!match) {
    notFound();
  }

  const [prediction, plans, authors] = await Promise.all([
    getPredictionByMatchId(match.id, locale),
    match.sport === "cricket" ? getArticlePlans("cricket", locale) : Promise.resolve([]),
    match.sport === "cricket" ? getAuthorTeams(locale) : Promise.resolve([]),
  ]);
  const cricketSnapshot = match.sport === "cricket" ? await getDatabaseSnapshot("cricket", match.leagueSlug, locale) : null;
  const cricketDepth = match.sport === "cricket" ? getCricketMatchDepth(match.id, locale) : null;
  const spreadLabel = locale === "en" ? "Spread" : locale === "zh-TW" ? "讓分" : "让分";
  const totalLabel = locale === "en" ? "Total" : locale === "zh-TW" ? "總分" : "总分";
  const favorite = match.sport === "cricket" ? getFavorite(match) : null;
  const relatedPlans =
    match.sport === "cricket"
      ? plans.filter((plan) => plan.matchId === match.id).slice(0, 2)
      : [];
  const archiveTeams =
    match.sport === "cricket"
      ? (cricketSnapshot?.teams ?? []).filter((team) => team.name === match.homeTeam || team.name === match.awayTeam)
      : [];
  const archiveH2H = match.sport === "cricket" ? (cricketSnapshot?.h2h ?? []).slice(0, 2) : [];
  const archiveActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=schedule`, label: cricketMatchCopy.archiveLinks.schedule },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=teams`, label: cricketMatchCopy.archiveLinks.teams },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=h2h`, label: cricketMatchCopy.archiveLinks.h2h },
          ...(relatedPlans[0]
            ? [{ href: `/plans/${relatedPlans[0].slug}`, label: cricketMatchCopy.archiveLinks.plan }]
            : []),
        ]
      : [];
  const phaseActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=schedule`, label: cricketMatchCopy.phaseLinks.schedule },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=h2h`, label: cricketMatchCopy.phaseLinks.h2h },
        ]
      : [];
  const watchActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=teams`, label: cricketMatchCopy.watchLinks.teams },
          { href: "/ai-predictions", label: cricketMatchCopy.watchLinks.ai },
          ...(relatedPlans[0]
            ? [{ href: `/plans/${relatedPlans[0].slug}`, label: cricketMatchCopy.watchLinks.plan }]
            : []),
        ]
      : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading eyebrow="Match Hub" title={`${match.homeTeam} vs ${match.awayTeam}`} description={match.insight} />

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.kickoff}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(match.kickoff, locale)}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.matchStatus}</p>
            <p className="mt-2 text-lg font-semibold text-orange-200">{matchStatusLabels[match.status]}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.currentScore}</p>
            <p className="mt-2 text-lg font-semibold text-white">{match.score}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.venue}</p>
            <p className="mt-2 text-lg font-semibold text-white">{match.venue}</p>
          </div>
        </div>
      </section>

      {match.sport === "cricket" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.pulseTitle}
              description={cricketMatchCopy.pulseDescription}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.progressLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{match.clock ?? matchStatusLabels[match.status]}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.favoriteLabel}</p>
                <p className="mt-2 text-lg font-semibold text-orange-200">
                  {favorite ? `${favorite.team} ${formatOdd(favorite.odd)}` : "--"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.totalLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{match.odds.total}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.movementLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{cricketMatchCopy.movement[match.odds.movement]}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.contentEyebrow}
              title={cricketMatchCopy.contentTitle}
              description={cricketMatchCopy.contentDescription}
            />
            {relatedPlans.length > 0 ? (
              <div className="mt-6 space-y-4">
                {relatedPlans.map((plan) => {
                  const author = authors.find((item) => item.id === plan.authorId);

                  return (
                    <article key={plan.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.performance}</span>
                        <span className="text-sm font-semibold text-orange-200">{plan.marketSummary}</span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{plan.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                      <p className="mt-4 text-sm text-slate-500">{author?.name ?? "--"}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {plan.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/plans/${plan.slug}`}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                        >
                          {cricketMatchCopy.openPlan}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noRelatedPlans}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {match.sport === "cricket" && cricketDepth ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.phaseTitle}
              description={cricketMatchCopy.phaseDescription}
            />
            <div className="mt-6 grid gap-4">
              {cricketDepth.phaseCards.map((phase) => (
                <article key={phase.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{phase.label}</h3>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{phase.note}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{match.homeTeam}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{phase.homeValue}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{match.awayTeam}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{phase.awayValue}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {phaseActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {phaseActionLinks.map((link) => (
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
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.venueTitle}
              description={cricketMatchCopy.venueDescription}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {cricketDepth.venueCards.map((card) => (
                <article key={card.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</p>
                </article>
              ))}
            </div>
            {watchActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {watchActionLinks.map((link) => (
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
            <p className="section-label mt-6">{cricketMatchCopy.watchTitle}</p>
            <div className="mt-4 space-y-4">
              {cricketDepth.playerWatch.map((player) => (
                <article key={player.name} className="rounded-[1.25rem] border border-lime-300/10 bg-lime-300/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{player.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {player.team} | {player.role}
                      </p>
                    </div>
                    <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs text-lime-100">{player.trend}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{player.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {match.sport === "cricket" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.archiveTitle}
              description={cricketMatchCopy.archiveDescription}
            />
            {archiveActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {archiveActionLinks.map((link) => (
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
            {archiveTeams.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {archiveTeams.map((team) => (
                  <article key={team.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{team.shortName}</p>
                      </div>
                      <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">#{team.ranking}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.formLabel}</p>
                        <p className="mt-2 text-white">{team.form}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.homeLabel}</p>
                        <p className="mt-2 text-white">{team.homeRecord}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.awayLabel}</p>
                        <p className="mt-2 text-white">{team.awayRecord}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noArchive}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.h2hTitle}
              description={cricketMatchCopy.archiveDescription}
            />
            {archiveH2H.length > 0 ? (
              <div className="mt-6 space-y-4">
                {archiveH2H.map((row) => (
                  <article key={`${row.season}-${row.fixture}`} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{row.fixture}</p>
                      <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{row.tag}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{row.season}</p>
                  </article>
                ))}
                <Link
                  href={`/database?sport=cricket&league=${match.leagueSlug}&view=h2h`}
                  className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                >
                  {cricketMatchCopy.openDatabase}
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noArchive}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={matchDetailCopy.dataSliceEyebrow} title={matchDetailCopy.dataSliceTitle} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{matchDetailCopy.marketOdds}</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatOdd(match.odds.home)}
                {match.odds.draw != null ? ` / ${formatOdd(match.odds.draw)}` : ""} / {formatOdd(match.odds.away)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {spreadLabel} {match.odds.spread} | {totalLabel} {match.odds.total}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{matchDetailCopy.matchSlice}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{match.statLine}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={matchDetailCopy.aiEyebrow} title={matchDetailCopy.aiTitle} />
          {prediction ? (
            <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{prediction.market}</p>
              <p className="mt-2 text-xl font-semibold text-orange-200">{prediction.pick}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{prediction.explanation}</p>
              {prediction.factors.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prediction.factors.map((factor) => (
                    <span key={factor} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {factor}
                    </span>
                  ))}
                </div>
              ) : null}
              <Link
                href="/ai-predictions"
                className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:text-white"
              >
                {matchDetailCopy.aiLink}
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
              {matchDetailCopy.emptyPrediction}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
