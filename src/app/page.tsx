import Link from "next/link";
import { HomepageBannerShowcase } from "@/components/homepage-banner-showcase";
import { SectionHeading } from "@/components/section-heading";
import { getArticlePlans, getAuthorTeams, getHomepageBanners, getHomepageModules, getPredictions } from "@/lib/content-data";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { membershipPlans } from "@/lib/mock-data";
import { getFeaturedMatches, getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const { homePageCopy, matchStatusLabels } = getSiteCopy(locale);
  const [featuredMatches, homepageBanners, homepageModules, articlePlans, predictions, authorTeams, cricketMatches, cricketLeagues] = await Promise.all([
    getFeaturedMatches(locale),
    getHomepageBanners(locale),
    getHomepageModules(locale),
    getArticlePlans(undefined, locale),
    getPredictions(undefined, locale),
    getAuthorTeams(locale),
    getMatchesBySport("cricket", locale),
    getTrackedLeagues("cricket", locale),
  ]);
  const localizedMembershipPlans = membershipPlans.map((plan) => localizeMembershipPlan(plan, locale));
  const cricketSpotlightMatches = cricketMatches.slice(0, 3);
  const cricketLiveCount = cricketMatches.filter((match) => match.status === "live").length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="hero-noise glass-panel overflow-hidden rounded-[2.25rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.55fr_0.9fr]">
          <HomepageBannerShowcase initialBanners={homepageBanners} locale={locale} />
          <div className="glass-panel rounded-[1.9rem] p-5">
            <p className="section-label">{homePageCopy.commandFeed}</p>
            <div className="mt-4 space-y-4">
              {featuredMatches.map((match) => (
                <div key={match.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-white">
                      {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                    </p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {matchStatusLabels[match.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-orange-200">{match.score}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-400">{match.statLine}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
                className="rounded-full border border-white/12 px-5 py-3 text-sm text-slate-100 transition hover:border-lime-300/28 hover:text-white"
              >
                {homePageCopy.viewMembershipPlans}
              </Link>
            </div>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {homepageModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5 transition hover:border-orange-300/20 hover:bg-white/[0.07]"
            >
              <p className="section-label">{module.eyebrow}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{module.description}</p>
              <p className="mt-5 text-sm font-medium text-orange-200">{module.metric}</p>
            </Link>
          ))}
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
                  <span>{formatDateTime(match.kickoff, locale)}</span>
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
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatDateTime(plan.kickoff, locale)}</p>
                    <p className="mt-1 text-lg font-semibold text-orange-200">{formatPrice(plan.price, locale)}</p>
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
                    <p className="text-xl font-semibold text-orange-100">{formatPrice(plan.price, locale)}</p>
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
