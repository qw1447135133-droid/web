import Link from "next/link";
import { HomepageCommandFeed } from "@/components/homepage-command-feed";
import { HomepageBannerShowcase } from "@/components/homepage-banner-showcase";
import { SectionHeading } from "@/components/section-heading";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { getArticleCoinPrice, getMembershipCoinPrice } from "@/lib/coin-wallet";
import { applyHomepageModuleMetrics, getArticlePlans, getAuthorTeams, getHomepageBanners, getHomepageModules, getPredictions, getSiteAds } from "@/lib/content-data";
import { formatDateTime } from "@/lib/format";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { membershipPlans } from "@/lib/mock-data";
import { getStoredMatchesBySport } from "@/lib/repositories/sports-repository";
import { getFeaturedMatches, getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

export default async function HomePage() {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { homePageCopy, matchStatusLabels } = getSiteCopy(displayLocale);
  const [featuredMatches, homepageBanners, homepageModules, articlePlans, predictions, authorTeams, footballMatches, basketballMatches, cricketMatches, cricketLeagues, esportsMatches, esportsLeagues, homepageInlineAds] = await Promise.all([
    getFeaturedMatches(locale),
    getHomepageBanners(locale),
    getHomepageModules(locale),
    getArticlePlans(undefined, locale),
    getPredictions(undefined, locale),
    getAuthorTeams(locale),
    getStoredMatchesBySport("football"),
    getStoredMatchesBySport("basketball"),
    getMatchesBySport("cricket", locale),
    getTrackedLeagues("cricket", locale),
    getMatchesBySport("esports", locale),
    getTrackedLeagues("esports", locale),
    getSiteAds(locale, "home-inline"),
  ]);
  const homepageModulesWithMetrics = applyHomepageModuleMetrics(
    homepageModules,
    {
      footballMatches,
      basketballMatches,
      cricketMatches,
      esportsMatches,
      cricketLeagueCount: cricketLeagues.length,
      esportsLeagueCount: esportsLeagues.length,
      authorCount: authorTeams.length,
      articlePlanCount: articlePlans.length,
      predictions,
    },
    locale,
  );
  const localizedMembershipPlans = membershipPlans.map((plan) => localizeMembershipPlan(plan, locale));
  const cricketSpotlightMatches = cricketMatches.slice(0, 3);
  const cricketLiveCount = cricketMatches.filter((match) => match.status === "live").length;
  const esportsSpotlightMatches = esportsMatches.slice(0, 3);
  const esportsLiveCount = esportsMatches.filter((match) => match.status === "live").length;

  const formatCoinAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat(displayLocale).format(amount);

    if (displayLocale === "en") {
      return `${formatted} coins`;
    }

    if (displayLocale === "zh-TW") {
      return `${formatted} 球幣`;
    }

    if (displayLocale === "th") {
      return `${formatted} เหรียญ`;
    }

    if (displayLocale === "vi") {
      return `${formatted} coin`;
    }

    if (displayLocale === "hi") {
      return `${formatted} coins`;
    }

    return `${formatted} 球币`;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="hero-noise glass-panel overflow-hidden rounded-[2.25rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.22fr_1.12fr]">
          <HomepageBannerShowcase initialBanners={homepageBanners} locale={displayLocale} />
          <HomepageCommandFeed
            title={homePageCopy.commandFeed}
            matches={featuredMatches}
            matchStatusLabels={matchStatusLabels}
            locale={displayLocale}
          />
        </div>
      </section>

      <SiteAdSlot
        ads={homepageInlineAds}
        locale={displayLocale}
        title={
          displayLocale === "en"
            ? "Sponsored picks"
            : displayLocale === "zh-TW"
              ? "推薦入口"
              : displayLocale === "th"
                ? "ช่องแนะนำ"
                : displayLocale === "vi"
                  ? "Lua chon de xuat"
                  : displayLocale === "hi"
                    ? "Recommended picks"
                    : "推荐入口"
        }
      />

      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={homePageCopy.heroEyebrow}
          title={`${homePageCopy.heroTitlePrefix} ${homePageCopy.heroTitleHighlightOne} ${homePageCopy.heroTitleInfix} ${homePageCopy.heroTitleHighlightTwo}`}
          description={homePageCopy.heroDescription}
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href="/live/football"
                className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {homePageCopy.openLiveScores}
              </Link>
              <Link
                href="/member"
                className="rounded-full border border-white/14 bg-white/[0.045] px-5 py-3 text-sm font-medium text-slate-50 transition hover:border-lime-300/28 hover:bg-white/[0.07] hover:text-white"
              >
                {homePageCopy.viewMembershipPlans}
              </Link>
            </div>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {homepageModulesWithMetrics.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="rounded-[1.5rem] border border-white/8 bg-slate-950/38 p-5 transition hover:border-orange-300/20 hover:bg-slate-900/70"
            >
              <p className="section-label">{module.eyebrow}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{module.description}</p>
              <p className="mt-5 text-sm font-semibold text-orange-100">{module.metric}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="section-label">
              {displayLocale === "th"
                ? "ภาพรวมอีสปอร์ต"
                : displayLocale === "vi"
                  ? "Nhịp esports"
                  : displayLocale === "hi"
                    ? "ईस्पोर्ट्स पल्स"
                    : displayLocale === "zh-TW"
                      ? "電競脈搏"
                      : displayLocale === "zh-CN"
                        ? "电竞脉搏"
                        : "Esports Pulse"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400">{displayLocale === "th" ? "ซีรีส์ที่กำลังแข่ง" : displayLocale === "vi" ? "Loạt trận đang diễn ra" : displayLocale === "hi" ? "चल रही सीरीज़" : displayLocale === "en" ? "Live series" : displayLocale === "zh-TW" ? "進行中系列賽" : "进行中系列赛"}</p>
                <p className="mt-2 text-3xl font-semibold text-orange-200">{esportsLiveCount}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">{displayLocale === "th" ? "รายการที่ครอบคลุม" : displayLocale === "vi" ? "Tựa game đã phủ" : displayLocale === "hi" ? "कवर गेम" : displayLocale === "en" ? "Games covered" : displayLocale === "zh-TW" ? "已覆蓋項目" : "已覆盖项目"}</p>
                <p className="mt-2 text-3xl font-semibold text-lime-100">{esportsLeagues.length}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {esportsLeagues.map((league) => (
                <span key={league.slug} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {league.name}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="section-label">{displayLocale === "th" ? "ทางเข้าอีสปอร์ต" : displayLocale === "vi" ? "Lối vào esports" : displayLocale === "hi" ? "ईस्पोर्ट्स एंट्री" : displayLocale === "en" ? "Esports Entry" : displayLocale === "zh-TW" ? "電競入口" : "电竞入口"}</p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {displayLocale === "th" ? "บอร์ดสด LoL, Dota 2 และ CS2" : displayLocale === "vi" ? "Bảng trực tiếp LoL, Dota 2 và CS2" : displayLocale === "hi" ? "LoL, Dota 2 और CS2 लाइव बोर्ड" : displayLocale === "en" ? "LoL, Dota 2, and CS2 live board" : displayLocale === "zh-TW" ? "LoL、Dota 2、CS2 即時面板" : "LoL、Dota 2、CS2 即时面板"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              {displayLocale === "th"
                ? "รวมสถานะซีรีส์ แนวโน้มแผนที่/รอบ และทางเข้ารายละเอียดแมตช์ไว้ในช่องอีสปอร์ตเดียว"
                : displayLocale === "vi"
                  ? "Gộp trạng thái series, đà map/vòng và lối vào chi tiết trận trong một kênh esports duy nhất."
                  : displayLocale === "hi"
                    ? "सीरीज़ स्टेट, मैप/राउंड मोमेंटम और मैच डिटेल एंट्री को एक ही ईस्पोर्ट्स चैनल में रखें।"
                    : displayLocale === "en"
                ? "Open one channel for series state, map/round momentum, and a direct path into the match detail flow."
                : displayLocale === "zh-TW"
                  ? "把系列賽狀態、地圖/回合走勢和賽事詳情入口集中到同一個電競頻道。"
                  : "把系列赛状态、地图/回合走势和赛事详情入口集中到同一个电竞频道。"}
            </p>
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/live/esports"
                  className="rounded-full border border-orange-300/24 bg-orange-300/8 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-300/14"
                >
                  {displayLocale === "th" ? "เปิดอีสปอร์ตสด" : displayLocale === "vi" ? "Mở esports trực tiếp" : displayLocale === "hi" ? "ईस्पोर्ट्स लाइव खोलें" : displayLocale === "en" ? "Open esports live" : displayLocale === "zh-TW" ? "進入電競比分" : "进入电竞比分"}
                </Link>
                <Link
                  href="/plans?sport=esports"
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-50 transition hover:border-lime-300/30 hover:bg-white/[0.08] hover:text-white"
                >
                  {displayLocale === "th" ? "แผนอีสปอร์ต" : displayLocale === "vi" ? "Kế hoạch esports" : displayLocale === "hi" ? "ईस्पोर्ट्स प्लान" : displayLocale === "en" ? "Esports plans" : displayLocale === "zh-TW" ? "電競計畫單" : "电竞计划单"}
                </Link>
                <Link
                  href="/ai-predictions?sport=esports"
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-50 transition hover:border-lime-300/30 hover:bg-white/[0.08] hover:text-white"
                >
                  {displayLocale === "th" ? "AI อีสปอร์ต" : displayLocale === "vi" ? "AI esports" : displayLocale === "hi" ? "ईस्पोर्ट्स AI" : displayLocale === "en" ? "Esports AI" : displayLocale === "zh-TW" ? "電競 AI" : "电竞 AI"}
                </Link>
                <Link
                  href="/database?sport=esports&league=lpl&view=standings"
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-50 transition hover:border-lime-300/30 hover:bg-white/[0.08] hover:text-white"
                >
                  {displayLocale === "th" ? "ฐานข้อมูลอีสปอร์ต" : displayLocale === "vi" ? "CSDL esports" : displayLocale === "hi" ? "ईस्पोर्ट्स डेटाबेस" : displayLocale === "en" ? "Esports database" : displayLocale === "zh-TW" ? "電競資料庫" : "电竞资料库"}
                </Link>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {esportsSpotlightMatches.map((match) => (
                <div key={match.id} className="rounded-[1.15rem] border border-white/8 bg-slate-950/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{match.leagueName ?? match.leagueSlug}</p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {matchStatusLabels[match.status]}
                      {match.clock ? ` | ${match.clock}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={homePageCopy.cricketSpotlight.eyebrow}
          title={homePageCopy.cricketSpotlight.title}
          description={homePageCopy.cricketSpotlight.description}
          action={
            <Link
              href="/live/cricket"
              className="rounded-full border border-orange-300/24 bg-orange-300/8 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-300/14"
            >
              {homePageCopy.cricketSpotlight.openCricket}
            </Link>
          }
        />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">{homePageCopy.cricketSpotlight.liveNow}</p>
              <p className="mt-3 text-4xl font-semibold text-orange-200">{cricketLiveCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">{homePageCopy.cricketSpotlight.leaguesCovered}</p>
              <p className="mt-3 text-4xl font-semibold text-lime-100">{cricketLeagues.length}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cricketLeagues.map((league) => (
                  <span key={league.slug} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {league.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            {cricketSpotlightMatches.map((match) => (
              <div key={match.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="section-label">{match.leagueName ?? match.leagueSlug}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {matchStatusLabels[match.status]}
                    {match.clock ? ` | ${match.clock}` : ""}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span>{formatDateTime(match.kickoff, displayLocale)}</span>
                  <span>{match.score}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{match.statLine}</p>
                <div className="mt-4">
                  <Link
                    href={`/matches/${match.id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                  >
                    {homePageCopy.cricketSpotlight.openMatch}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={homePageCopy.hotRecommendationsEyebrow}
            title={homePageCopy.hotRecommendationsTitle}
            description={homePageCopy.hotRecommendationsDescription}
          />
          <div className="mt-6 grid gap-4">
            {articlePlans.map((plan) => (
              <div key={plan.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{plan.league}</span>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.performance}</span>
                  {plan.isHot ? (
                    <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-100">
                      {homePageCopy.hotTag}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{plan.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatDateTime(plan.kickoff, displayLocale)}</p>
                    <p className="mt-1 text-lg font-semibold text-orange-200">{formatCoinAmount(getArticleCoinPrice(plan.price))}</p>
                  </div>
                  <Link
                    href={`/plans/${plan.slug}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                  >
                    {homePageCopy.openPlan}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={homePageCopy.membershipEyebrow}
              title={homePageCopy.membershipTitle}
              description={homePageCopy.membershipDescription}
            />
            <div className="mt-6 space-y-4">
              {localizedMembershipPlans.map((plan) => (
                <div key={plan.id} className={`rounded-[1.35rem] border border-white/8 bg-gradient-to-r ${plan.accent} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{plan.name}</p>
                      <p className="mt-1 text-sm text-slate-300">{plan.description}</p>
                    </div>
                    <p className="text-xl font-semibold text-orange-100">{formatCoinAmount(getMembershipCoinPrice(plan.price))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading eyebrow={homePageCopy.modelPulseEyebrow} title={homePageCopy.modelPulseTitle} />
            <div className="mt-6 space-y-4">
              {predictions.slice(0, 3).map((prediction) => (
                <div key={prediction.id} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{prediction.market}</p>
                    <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-100">{prediction.confidence}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-orange-200">{prediction.pick}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{prediction.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={homePageCopy.authorEyebrow}
          title={homePageCopy.authorTitle}
          description={homePageCopy.authorDescription}
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {authorTeams.map((author) => (
            <div key={author.id} className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-5">
              <span className="rounded-full bg-sky-400/12 px-3 py-1 text-xs text-sky-100">{author.badge}</span>
              <h3 className="mt-4 text-xl font-semibold text-white">{author.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{author.focus}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-slate-500">{homePageCopy.authorStats.streak}</p>
                  <p className="mt-1 font-semibold text-orange-200">{author.streak}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-slate-500">{homePageCopy.authorStats.winRate}</p>
                  <p className="mt-1 font-semibold text-white">{author.winRate}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-slate-500">{homePageCopy.authorStats.monthlyRoi}</p>
                  <p className="mt-1 font-semibold text-lime-100">{author.monthlyRoi}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-slate-500">{homePageCopy.authorStats.followers}</p>
                  <p className="mt-1 font-semibold text-white">{author.followers}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
