import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { getArticleCoinPrice } from "@/lib/coin-wallet";
import { getArticlePlans, getAuthorById } from "@/lib/content-data";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getSessionContext } from "@/lib/session";
import { getSiteCopy } from "@/lib/ui-copy";

type Params = Promise<{ authorId: string }>;

function tAuthor(
  locale: DisplayLocale,
  zhCn: string,
  zhTw: string,
  en: string,
  th?: string,
  vi?: string,
  hi?: string,
) {
  if (locale === "zh-TW") return zhTw;
  if (locale === "en") return en;
  if (locale === "th") return th ?? en;
  if (locale === "vi") return vi ?? en;
  if (locale === "hi") return hi ?? en;
  return zhCn;
}

function formatCoinLabel(amount: number, locale: DisplayLocale) {
  const formatted = new Intl.NumberFormat(locale).format(amount);
  if (locale === "en") return `${formatted} coins`;
  if (locale === "zh-TW") return `${formatted} 球幣`;
  if (locale === "th") return `${formatted} เหรียญ`;
  if (locale === "vi") return `${formatted} coin`;
  if (locale === "hi") return `${formatted} coins`;
  return `${formatted} 球币`;
}

export default async function AuthorPage({ params }: { params: Params }) {
  const [locale, displayLocale, { session }] = await Promise.all([
    getCurrentLocale(),
    getCurrentDisplayLocale(),
    getSessionContext(),
  ]);
  const { homePageCopy, uiCopy, plansPageCopy, planDetailCopy } = getSiteCopy(displayLocale);
  const { authorId } = await params;
  const [author, allPlans] = await Promise.all([
    getAuthorById(authorId, locale),
    getArticlePlans(undefined, locale),
  ]);

  if (!author) {
    notFound();
  }

  const authorPlans = allPlans
    .filter((plan) => plan.authorId === author.id)
    .sort((left, right) => new Date(right.kickoff).getTime() - new Date(left.kickoff).getTime());
  const unlockedCount = authorPlans.filter((plan) => canAccessContent(session, plan.id)).length;
  const hotCount = authorPlans.filter((plan) => plan.isHot).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            eyebrow={homePageCopy.authorEyebrow}
            title={author.name}
            description={tAuthor(
              displayLocale,
              `聚合 ${author.focus} 方向的计划单、近期表现与付费入口。`,
              `聚合 ${author.focus} 方向的計畫單、近期表現與付費入口。`,
              `Review ${author.focus} plans, performance snapshots, and paid entry points in one page.`,
              `รวมแผนด้าน ${author.focus} ผลงานล่าสุด และทางเข้าคอนเทนต์แบบชำระเงินไว้หน้าเดียว`,
              `Tong hop plan huong ${author.focus}, hieu suat gan day va diem vao tra phi trong mot trang.`,
              `${author.focus} ke plans, performance snapshot aur paid entry points ek hi page par dekhein.`,
            )}
          />
          <div className="flex flex-wrap gap-3">
            <Link href="/plans" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white">
              {tAuthor(displayLocale, "返回计划单", "返回計畫單", "Back to plans", "กลับไปแผน", "Quay lai plans", "Plans par wapas")}
            </Link>
            <Link href="/member" className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15">
              {tAuthor(displayLocale, "前往会员中心", "前往會員中心", "Open member center", "ไปศูนย์สมาชิก", "Mo trung tam hoi vien", "Member center kholen")}
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs text-orange-100">{author.badge}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{author.focus}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{homePageCopy.authorStats.streak}</p>
            <p className="mt-2 text-2xl font-semibold text-orange-200">{author.streak}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{homePageCopy.authorStats.winRate}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{author.winRate}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{homePageCopy.authorStats.monthlyRoi}</p>
            <p className="mt-2 text-2xl font-semibold text-lime-100">{author.monthlyRoi}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{homePageCopy.authorStats.followers}</p>
            <p className="mt-2 text-2xl font-semibold text-sky-100">{author.followers}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-[1.8rem] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tAuthor(displayLocale, "计划单总数", "計畫單總數", "Total plans", "จำนวนแผนทั้งหมด", "Tong so plan", "Total plans")}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{authorPlans.length}</p>
        </div>
        <div className="glass-panel rounded-[1.8rem] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tAuthor(displayLocale, "已解锁计划单", "已解鎖計畫單", "Unlocked plans", "แผนที่ปลดล็อกแล้ว", "Plan da mo khoa", "Unlocked plans")}</p>
          <p className="mt-3 text-3xl font-semibold text-lime-100">{unlockedCount}</p>
        </div>
        <div className="glass-panel rounded-[1.8rem] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tAuthor(displayLocale, "热门计划单", "熱門計畫單", "Hot plans", "แผนยอดนิยม", "Plan noi bat", "Hot plans")}</p>
          <p className="mt-3 text-3xl font-semibold text-orange-200">{hotCount}</p>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading
          eyebrow={tAuthor(displayLocale, "作者主页", "作者主頁", "Author page", "หน้าโปรไฟล์ผู้เขียน", "Trang tac gia", "Author page")}
          title={tAuthor(displayLocale, "计划单与近期战绩", "計畫單與近期戰績", "Plans and recent performance", "แผนและผลงานล่าสุด", "Plan va hieu suat gan day", "Plans and recent performance")}
          description={tAuthor(
            displayLocale,
            "这里先以计划单表现、命中风格和解锁入口组成作者主页 MVP。",
            "這裡先以計畫單表現、命中風格和解鎖入口組成作者主頁 MVP。",
            "This MVP author page focuses on plan output, hit-style messaging, and unlock entry points.",
            "MVP หน้านี้เน้นแผน ผลงาน และทางเข้าการปลดล็อก",
            "Trang tac gia MVP hien tap trung vao plan, phong cach hieu suat va diem mo khoa.",
            "Yeh MVP author page plan output, hit-style messaging aur unlock entry par focus karta hai.",
          )}
        />

        {authorPlans.length > 0 ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {authorPlans.map((plan) => {
              const unlocked = canAccessContent(session, plan.id);
              const coinPrice = getArticleCoinPrice(plan.price);

              return (
                <article key={plan.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.league}</span>
                    <div className="flex flex-wrap gap-2">
                      {plan.isHot ? <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">HOT</span> : null}
                      <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-100">{plan.performance}</span>
                    </div>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white">{plan.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.tags.map((tag) => (
                      <span key={`${plan.id}-${tag}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{tag}</span>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{planDetailCopy.singlePrice}</p>
                      <p className="mt-2 text-white">{formatCoinLabel(coinPrice, displayLocale)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{plansPageCopy.winRate}</p>
                      <p className="mt-2 text-white">{author.winRate}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{tAuthor(displayLocale, "开赛时间", "開賽時間", "Kickoff", "เวลาแข่ง", "Gio thi dau", "Kickoff")}</p>
                      <p className="mt-2 text-white">{formatDateTime(plan.kickoff, displayLocale)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">{unlocked ? uiCopy.fullAnalysis : uiCopy.teaserOnly}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/plans/${plan.slug}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/25 hover:text-white">
                        {plansPageCopy.viewDetails}
                      </Link>
                      {plan.matchId ? (
                        <Link href={`/matches/${plan.matchId}`} className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15">
                          {uiCopy.viewMatch}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-slate-400">
            {tAuthor(displayLocale, "当前作者还没有可展示的计划单。", "當前作者還沒有可展示的計畫單。", "There are no plans available for this author yet.", "ยังไม่มีแผนของผู้เขียนคนนี้", "Tac gia nay hien chua co plan nao.", "Is author ke liye abhi koi plan nahin hai.")}
          </div>
        )}
      </section>
    </div>
  );
}
