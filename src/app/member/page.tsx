import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { membershipPlans } from "@/lib/mock-data";
import {
  getOrderActivityMeta,
  getOrderFailureMeta,
  getOrderStatusMeta,
  getPaymentResultMeta,
} from "@/lib/payment-ui";
import { getSessionContext } from "@/lib/session";
import { getArticlePlans } from "@/lib/content-data";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function MemberPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { memberPageCopy, roleLabels, uiCopy } = getSiteCopy(locale);
  const [{ session, entitlements }, articlePlans, resolved] = await Promise.all([
    getSessionContext(),
    getArticlePlans(undefined, locale),
    searchParams,
  ]);
  const localizedMembershipPlans = membershipPlans.map((plan) => localizeMembershipPlan(plan, locale));
  const unlockedPlans = articlePlans.filter((plan) => canAccessContent(session, plan.id));
  const payment = readValue(resolved.payment);
  const paymentResult = getPaymentResultMeta("member", payment, locale);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading
          eyebrow={memberPageCopy.heroEyebrow}
          title={session.role === "visitor" ? memberPageCopy.heroTitle : memberPageCopy.heroTitleFor(session.displayName)}
          description={memberPageCopy.heroDescription}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.currentRole}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{roleLabels[session.role]}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.memberStatus}</p>
            <p className="mt-2 text-2xl font-semibold text-orange-200">
              {entitlements.activeMembership ? uiCopy.memberStatusActive : uiCopy.memberStatusInactive}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.unlockedPlans}</p>
            <p className="mt-2 text-2xl font-semibold text-lime-100">{unlockedPlans.length}</p>
          </div>
        </div>

        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={memberPageCopy.plansEyebrow}
            title={memberPageCopy.plansTitle}
            description={memberPageCopy.plansDescription}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {localizedMembershipPlans.map((plan) => (
              <div key={plan.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{memberPageCopy.durationLabel(plan.durationDays)}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{plan.description}</p>
                <p className="mt-5 text-3xl font-semibold text-orange-200">{formatPrice(plan.price, locale)}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {plan.perks.map((perk) => (
                    <li key={perk}>- {perk}</li>
                  ))}
                </ul>
                {session.role === "visitor" ? (
                  <Link
                    href="/login?next=%2Fmember"
                    className="mt-6 inline-flex rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                  >
                    {memberPageCopy.buyAfterLogin}
                  </Link>
                ) : (
                  <form action="/api/member/purchase" method="post" className="mt-6">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="returnTo" value="/member" />
                    <button
                      type="submit"
                      className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                    >
                      {memberPageCopy.payNow}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading eyebrow={memberPageCopy.ordersEyebrow} title={memberPageCopy.ordersTitle} />
            <div className="mt-6 space-y-4">
              {session.membershipOrders.length === 0 && session.contentOrders.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {memberPageCopy.emptyOrders}
                </div>
              ) : null}

              {session.membershipOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status, locale);
                const activityMeta = getOrderActivityMeta(order, locale);
                const failureMeta = getOrderFailureMeta(order, locale);
                const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";

                return (
                  <div key={order.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-white">
                        {memberPageCopy.membershipOrder} | {order.planId}
                      </p>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>
                        {memberPageCopy.createdAt} {formatDateTime(order.createdAt, locale)}
                      </span>
                      <span>{formatPrice(order.amount, locale)}</span>
                      {activityMeta.value ? (
                        <span>
                          {activityMeta.label} {formatDateTime(activityMeta.value, locale)}
                        </span>
                      ) : null}
                    </div>
                    {order.paymentReference ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.paymentReference} {order.paymentReference}
                      </p>
                    ) : null}
                    {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                  </div>
                );
              })}

              {session.contentOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status, locale);
                const activityMeta = getOrderActivityMeta(order, locale);
                const failureMeta = getOrderFailureMeta(order, locale);
                const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";

                return (
                  <div key={order.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-white">
                        {memberPageCopy.contentOrder} | {order.contentId}
                      </p>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>
                        {memberPageCopy.createdAt} {formatDateTime(order.createdAt, locale)}
                      </span>
                      <span>{formatPrice(order.amount, locale)}</span>
                      {activityMeta.value ? (
                        <span>
                          {activityMeta.label} {formatDateTime(activityMeta.value, locale)}
                        </span>
                      ) : null}
                    </div>
                    {order.paymentReference ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.paymentReference} {order.paymentReference}
                      </p>
                    ) : null}
                    {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading eyebrow={memberPageCopy.entitlementsEyebrow} title={memberPageCopy.entitlementsTitle} />
            {entitlements.activeMembership ? (
              <p className="mt-4 rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-100">
                {memberPageCopy.membershipUnlockedNotice}
              </p>
            ) : null}
            <div className="mt-6 space-y-4">
              {unlockedPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.slug}`}
                  className="block rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-lime-300/25"
                >
                  <p className="font-medium text-white">{plan.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{plan.league}</p>
                </Link>
              ))}

              {unlockedPlans.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {memberPageCopy.emptyUnlockedPlans}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
