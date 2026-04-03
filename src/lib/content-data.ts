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
  Match,
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

function mergeByKey<T extends object>(primary: T[], fallback: T[], getKey: (item: T) => string) {
  const merged = new Map<string, T>();

  for (const item of fallback) {
    merged.set(getKey(item), item);
  }

  for (const item of primary) {
    const key = getKey(item);
    const existing = merged.get(key);
    merged.set(key, existing ? mergeDefined(existing, item) : item);
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

type HomepageModuleMetricInput = {
  footballMatches: Match[];
  basketballMatches: Match[];
  cricketMatches: Match[];
  esportsMatches: Match[];
  cricketLeagueCount: number;
  esportsLeagueCount: number;
  authorCount: number;
  articlePlanCount: number;
  predictions: Array<{ result: string }>;
};

function resolveEsportsCircuitCount(matches: Match[]) {
  const circuits = new Set<string>();

  for (const match of matches) {
    if (match.leagueSlug === "lpl") {
      circuits.add("lol");
    } else if (match.leagueSlug === "dreamleague") {
      circuits.add("dota2");
    } else {
      circuits.add("cs2");
    }
  }

  return circuits.size;
}

function getHomepageModuleCode(module: HomepageModule) {
  return module.key ?? module.id;
}

function formatHitRate(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function applyHomepageModuleMetrics(
  modules: HomepageModule[],
  input: HomepageModuleMetricInput,
  locale: Locale = defaultLocale,
): HomepageModule[] {
  const allMatches = [
    ...input.footballMatches,
    ...input.basketballMatches,
    ...input.cricketMatches,
    ...input.esportsMatches,
  ];
  const liveMatches = allMatches.filter((match) => match.status === "live").length;
  const sportsCovered = new Set(allMatches.map((match) => match.sport)).size;
  const settledPredictions = input.predictions.filter((prediction) => prediction.result !== "pending");
  const wonPredictions = settledPredictions.filter((prediction) => prediction.result === "won").length;
  const hitRate = settledPredictions.length > 0 ? (wonPredictions / settledPredictions.length) * 100 : null;
  const esportsLiveCount = input.esportsMatches.filter((match) => match.status === "live").length;
  const esportsCircuitCount = resolveEsportsCircuitCount(input.esportsMatches);

  return modules.map((module) => {
    const moduleCode = getHomepageModuleCode(module);

    if (moduleCode === "scores") {
      return {
        ...module,
        metric:
          locale === "en"
            ? `${liveMatches} live / ${sportsCovered} sports`
            : locale === "zh-TW"
              ? `${liveMatches} 場進行中 / ${sportsCovered} 個項目`
              : `${liveMatches} 场进行中 / ${sportsCovered} 个项目`,
      };
    }

    if (moduleCode === "plans") {
      return {
        ...module,
        metric:
          locale === "en"
            ? `${input.authorCount} authors / ${input.articlePlanCount} plans`
            : locale === "zh-TW"
              ? `${input.authorCount} 位作者 / ${input.articlePlanCount} 條計畫單`
              : `${input.authorCount} 位作者 / ${input.articlePlanCount} 条计划单`,
      };
    }

    if (moduleCode === "ai") {
      return {
        ...module,
        metric:
          hitRate == null
            ? locale === "en"
              ? `${input.predictions.length} predictions online`
              : locale === "zh-TW"
                ? `${input.predictions.length} 條預測在線`
                : `${input.predictions.length} 条预测在线`
            : locale === "en"
              ? `${formatHitRate(hitRate)}% hit rate / ${settledPredictions.length} settled`
              : locale === "zh-TW"
                ? `${formatHitRate(hitRate)}% 命中 / ${settledPredictions.length} 條已結算`
                : `${formatHitRate(hitRate)}% 命中 / ${settledPredictions.length} 条已结算`,
      };
    }

    if (moduleCode === "cricket") {
      return {
        ...module,
        metric:
          locale === "en"
            ? `${input.cricketMatches.length} fixtures / ${input.cricketLeagueCount} leagues`
            : locale === "zh-TW"
              ? `${input.cricketMatches.length} 場賽事 / ${input.cricketLeagueCount} 個聯賽`
              : `${input.cricketMatches.length} 场赛事 / ${input.cricketLeagueCount} 个联赛`,
      };
    }

    if (moduleCode === "esports") {
      return {
        ...module,
        metric:
          locale === "en"
            ? `${esportsLiveCount} live / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} circuits`
            : locale === "zh-TW"
              ? `${esportsLiveCount} 場進行中 / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} 條賽道`
              : `${esportsLiveCount} 场进行中 / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} 条赛道`,
      };
    }

    return module;
  });
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
  const source = mergeByKey(modules, mockHomepageModules, (item) => item.key ?? item.id);
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
