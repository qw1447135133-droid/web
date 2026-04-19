import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { DisplayLocale } from "@/lib/i18n-config";
import { displayLocales, resolveRenderLocale, normalizeDisplayLocale } from "@/lib/i18n-config";
import { getArticlePlans, getSiteAds } from "@/lib/content-data";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { formatDateTime } from "@/lib/format";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  return displayLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dl = locale as DisplayLocale;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯";
  const titles: Record<DisplayLocale, string> = {
    "zh-CN": `足球资讯 | ${siteName}`,
    "zh-TW": `足球資訊 | ${siteName}`,
    en: `Football News | ${siteName}`,
    th: `ข่าวฟุตบอล | ${siteName}`,
    vi: `Tin tức bóng đá | ${siteName}`,
    hi: `Football News | ${siteName}`,
  };
  return { title: titles[dl] ?? titles["zh-CN"] };
}

function getLocalizedTitle(article: { titleZhCn?: string | null; titleZhTw?: string | null; titleEn?: string | null; titleTh?: string | null; titleVi?: string | null; title: string }, locale: DisplayLocale): string {
  if (locale === "zh-CN" && article.titleZhCn) return article.titleZhCn;
  if (locale === "zh-TW" && article.titleZhTw) return article.titleZhTw;
  if (locale === "en" && article.titleEn) return article.titleEn;
  if (locale === "th" && article.titleTh) return article.titleTh;
  if (locale === "vi" && article.titleVi) return article.titleVi;
  return article.titleEn ?? article.title;
}

function getPageHeading(locale: DisplayLocale): string {
  const map: Record<DisplayLocale, string> = {
    "zh-CN": "足球资讯",
    "zh-TW": "足球資訊",
    en: "Football News",
    th: "ข่าวฟุตบอล",
    vi: "Tin tức bóng đá",
    hi: "Football News",
  };
  return map[locale] ?? map["zh-CN"];
}

export default async function NewsListPage({ params }: Props) {
  const { locale } = await params;
  const dl = locale as DisplayLocale;
  if (!displayLocales.includes(dl)) notFound();

  const renderLocale = resolveRenderLocale(normalizeDisplayLocale(dl));
  const [articles, ads] = await Promise.all([
    getArticlePlans("football", renderLocale),
    getSiteAds(dl, "sidebar"),
  ]);

  const published = articles.filter((a) => a.status === "published" || a.publishedAt != null);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader locale={dl} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div>
            <h1 className="mb-6 text-2xl font-bold">{getPageHeading(dl)}</h1>

            {published.length === 0 ? (
              <p className="text-slate-400">
                {dl === "vi" ? "Chưa có bài viết." : dl === "th" ? "ยังไม่มีบทความ" : "No articles yet."}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {published.map((article) => (
                  <Link
                    key={article.id}
                    href={`/${locale}/news/${article.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <p className="text-xs uppercase tracking-widest text-slate-500">{article.leagueLabel}</p>
                    <h2 className="mt-2 text-base font-semibold leading-snug text-white group-hover:text-sky-300">
                      {getLocalizedTitle(article, dl)}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">{article.teaser}</p>
                    {article.publishedAt && (
                      <p className="mt-3 text-xs text-slate-600">{formatDateTime(article.publishedAt instanceof Date ? article.publishedAt.toISOString() : article.publishedAt, dl)}</p>
                    )}
                    {article.aiGenerated && (
                      <span className="mt-2 inline-block rounded-full bg-sky-900/40 px-2 py-0.5 text-[10px] text-sky-400">AI</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {ads.length > 0 ? (
              <SiteAdSlot ads={ads} locale={dl} title={dl === "vi" ? "Quảng cáo" : dl === "th" ? "โฆษณา" : "广告"} />
            ) : (
              <AdPlaceholder locale={dl} />
            )}
          </aside>
        </div>
      </main>
      <SiteFooter locale={dl} />
    </div>
  );
}
