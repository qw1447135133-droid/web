import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
import { getPaymentResultMeta } from "@/lib/payment-ui";
import { getSessionContext } from "@/lib/session";
import { getArticlePlans, getAuthorTeams } from "@/lib/content-data";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { plansPageCopy, uiCopy } = getSiteCopy(locale);
  const [{ session, entitlements }, articlePlans, authorTeams, resolved] = await Promise.all([
    getSessionContext(),
    getArticlePlans(undefined, locale),
    getAuthorTeams(locale),
    searchParams,
  ]);
  const payment = readValue(resolved.payment);
  const paymentResult = getPaymentResultMeta("plans", payment, locale);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={plansPageCopy.heroEyebrow}
          title={plansPageCopy.heroTitle}
          description={plansPageCopy.heroDescription}
        />
        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {authorTeams.map((author) => (
            <div key={author.id} className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">{author.name}</p>
              <p className="mt-2 text-xs text-slate-500">{author.focus}</p>
              <p className="mt-4 text-2xl font-semibold text-orange-200">{author.streak}</p>
              <p className="mt-2 text-sm text-slate-300">
                {plansPageCopy.winRate} {author.winRate} | ROI {author.monthlyRoi}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {articlePlans.map((plan) => {
          const unlocked = canAccessContent(session, plan.id);

          return (
            <article key={plan.id} className="glass-panel flex flex-col rounded-[1.8rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.league}</span>
                <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{plan.performance}</span>
              </div>

              <h2 className="mt-4 text-2xl font-semibold text-white">{plan.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {plan.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatDateTime(plan.kickoff, locale)}</p>
                <p className="mt-2 text-sm text-slate-300">{plan.marketSummary}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-orange-200">{formatPrice(plan.price, locale)}</p>
                  {unlocked ? (
                    <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-100">{uiCopy.unlocked}</span>
                  ) : (
                    <form action="/api/content/purchase" method="post">
                      <input type="hidden" name="contentId" value={plan.id} />
                      <input type="hidden" name="returnTo" value="/plans" />
                      <button
                        type="submit"
                        className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                      >
                        {plansPageCopy.payNow}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {unlocked ? uiCopy.fullAnalysis : uiCopy.teaserOnly}
                  {entitlements.activeMembership ? plansPageCopy.membershipBundleActive : ""}
                </p>
                <div className="flex items-center gap-2">
                  {plan.matchId ? (
                    <Link
                      href={`/matches/${plan.matchId}`}
                      className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15"
                    >
                      {uiCopy.viewMatch}
                    </Link>
                  ) : null}
                  <Link
                    href={`/plans/${plan.slug}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:text-white"
                  >
                    {plansPageCopy.viewDetails}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
