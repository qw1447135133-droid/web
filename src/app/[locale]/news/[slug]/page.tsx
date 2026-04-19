import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { DisplayLocale } from "@/lib/i18n-config";
import { displayLocales, resolveRenderLocale, normalizeDisplayLocale } from "@/lib/i18n-config";
import { getArticleBySlug, getSiteAds } from "@/lib/content-data";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { AdPlaceholder } from "@/components/ad-placeholder";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { formatDateTime } from "@/lib/format";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const dl = locale as DisplayLocale;
  const renderLocale = resolveRenderLocale(normalizeDisplayLocale(dl));
  const article = await getArticleBySlug(slug, renderLocale);
  if (!article) return {};

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost";
  const title = getLocalizedTitle(article, dl);
  const description = article.seoDescription ?? article.teaser;

  return {
    title,
    description,
    alternates: {
      canonical: `https://${domain}/${locale}/news/${slug}`,
      languages: Object.fromEntries(
        displayLocales.map((l) => [l, `https://${domain}/${l}/news/${slug}`])
      ),
    },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: toIso(article.publishedAt),
    },
  };
}

function getLocalizedTitle(article: { titleZhCn?: string | null; titleZhTw?: string | null; titleEn?: string | null; titleTh?: string | null; titleVi?: string | null; title: string }, locale: DisplayLocale): string {
  if (locale === "zh-CN" && article.titleZhCn) return article.titleZhCn;
  if (locale === "zh-TW" && article.titleZhTw) return article.titleZhTw;
  if (locale === "en" && article.titleEn) return article.titleEn;
  if (locale === "th" && article.titleTh) return article.titleTh;
  if (locale === "vi" && article.titleVi) return article.titleVi;
  return article.titleEn ?? article.title;
}

function toIso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : d;
}

function getLocalizedContent(article: { contentZhCn?: string | null; contentZhTw?: string | null; contentEn?: string | null; contentTh?: string | null; contentVi?: string | null; fullAnalysisText?: string; analysis?: string[] }, locale: DisplayLocale): string {
  if (locale === "zh-CN" && article.contentZhCn) return article.contentZhCn;
  if (locale === "zh-TW" && article.contentZhTw) return article.contentZhTw;
  if (locale === "en" && article.contentEn) return article.contentEn;
  if (locale === "th" && article.contentTh) return article.contentTh;
  if (locale === "vi" && article.contentVi) return article.contentVi;
  return article.contentEn ?? article.fullAnalysisText ?? article.analysis?.join("\n\n") ?? "";
}

export default async function ArticleDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const dl = locale as DisplayLocale;
  if (!displayLocales.includes(dl)) notFound();

  const renderLocale = resolveRenderLocale(normalizeDisplayLocale(dl));
  const [article, ads] = await Promise.all([
    getArticleBySlug(slug, renderLocale),
    getSiteAds(dl, "sidebar"),
  ]);

  if (!article || (article.status !== "published" && !article.publishedAt)) notFound();

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost";
  const title = getLocalizedTitle(article, dl);
  const content = getLocalizedContent(article, dl);

  // Article structured data (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: article.seoDescription ?? article.teaser,
    datePublished: toIso(article.publishedAt),
    dateModified: toIso(article.updatedAt),
    author: { "@type": "Organization", name: process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯" },
    publisher: {
      "@type": "Organization",
      name: process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯",
      logo: { "@type": "ImageObject", url: `https://${domain}${process.env.NEXT_PUBLIC_SITE_LOGO_URL ?? "/logo.png"}` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://${domain}/${locale}/news/${slug}` },
    ...(article.aiGenerated ? { isAccessibleForFree: true } : {}),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader locale={dl} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <article>
            <p className="text-xs uppercase tracking-widest text-slate-500">{article.leagueLabel}</p>
            <h1 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">{title}</h1>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              {article.publishedAt && <time dateTime={toIso(article.publishedAt)}>{formatDateTime(toIso(article.publishedAt) ?? "", dl)}</time>}
              {article.aiGenerated && (
                <span className="rounded-full bg-sky-900/40 px-2 py-0.5 text-sky-400">AI 辅助生成</span>
              )}
            </div>
            <p className="mt-4 text-base leading-7 text-slate-300">{article.teaser}</p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              {content.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {article.aiGenerated && (
              <p className="mt-8 text-xs text-slate-600">
                {dl === "vi" ? "Bài viết được tạo bởi AI. Nguồn: " : dl === "th" ? "บทความสร้างโดย AI. แหล่งที่มา: " : "本文由AI辅助生成。"}
                {article.sourceUrl && (
                  <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">
                    {article.sourceUrl}
                  </a>
                )}
              </p>
            )}
          </article>

          <aside className="space-y-6">
            {ads.length > 0 ? (
              <SiteAdSlot ads={ads} locale={dl} />
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
