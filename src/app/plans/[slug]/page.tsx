import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { getArticleBySlug, getArticlePlans, getAuthorTeams, getPredictionByMatchId } from "@/lib/content-data";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
import { getPaymentResultMeta } from "@/lib/payment-ui";
import { findRelatedMatch, findSiblingPlans } from "@/lib/plan-match-linking";
import { getSessionContext } from "@/lib/session";
import { getDatabaseSnapshot, getMatchesBySport } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getCricketPlanCopy(locale: string) {
  if (locale === "en") {
    return {
      matchEyebrow: "Match Link",
      matchTitle: "Linked match context",
      matchDescription: "Keep the cricket plan tied to the actual fixture so users can move between the recommendation and the live match state.",
      archiveTitle: "League archive",
      archiveDescription: "Surface the current league table and nearby content so the plan page carries more than one article.",
      aiTitle: "AI angle",
      relatedTitle: "More cricket plans",
      statusLabel: "Status",
      scoreLabel: "Score",
      marketLabel: "Market",
      openMatch: "Open match",
      openDatabase: "Open league database",
      openPlan: "Open plan",
      noMatch: "No linked cricket match was found for this plan yet.",
      noPrediction: "No AI angle is linked to the related match yet.",
      noRelated: "No additional cricket plans are available right now.",
    };
  }

  if (locale === "zh-TW") {
    return {
      matchEyebrow: "Match Link",
      matchTitle: "對應比賽脈絡",
      matchDescription: "把板球計畫單和實際比賽狀態綁在一起，方便在推薦與 live 狀態之間切換。",
      archiveTitle: "聯賽檔案",
      archiveDescription: "把目前聯賽排名和鄰近內容一起帶進計畫單頁，避免只剩單篇文章。",
      aiTitle: "AI 角度",
      relatedTitle: "更多板球計畫",
      statusLabel: "狀態",
      scoreLabel: "比分",
      marketLabel: "玩法",
      openMatch: "查看比賽",
      openDatabase: "打開聯賽資料庫",
      openPlan: "查看計畫",
      noMatch: "目前還沒有找到這條計畫對應的板球比賽。",
      noPrediction: "目前還沒有綁定對應比賽的 AI 角度。",
      noRelated: "目前沒有更多可顯示的板球計畫單。",
    };
  }

  return {
    matchEyebrow: "Match Link",
    matchTitle: "对应比赛脉络",
    matchDescription: "把板球计划单和实际比赛状态绑在一起，方便在推荐与 live 状态之间切换。",
    archiveTitle: "联赛档案",
    archiveDescription: "把当前联赛排名和邻近内容一起带进计划单页，避免只剩单篇文章。",
    aiTitle: "AI 角度",
    relatedTitle: "更多板球计划",
    statusLabel: "状态",
    scoreLabel: "比分",
    marketLabel: "玩法",
    openMatch: "查看比赛",
    openDatabase: "打开联赛资料库",
    openPlan: "查看计划",
    noMatch: "当前还没有找到这条计划对应的板球比赛。",
    noPrediction: "当前还没有绑定对应比赛的 AI 角度。",
    noRelated: "当前没有更多可显示的板球计划单。",
  };
}

function getEsportsPlanCopy(locale: string) {
  if (locale === "en") {
    return {
      matchEyebrow: "Series Link",
      matchTitle: "Linked series context",
      matchDescription: "Keep the esports plan tied to the live series so users can move from paid analysis into the current match state without leaving the channel.",
      archiveTitle: "Esports archive",
      archiveDescription: "Bring league ranking samples, matchup notes, and the database entry onto the plan page.",
      aiTitle: "AI angle",
      relatedTitle: "More esports plans",
      statusLabel: "Status",
      scoreLabel: "Series score",
      marketLabel: "Odds summary",
      openMatch: "Open match",
      openDatabase: "Open esports database",
      openPlan: "Open plan",
      noMatch: "No linked esports match was found for this plan yet.",
      noPrediction: "No AI angle is linked to the related series yet.",
      noRelated: "No additional esports plans are available right now.",
      archivePulseTitle: "League pulse",
      archiveSamplesTitle: "Series samples",
    };
  }

  if (locale === "zh-TW") {
    return {
      matchEyebrow: "Series Link",
      matchTitle: "對應系列賽脈絡",
      matchDescription: "把電競計畫單和 live 系列賽狀態綁在一起，讓使用者能從付費分析直接切回目前賽況。",
      archiveTitle: "電競檔案",
      archiveDescription: "把聯賽樣本、對戰標記和資料庫入口一起帶進計畫單頁。",
      aiTitle: "AI 角度",
      relatedTitle: "更多電競計畫",
      statusLabel: "狀態",
      scoreLabel: "系列賽比分",
      marketLabel: "盤口摘要",
      openMatch: "查看比賽",
      openDatabase: "打開電競資料庫",
      openPlan: "查看計畫",
      noMatch: "目前還沒有找到這條計畫對應的電競比賽。",
      noPrediction: "目前還沒有綁定對應系列賽的 AI 角度。",
      noRelated: "目前沒有更多可顯示的電競計畫單。",
      archivePulseTitle: "聯賽脈搏",
      archiveSamplesTitle: "系列賽樣本",
    };
  }

  return {
    matchEyebrow: "Series Link",
    matchTitle: "对应系列赛脉络",
    matchDescription: "把电竞计划单和 live 系列赛状态绑在一起，让用户能从付费分析直接切回当前赛况。",
    archiveTitle: "电竞档案",
    archiveDescription: "把联赛样本、对战标记和资料库入口一起带进计划单页。",
    aiTitle: "AI 角度",
    relatedTitle: "更多电竞计划",
    statusLabel: "状态",
    scoreLabel: "系列赛比分",
    marketLabel: "盘口摘要",
    openMatch: "查看比赛",
    openDatabase: "打开电竞资料库",
    openPlan: "查看计划",
    noMatch: "当前还没有找到这条计划对应的电竞比赛。",
    noPrediction: "当前还没有绑定对应系列赛的 AI 角度。",
    noRelated: "当前没有更多可显示的电竞计划单。",
    archivePulseTitle: "联赛脉搏",
    archiveSamplesTitle: "系列赛样本",
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function resolveCricketLeagueSlug(planLeague: string, fallbackLeagueSlug?: string) {
  if (fallbackLeagueSlug) {
    return fallbackLeagueSlug;
  }

  const normalizedLeague = normalizeText(planLeague);

  if (normalizedLeague.includes("psl") || normalizedLeague.includes("pakistansuperleague")) {
    return "psl";
  }

  if (normalizedLeague.includes("ipl") || normalizedLeague.includes("indianpremierleague")) {
    return "ipl";
  }
  return "ipl";
}

function resolveEsportsLeagueSlug(planLeague: string, fallbackLeagueSlug?: string) {
  if (fallbackLeagueSlug) {
    return fallbackLeagueSlug;
  }

  const normalizedLeague = normalizeText(planLeague);

  if (normalizedLeague.includes("dreamleague")) {
    return "dreamleague";
  }

  if (normalizedLeague.includes("blast")) {
    return "blast-premier";
  }

  return "lpl";
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { planDetailCopy, uiCopy } = getSiteCopy(locale);
  const cricketPlanCopy = getCricketPlanCopy(locale);
  const esportsPlanCopy = getEsportsPlanCopy(locale);
  const { slug } = await params;
  const [plan, authors, { session }, resolved] = await Promise.all([
    getArticleBySlug(slug, locale),
    getAuthorTeams(locale),
    getSessionContext(),
    searchParams,
  ]);

  if (!plan) {
    notFound();
  }

  const author = authors.find((item) => item.id === plan.authorId);
  const unlocked = canAccessContent(session, plan.id);
  const payment = readValue(resolved.payment);
  const paymentResult = getPaymentResultMeta("plan", payment, locale);
  const cricketMatches = plan.sport === "cricket" ? await getMatchesBySport("cricket", locale) : [];
  const relatedMatch = plan.sport === "cricket" ? findRelatedMatch(plan, cricketMatches) : null;
  const cricketLeagueSlug =
    plan.sport === "cricket" ? resolveCricketLeagueSlug(plan.league, relatedMatch?.leagueSlug) : null;
  const [cricketPlanPool, snapshot] =
    plan.sport === "cricket" && cricketLeagueSlug
      ? await Promise.all([
          getArticlePlans("cricket", locale),
          getDatabaseSnapshot("cricket", cricketLeagueSlug, locale),
        ])
      : [[], null];
  const relatedPrediction = relatedMatch ? await getPredictionByMatchId(relatedMatch.id, locale) : undefined;
  const relatedPlans = plan.sport === "cricket" ? findSiblingPlans(plan, cricketPlanPool, 2) : [];
  const esportsMatches = plan.sport === "esports" ? await getMatchesBySport("esports", locale) : [];
  const esportsRelatedMatch = plan.sport === "esports" ? findRelatedMatch(plan, esportsMatches) : null;
  const esportsLeagueSlug =
    plan.sport === "esports" ? resolveEsportsLeagueSlug(plan.league, esportsRelatedMatch?.leagueSlug) : null;
  const [esportsPlanPool, esportsSnapshot] =
    plan.sport === "esports" && esportsLeagueSlug
      ? await Promise.all([
          getArticlePlans("esports", locale),
          getDatabaseSnapshot("esports", esportsLeagueSlug, locale),
        ])
      : [[], null];
  const esportsPrediction = esportsRelatedMatch
    ? await getPredictionByMatchId(esportsRelatedMatch.id, locale)
    : undefined;
  const esportsRelatedPlans = plan.sport === "esports" ? findSiblingPlans(plan, esportsPlanPool, 2) : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading eyebrow={plan.league} title={plan.title} description={plan.teaser} />

        <div className="mt-6 flex flex-wrap gap-2">
          {plan.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{planDetailCopy.authorTeam}</p>
            <p className="mt-2 text-lg font-semibold text-white">{author?.name ?? "Signal Nine"}</p>
          </div>
          <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{planDetailCopy.kickoff}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(plan.kickoff, locale)}</p>
          </div>
          <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{planDetailCopy.singlePrice}</p>
            <p className="mt-2 text-lg font-semibold text-orange-200">{formatPrice(plan.price, locale)}</p>
          </div>
          <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{uiCopy.oddsSummary}</p>
            <p className="mt-2 text-lg font-semibold text-white">{plan.marketSummary}</p>
          </div>
        </div>

        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}
      </section>

      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label">{planDetailCopy.analysisEyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {unlocked ? uiCopy.fullAnalysis : planDetailCopy.previewSummary}
            </h2>
          </div>
          {unlocked ? (
            <span className="rounded-full bg-lime-300/12 px-4 py-2 text-sm text-lime-100">
              {planDetailCopy.fullAnalysisUnlocked}
            </span>
          ) : (
            <form action="/api/content/purchase" method="post" className="flex flex-wrap gap-3">
              <input type="hidden" name="contentId" value={plan.id} />
              <input type="hidden" name="returnTo" value={`/plans/${plan.slug}`} />
              <button
                type="submit"
                className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {planDetailCopy.payNowPrefix} {formatPrice(plan.price, locale)}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {(unlocked ? plan.analysis : plan.analysis.slice(0, 1)).map((paragraph) => (
            <p
              key={paragraph}
              className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5 text-sm leading-8 text-slate-200"
            >
              {paragraph}
            </p>
          ))}
          {!unlocked ? (
            <div className="rounded-[1.25rem] border border-dashed border-orange-300/25 bg-orange-400/8 p-5 text-sm leading-8 text-orange-100">
              {planDetailCopy.unlockNotice}
            </div>
          ) : null}
        </div>
      </section>

      {plan.sport === "cricket" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketPlanCopy.matchEyebrow}
              title={cricketPlanCopy.matchTitle}
              description={cricketPlanCopy.matchDescription}
            />
            {relatedMatch ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {relatedMatch.leagueName ?? relatedMatch.leagueSlug}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {relatedMatch.homeTeam} <span className="text-slate-500">vs</span> {relatedMatch.awayTeam}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                      {cricketPlanCopy.statusLabel} | {relatedMatch.clock ?? relatedMatch.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketPlanCopy.scoreLabel}</p>
                      <p className="mt-2 text-white">{relatedMatch.score}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketPlanCopy.marketLabel}</p>
                      <p className="mt-2 text-white">{relatedMatch.odds.total}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{planDetailCopy.kickoff}</p>
                      <p className="mt-2 text-white">{formatDateTime(relatedMatch.kickoff, locale)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{relatedMatch.statLine}</p>
                  <Link
                    href={`/matches/${relatedMatch.id}`}
                    className="mt-5 inline-flex rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15"
                  >
                    {cricketPlanCopy.openMatch}
                  </Link>
                </div>

                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="section-label">{cricketPlanCopy.aiTitle}</p>
                  {relatedPrediction ? (
                    <>
                      <h3 className="mt-2 text-lg font-semibold text-white">{relatedPrediction.pick}</h3>
                      <p className="mt-2 text-sm text-slate-400">{relatedPrediction.market}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-300">{relatedPrediction.explanation}</p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">{cricketPlanCopy.noPrediction}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {cricketPlanCopy.noMatch}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={cricketPlanCopy.matchEyebrow}
                title={cricketPlanCopy.archiveTitle}
                description={cricketPlanCopy.archiveDescription}
              />
              <div className="mt-6 space-y-3">
                {(snapshot?.standings ?? []).slice(0, 4).map((row) => (
                  <div key={row.teamId ?? row.team} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{row.team}</p>
                        <p className="mt-1 text-sm text-slate-400">{row.form ?? "--"}</p>
                      </div>
                      <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">#{row.rank}</span>
                    </div>
                  </div>
                ))}
                <Link
                  href={`/database?sport=cricket&league=${cricketLeagueSlug ?? "ipl"}&view=standings`}
                  className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                >
                  {cricketPlanCopy.openDatabase}
                </Link>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={cricketPlanCopy.matchEyebrow}
                title={cricketPlanCopy.relatedTitle}
                description={cricketPlanCopy.archiveDescription}
              />
              {relatedPlans.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {relatedPlans.map((item) => (
                    <article key={item.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.league}</span>
                        <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">
                          {item.performance}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{item.teaser}</p>
                      <Link
                        href={`/plans/${item.slug}`}
                        className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                      >
                        {cricketPlanCopy.openPlan}
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {cricketPlanCopy.noRelated}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {plan.sport === "esports" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={esportsPlanCopy.matchEyebrow}
              title={esportsPlanCopy.matchTitle}
              description={esportsPlanCopy.matchDescription}
            />
            {esportsRelatedMatch ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {esportsRelatedMatch.leagueName ?? esportsRelatedMatch.leagueSlug}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {esportsRelatedMatch.homeTeam} <span className="text-slate-500">vs</span> {esportsRelatedMatch.awayTeam}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                      {esportsPlanCopy.statusLabel} | {esportsRelatedMatch.clock ?? esportsRelatedMatch.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{esportsPlanCopy.scoreLabel}</p>
                      <p className="mt-2 text-white">{esportsRelatedMatch.score}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{esportsPlanCopy.marketLabel}</p>
                      <p className="mt-2 text-white">{esportsRelatedMatch.odds.spread}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{planDetailCopy.kickoff}</p>
                      <p className="mt-2 text-white">{formatDateTime(esportsRelatedMatch.kickoff, locale)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{esportsRelatedMatch.statLine}</p>
                  <Link
                    href={`/matches/${esportsRelatedMatch.id}`}
                    className="mt-5 inline-flex rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15"
                  >
                    {esportsPlanCopy.openMatch}
                  </Link>
                </div>

                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="section-label">{esportsPlanCopy.aiTitle}</p>
                  {esportsPrediction ? (
                    <>
                      <h3 className="mt-2 text-lg font-semibold text-white">{esportsPrediction.pick}</h3>
                      <p className="mt-2 text-sm text-slate-400">{esportsPrediction.market}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-300">{esportsPrediction.explanation}</p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">{esportsPlanCopy.noPrediction}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {esportsPlanCopy.noMatch}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsPlanCopy.matchEyebrow}
                title={esportsPlanCopy.archiveTitle}
                description={esportsPlanCopy.archiveDescription}
              />
              <div className="mt-6 space-y-3">
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="section-label">{esportsPlanCopy.archivePulseTitle}</p>
                  <div className="mt-4 space-y-3">
                    {(esportsSnapshot?.standings ?? []).slice(0, 3).map((row) => (
                      <div key={row.teamId ?? row.team} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/35 px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{row.team}</p>
                          <p className="mt-1 text-sm text-slate-400">{row.form ?? "--"}</p>
                        </div>
                        <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">#{row.rank}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="section-label">{esportsPlanCopy.archiveSamplesTitle}</p>
                  <div className="mt-4 space-y-3">
                    {(esportsSnapshot?.h2h ?? []).slice(0, 2).map((row) => (
                      <div key={`${row.season}-${row.fixture}`} className="rounded-2xl bg-slate-950/35 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium text-white">{row.fixture}</p>
                          <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{row.tag}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{row.season}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/database?sport=esports&league=${esportsLeagueSlug ?? "lpl"}&view=standings`}
                  className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                >
                  {esportsPlanCopy.openDatabase}
                </Link>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsPlanCopy.matchEyebrow}
                title={esportsPlanCopy.relatedTitle}
                description={esportsPlanCopy.archiveDescription}
              />
              {esportsRelatedPlans.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {esportsRelatedPlans.map((item) => (
                    <article key={item.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.league}</span>
                        <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">
                          {item.performance}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{item.teaser}</p>
                      <Link
                        href={`/plans/${item.slug}`}
                        className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                      >
                        {esportsPlanCopy.openPlan}
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {esportsPlanCopy.noRelated}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
