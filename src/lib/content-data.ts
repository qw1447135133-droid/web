import {
  articlePlans as mockArticlePlans,
  authorTeams as mockAuthorTeams,
  getArticleBySlug as getMockArticleBySlug,
  getPredictionByMatchId as getMockPredictionByMatchId,
  homepageBannerSeeds,
  homepageModules as mockHomepageModules,
  predictions as mockPredictions,
  siteAnnouncementSeeds,
} from "@/lib/mock-data";
import {
  localizeArticlePlan,
  localizeAuthorTeam,
  localizeHomepageModule,
  localizePrediction,
} from "@/lib/localized-content";
import {
  getStoredArticlePlanBySlug,
  getStoredArticlePlans,
  getStoredAuthorTeams,
  getStoredHomepageBanners,
  getStoredHomepageModules,
  getStoredPredictionByMatchId,
  getStoredPredictions,
  getStoredSiteAnnouncements,
} from "@/lib/repositories/content-repository";
import { defaultLocale, type Locale } from "@/lib/i18n-config";
import type {
  ArticlePlan,
  AuthorTeam,
  HomepageBanner,
  HomepageModule,
  PredictionRecord,
  SiteAnnouncement,
  Sport,
} from "@/lib/types";

function mergeDefined<T extends object>(fallback: T, primary: T) {
  const resolvedPrimary = Object.fromEntries(
    Object.entries(primary).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

  return {
    ...fallback,
    ...resolvedPrimary,
  } as T;
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]) {
  const merged = new Map<string, T>();

  for (const item of fallback) {
    merged.set(item.id, item);
  }

  for (const item of primary) {
    const existing = merged.get(item.id);
    merged.set(item.id, existing ? mergeDefined(existing, item) : item);
  }

  return Array.from(merged.values());
}

function localizeSiteAnnouncement(
  item: {
    id: string;
    tone: SiteAnnouncement["tone"];
    href?: string;
    titleZhCn: string;
    titleZhTw: string;
    titleEn: string;
    messageZhCn: string;
    messageZhTw: string;
    messageEn: string;
    ctaLabelZhCn?: string;
    ctaLabelZhTw?: string;
    ctaLabelEn?: string;
  },
  locale: Locale,
): SiteAnnouncement {
  const title = locale === "zh-TW" ? item.titleZhTw : locale === "en" ? item.titleEn : item.titleZhCn;
  const message =
    locale === "zh-TW" ? item.messageZhTw : locale === "en" ? item.messageEn : item.messageZhCn;
  const ctaLabel =
    locale === "zh-TW" ? item.ctaLabelZhTw : locale === "en" ? item.ctaLabelEn : item.ctaLabelZhCn;

  return {
    id: item.id,
    title,
    message,
    href: item.href,
    ctaLabel,
    tone: item.tone,
  };
}

function localizeHomepageBanner(
  item: {
    id: string;
    theme: HomepageBanner["theme"];
    href: string;
    imageUrl: string;
    titleZhCn: string;
    titleZhTw: string;
    titleEn: string;
    subtitleZhCn: string;
    subtitleZhTw: string;
    subtitleEn: string;
    descriptionZhCn: string;
    descriptionZhTw: string;
    descriptionEn: string;
    ctaLabelZhCn: string;
    ctaLabelZhTw: string;
    ctaLabelEn: string;
  },
  locale: Locale,
): HomepageBanner {
  return {
    id: item.id,
    title: locale === "zh-TW" ? item.titleZhTw : locale === "en" ? item.titleEn : item.titleZhCn,
    subtitle:
      locale === "zh-TW" ? item.subtitleZhTw : locale === "en" ? item.subtitleEn : item.subtitleZhCn,
    description:
      locale === "zh-TW"
        ? item.descriptionZhTw
        : locale === "en"
          ? item.descriptionEn
          : item.descriptionZhCn,
    href: item.href,
    ctaLabel:
      locale === "zh-TW" ? item.ctaLabelZhTw : locale === "en" ? item.ctaLabelEn : item.ctaLabelZhCn,
    imageUrl: item.imageUrl,
    theme: item.theme,
  };
}

export async function getHomepageBanners(locale: Locale = defaultLocale): Promise<HomepageBanner[]> {
  const storedBanners = await getStoredHomepageBanners();
  const fallbackBanners = homepageBannerSeeds.map((item) => ({
    id: item.id,
    theme: item.theme,
    href: item.href,
    imageUrl: item.imageUrl,
    titleZhCn: item.translations["zh-CN"].title,
    titleZhTw: item.translations["zh-TW"].title,
    titleEn: item.translations.en.title,
    subtitleZhCn: item.translations["zh-CN"].subtitle,
    subtitleZhTw: item.translations["zh-TW"].subtitle,
    subtitleEn: item.translations.en.subtitle,
    descriptionZhCn: item.translations["zh-CN"].description,
    descriptionZhTw: item.translations["zh-TW"].description,
    descriptionEn: item.translations.en.description,
    ctaLabelZhCn: item.translations["zh-CN"].ctaLabel,
    ctaLabelZhTw: item.translations["zh-TW"].ctaLabel,
    ctaLabelEn: item.translations.en.ctaLabel,
  }));

  const source = storedBanners.length > 0 ? storedBanners : fallbackBanners;
  return source.map((item) => localizeHomepageBanner(item, locale));
}

export async function getHomepageModules(locale: Locale = defaultLocale): Promise<HomepageModule[]> {
  const modules = await getStoredHomepageModules();
  const source = mergeById(modules, mockHomepageModules);
  return source.map((item) => localizeHomepageModule(item, locale));
}

export async function getSiteAnnouncements(locale: Locale = defaultLocale): Promise<SiteAnnouncement[]> {
  const storedAnnouncements = await getStoredSiteAnnouncements();
  const fallbackAnnouncements = siteAnnouncementSeeds.map((item) => ({
    id: item.id,
    title: item.translations["zh-CN"].title,
    message: item.translations["zh-CN"].message,
    ctaLabel: item.translations["zh-CN"].ctaLabel,
    tone: item.tone,
    href: item.href,
    titleZhCn: item.translations["zh-CN"].title,
    titleZhTw: item.translations["zh-TW"].title,
    titleEn: item.translations.en.title,
    messageZhCn: item.translations["zh-CN"].message,
    messageZhTw: item.translations["zh-TW"].message,
    messageEn: item.translations.en.message,
    ctaLabelZhCn: item.translations["zh-CN"].ctaLabel,
    ctaLabelZhTw: item.translations["zh-TW"].ctaLabel,
    ctaLabelEn: item.translations.en.ctaLabel,
  }));

  const source = storedAnnouncements.length > 0 ? storedAnnouncements : fallbackAnnouncements;
  return source.map((item) => localizeSiteAnnouncement(item, locale));
}

export async function getAuthorTeams(locale: Locale = defaultLocale): Promise<AuthorTeam[]> {
  const authors = await getStoredAuthorTeams();
  const source = mergeById(authors, mockAuthorTeams);
  return source.map((item) => localizeAuthorTeam(item, locale));
}

export async function getArticlePlans(sport?: Sport, locale: Locale = defaultLocale): Promise<ArticlePlan[]> {
  const plans = await getStoredArticlePlans(sport);
  const fallback = sport ? mockArticlePlans.filter((item) => item.sport === sport) : mockArticlePlans;
  const source = mergeById(plans, fallback);

  return source.map((item) => localizeArticlePlan(item, locale));
}

export async function getArticleBySlug(slug: string, locale: Locale = defaultLocale): Promise<ArticlePlan | undefined> {
  const plan = await getStoredArticlePlanBySlug(slug);
  const fallback = getMockArticleBySlug(slug);
  const source = plan && fallback ? mergeDefined(fallback, plan) : (plan ?? fallback);
  return source ? localizeArticlePlan(source, locale) : undefined;
}

export async function getPredictions(sport?: Sport, locale: Locale = defaultLocale): Promise<PredictionRecord[]> {
  const predictions = await getStoredPredictions(sport);
  const fallback = sport ? mockPredictions.filter((item) => item.sport === sport) : mockPredictions;
  const source = mergeById(predictions, fallback);

  return source.map((item) => localizePrediction(item, locale));
}

export async function getPredictionByMatchId(matchId: string, locale: Locale = defaultLocale): Promise<PredictionRecord | undefined> {
  const prediction = await getStoredPredictionByMatchId(matchId);
  const fallback = getMockPredictionByMatchId(matchId) ?? undefined;
  const source = prediction && fallback ? mergeDefined(fallback, prediction) : (prediction ?? fallback);
  return source ? localizePrediction(source, locale) : undefined;
}
