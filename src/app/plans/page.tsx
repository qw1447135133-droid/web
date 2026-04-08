import Link from "next/link";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { SectionHeading } from "@/components/section-heading";
import { getArticleCoinPrice } from "@/lib/coin-wallet";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getPaymentResultMeta } from "@/lib/payment-ui";
import { getSessionContext } from "@/lib/session";
import { getArticlePlans, getAuthorTeams, getSiteAds } from "@/lib/content-data";
import type { Sport } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PlanSportFilter = Sport | "all";

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getPlanFilterCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      filterLabel: "Content lane",
      all: "All",
      football: "Football",
      basketball: "Basketball",
      cricket: "Cricket",
      esports: "Esports",
      empty: "No plans are available in this lane right now.",
      authorHint: "The author rail follows the currently selected lane.",
    };
  }

  if (locale === "zh-TW") {
    return {
      filterLabel: "內容賽道",
      all: "全部",
      football: "足球",
      basketball: "籃球",
      cricket: "板球",
      esports: "電競",
      empty: "目前這條賽道還沒有可顯示的計畫單。",
      authorHint: "作者面板會跟隨目前選中的內容賽道。",
    };
  }

  if (locale === "th") {
    return {
      filterLabel: "หมวดคอนเทนต์",
      all: "ทั้งหมด",
      football: "ฟุตบอล",
      basketball: "บาสเกตบอล",
      cricket: "คริกเก็ต",
      esports: "อีสปอร์ต",
      empty: "ยังไม่มีแผนในหมวดนี้ตอนนี้",
      authorHint: "แถบผู้เขียนจะเปลี่ยนตามหมวดที่เลือก",
    };
  }

  if (locale === "vi") {
    return {
      filterLabel: "Tuyen noi dung",
      all: "Tat ca",
      football: "Bong da",
      basketball: "Bong ro",
      cricket: "Cricket",
      esports: "Esports",
      empty: "Hien chua co plan nao trong nhom nay.",
      authorHint: "Thanh tac gia se di theo nhom noi dung dang chon.",
    };
  }

  if (locale === "hi") {
    return {
      filterLabel: "Content lane",
      all: "Sabhi",
      football: "Football",
      basketball: "Basketball",
      cricket: "Cricket",
      esports: "Esports",
      empty: "Is lane mein abhi koi plan uplabdh nahin hai.",
      authorHint: "Author rail ab chuni hui lane ke saath sync hoti hai.",
    };
  }

  return {
    filterLabel: "内容赛道",
    all: "全部",
    football: "足球",
    basketball: "篮球",
    cricket: "板球",
    esports: "电竞",
    empty: "当前这条赛道还没有可显示的计划单。",
    authorHint: "作者面板会跟随当前选中的内容赛道。",
  };
}

function buildPlansHrefWithCoinState(
  sport: PlanSportFilter,
  payment: string | undefined,
  coin: string | undefined,
) {
  const params = new URLSearchParams();

  if (sport !== "all") {
    params.set("sport", sport);
  }

  if (payment) {
    params.set("payment", payment);
  }

  if (coin) {
    params.set("coin", coin);
  }

  const query = params.toString();
  return query ? `/plans?${query}` : "/plans";
}

function getCoinPurchaseMessage(
  coin: string,
  locale: DisplayLocale,
) {
  if (coin === "success") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 px-5 py-4 text-sm text-lime-100",
      message:
        locale === "en"
          ? "Content unlocked with coins."
          : locale === "zh-TW"
            ? "已使用球幣解鎖內容。"
            : locale === "th"
              ? "ปลดล็อกคอนเทนต์ด้วยเหรียญแล้ว"
              : locale === "vi"
                ? "Da mo khoa noi dung bang coin."
                : locale === "hi"
                  ? "कॉन्टेंट कॉइन्स से अनलॉक हो गया।"
                  : "已使用球币解锁内容。",
    };
  }

  if (coin === "insufficient") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        locale === "en"
          ? "Coin balance is insufficient. Recharge from the member center first."
          : locale === "zh-TW"
            ? "球幣餘額不足，請先到會員中心充值。"
            : locale === "th"
              ? "เหรียญไม่พอ กรุณาเติมในศูนย์สมาชิกก่อน"
              : locale === "vi"
                ? "So du coin khong du, hay nap them trong trung tam hoi vien."
                : locale === "hi"
                  ? "कॉइन बैलेंस पर्याप्त नहीं है, पहले सदस्य केंद्र में रिचार्ज करें।"
                  : "球币余额不足，请先到会员中心充值。",
    };
  }

  if (coin === "error") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        locale === "en"
          ? "Coin unlock failed. Please try again."
          : locale === "zh-TW"
            ? "球幣解鎖失敗，請稍後重試。"
            : locale === "th"
              ? "ปลดล็อกด้วยเหรียญไม่สำเร็จ กรุณาลองใหม่"
              : locale === "vi"
                ? "Mo khoa bang coin that bai, vui long thu lai."
                : locale === "hi"
                  ? "कॉइन अनलॉक विफल रहा, कृपया फिर कोशिश करें।"
                  : "球币解锁失败，请稍后重试。",
    };
  }

  return null;
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { plansPageCopy, uiCopy } = getSiteCopy(displayLocale);
  const filterCopy = getPlanFilterCopy(displayLocale);
  const [{ session, entitlements }, articlePlans, authorTeams, plansInlineAds, resolved] = await Promise.all([
    getSessionContext(),
    getArticlePlans(undefined, locale),
    getAuthorTeams(locale),
    getSiteAds(locale, "plans-inline"),
    searchParams,
  ]);
  const payment = readValue(resolved.payment);
  const coin = readValue(resolved.coin);
  const selectedSport = readValue(resolved.sport, "all") as PlanSportFilter;
  const paymentResult = getPaymentResultMeta("plans", payment, displayLocale);
  const coinResult = getCoinPurchaseMessage(coin, displayLocale);
  const sportOptions: PlanSportFilter[] = ["all", "football", "basketball", "cricket", "esports"];
  const filteredPlans = selectedSport === "all" ? articlePlans : articlePlans.filter((plan) => plan.sport === selectedSport);
  const visibleAuthorIds = new Set(filteredPlans.map((plan) => plan.authorId));
  const visibleAuthors = authorTeams.filter((author) => selectedSport === "all" || visibleAuthorIds.has(author.id));
  const returnTo = selectedSport === "all" ? "/plans" : `/plans?sport=${selectedSport}`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={plansPageCopy.heroEyebrow}
          title={plansPageCopy.heroTitle}
          description={plansPageCopy.heroDescription}
        />
        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}

        <div className="mt-6 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-400">{filterCopy.filterLabel}</p>
            {sportOptions.map((option) => {
              const active = selectedSport === option;

              return (
                <Link
                  key={option}
                  href={buildPlansHrefWithCoinState(option, payment, coin)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-orange-300/40 bg-orange-300/12 text-orange-100"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {filterCopy[option]}
                </Link>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-slate-400">{filterCopy.authorHint}</p>
        </div>
        {coinResult ? <div className={coinResult.className}>{coinResult.message}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {visibleAuthors.map((author) => (
            <Link
              key={author.id}
              href={`/authors/${author.id}`}
              className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-orange-300/25 hover:bg-white/[0.05]"
            >
              <p className="text-sm font-medium text-white">{author.name}</p>
              <p className="mt-2 text-xs text-slate-500">{author.focus}</p>
              <p className="mt-4 text-2xl font-semibold text-orange-200">{author.streak}</p>
              <p className="mt-2 text-sm text-slate-300">
                {plansPageCopy.winRate} {author.winRate} | ROI {author.monthlyRoi}
              </p>
              <p className="mt-4 text-xs text-sky-100">{plansPageCopy.viewDetails}</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteAdSlot ads={plansInlineAds} locale={displayLocale} />

      <section className="grid gap-4 xl:grid-cols-3">
        {filteredPlans.length === 0 ? (
          <div className="glass-panel rounded-[1.8rem] border border-dashed border-white/12 p-6 text-sm text-slate-400 xl:col-span-3">
            {filterCopy.empty}
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const unlocked = canAccessContent(session, plan.id);
            const coinPrice = getArticleCoinPrice(plan.price);

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
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatDateTime(plan.kickoff, displayLocale)}</p>
                  <p className="mt-2 text-sm text-slate-300">{plan.marketSummary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-orange-200">
                        {displayLocale === "en"
                          ? `${coinPrice} coins`
                          : displayLocale === "zh-TW"
                            ? `${coinPrice} 球幣`
                            : displayLocale === "th"
                              ? `${coinPrice} เหรียญ`
                              : displayLocale === "vi"
                                ? `${coinPrice} coin`
                                : displayLocale === "hi"
                                  ? `${coinPrice} coins`
                                  : `${coinPrice} 球币`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{plan.marketSummary}</p>
                    </div>
                    {unlocked ? (
                      <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-100">{uiCopy.unlocked}</span>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action="/api/content/purchase-coins" method="post">
                          <input type="hidden" name="contentId" value={plan.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            type="submit"
                            className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/15"
                          >
                            {displayLocale === "en"
                              ? `${coinPrice} coins`
                              : displayLocale === "zh-TW"
                                ? `${coinPrice} 球幣解鎖`
                                : displayLocale === "th"
                                  ? `${coinPrice} เหรียญ`
                                  : displayLocale === "vi"
                                    ? `${coinPrice} coin`
                                    : displayLocale === "hi"
                                      ? `${coinPrice} coins`
                                      : `${coinPrice} 球币解锁`}
                          </button>
                        </form>
                      </div>
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
          })
        )}
      </section>
    </div>
  );
}
