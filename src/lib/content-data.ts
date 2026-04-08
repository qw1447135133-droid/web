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
import { defaultLocale, resolveRenderLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";
import type {
  ArticlePlan,
  AuthorTeam,
  HomepageBanner,
  HomepageModule,
  Match,
  PredictionRecord,
  SiteAd,
  SiteAnnouncement,
  Sport,
} from "@/lib/types";
import { getSiteAds as getManagedSiteAds } from "@/lib/site-ads";

export type SiteContentIncludeKey =
  | "banners"
  | "announcements"
  | "ads"
  | "homepageModules"
  | "authors"
  | "articlePlans"
  | "predictions";

export type SiteContentPayload = {
  banners?: HomepageBanner[];
  announcements?: SiteAnnouncement[];
  ads?: SiteAd[];
  homepageModules?: HomepageModule[];
  authors?: AuthorTeam[];
  articlePlans?: ArticlePlan[];
  predictions?: PredictionRecord[];
};

type ContentLocale = Locale | DisplayLocale;

function resolveContentLocale(locale: ContentLocale): Locale {
  return resolveRenderLocale(locale as DisplayLocale);
}

function resolveDisplayContentLocale(locale: ContentLocale): DisplayLocale {
  if (
    locale === "zh-CN" ||
    locale === "zh-TW" ||
    locale === "en" ||
    locale === "th" ||
    locale === "vi" ||
    locale === "hi"
  ) {
    return locale;
  }

  return resolveContentLocale(locale);
}

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
    titleTh: string;
    titleVi: string;
    titleHi: string;
    messageZhCn: string;
    messageZhTw: string;
    messageEn: string;
    messageTh: string;
    messageVi: string;
    messageHi: string;
    ctaLabelZhCn?: string;
    ctaLabelZhTw?: string;
    ctaLabelEn?: string;
    ctaLabelTh?: string;
    ctaLabelVi?: string;
    ctaLabelHi?: string;
  },
  locale: ContentLocale,
): SiteAnnouncement {
  const displayLocale = resolveDisplayContentLocale(locale);
  const title =
    displayLocale === "zh-TW"
      ? item.titleZhTw
      : displayLocale === "en"
        ? item.titleEn
        : displayLocale === "th"
          ? item.titleTh || item.titleEn || item.titleZhCn
          : displayLocale === "vi"
            ? item.titleVi || item.titleEn || item.titleZhCn
            : displayLocale === "hi"
              ? item.titleHi || item.titleEn || item.titleZhCn
              : item.titleZhCn;
  const message =
    displayLocale === "zh-TW"
      ? item.messageZhTw
      : displayLocale === "en"
        ? item.messageEn
        : displayLocale === "th"
          ? item.messageTh || item.messageEn || item.messageZhCn
          : displayLocale === "vi"
            ? item.messageVi || item.messageEn || item.messageZhCn
            : displayLocale === "hi"
              ? item.messageHi || item.messageEn || item.messageZhCn
              : item.messageZhCn;
  const ctaLabel =
    displayLocale === "zh-TW"
      ? item.ctaLabelZhTw
      : displayLocale === "en"
        ? item.ctaLabelEn
        : displayLocale === "th"
          ? item.ctaLabelTh || item.ctaLabelEn || item.ctaLabelZhCn
          : displayLocale === "vi"
            ? item.ctaLabelVi || item.ctaLabelEn || item.ctaLabelZhCn
            : displayLocale === "hi"
              ? item.ctaLabelHi || item.ctaLabelEn || item.ctaLabelZhCn
              : item.ctaLabelZhCn;

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
    titleTh: string;
    titleVi: string;
    titleHi: string;
    subtitleZhCn: string;
    subtitleZhTw: string;
    subtitleEn: string;
    subtitleTh: string;
    subtitleVi: string;
    subtitleHi: string;
    descriptionZhCn: string;
    descriptionZhTw: string;
    descriptionEn: string;
    descriptionTh: string;
    descriptionVi: string;
    descriptionHi: string;
    ctaLabelZhCn: string;
    ctaLabelZhTw: string;
    ctaLabelEn: string;
    ctaLabelTh: string;
    ctaLabelVi: string;
    ctaLabelHi: string;
  },
  locale: ContentLocale,
): HomepageBanner {
  const displayLocale = resolveDisplayContentLocale(locale);
  return {
    id: item.id,
    title:
      displayLocale === "zh-TW"
        ? item.titleZhTw
        : displayLocale === "en"
          ? item.titleEn
          : displayLocale === "th"
            ? item.titleTh || item.titleEn || item.titleZhCn
            : displayLocale === "vi"
              ? item.titleVi || item.titleEn || item.titleZhCn
              : displayLocale === "hi"
                ? item.titleHi || item.titleEn || item.titleZhCn
                : item.titleZhCn,
    subtitle:
      displayLocale === "zh-TW"
        ? item.subtitleZhTw
        : displayLocale === "en"
          ? item.subtitleEn
          : displayLocale === "th"
            ? item.subtitleTh || item.subtitleEn || item.subtitleZhCn || item.titleTh || item.titleEn || item.titleZhCn
            : displayLocale === "vi"
              ? item.subtitleVi || item.subtitleEn || item.subtitleZhCn || item.titleVi || item.titleEn || item.titleZhCn
              : displayLocale === "hi"
                ? item.subtitleHi || item.subtitleEn || item.subtitleZhCn || item.titleHi || item.titleEn || item.titleZhCn
                : item.subtitleZhCn,
    description:
      displayLocale === "zh-TW"
        ? item.descriptionZhTw
        : displayLocale === "en"
          ? item.descriptionEn
          : displayLocale === "th"
            ? item.descriptionTh || item.descriptionEn || item.descriptionZhCn
            : displayLocale === "vi"
              ? item.descriptionVi || item.descriptionEn || item.descriptionZhCn
              : displayLocale === "hi"
                ? item.descriptionHi || item.descriptionEn || item.descriptionZhCn
                : item.descriptionZhCn,
    href: item.href,
    ctaLabel:
      displayLocale === "zh-TW"
        ? item.ctaLabelZhTw
        : displayLocale === "en"
          ? item.ctaLabelEn
          : displayLocale === "th"
            ? item.ctaLabelTh || item.ctaLabelEn || item.ctaLabelZhCn
            : displayLocale === "vi"
              ? item.ctaLabelVi || item.ctaLabelEn || item.ctaLabelZhCn
              : displayLocale === "hi"
                ? item.ctaLabelHi || item.ctaLabelEn || item.ctaLabelZhCn
                : item.ctaLabelZhCn,
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
  locale: ContentLocale = defaultLocale,
): HomepageModule[] {
  const renderLocale = resolveContentLocale(locale);
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
          renderLocale === "en"
            ? `${liveMatches} live / ${sportsCovered} sports`
            : renderLocale === "zh-TW"
              ? `${liveMatches} 場進行中 / ${sportsCovered} 個項目`
              : `${liveMatches} 场进行中 / ${sportsCovered} 个项目`,
      };
    }

    if (moduleCode === "plans") {
      return {
        ...module,
        metric:
          renderLocale === "en"
            ? `${input.authorCount} authors / ${input.articlePlanCount} plans`
            : renderLocale === "zh-TW"
              ? `${input.authorCount} 位作者 / ${input.articlePlanCount} 條計畫單`
              : `${input.authorCount} 位作者 / ${input.articlePlanCount} 条计划单`,
      };
    }

    if (moduleCode === "ai") {
      return {
        ...module,
        metric:
          hitRate == null
            ? renderLocale === "en"
              ? `${input.predictions.length} predictions online`
              : renderLocale === "zh-TW"
                ? `${input.predictions.length} 條預測在線`
                : `${input.predictions.length} 条预测在线`
            : renderLocale === "en"
              ? `${formatHitRate(hitRate)}% hit rate / ${settledPredictions.length} settled`
              : renderLocale === "zh-TW"
                ? `${formatHitRate(hitRate)}% 命中 / ${settledPredictions.length} 條已結算`
                : `${formatHitRate(hitRate)}% 命中 / ${settledPredictions.length} 条已结算`,
      };
    }

    if (moduleCode === "cricket") {
      return {
        ...module,
        metric:
          renderLocale === "en"
            ? `${input.cricketMatches.length} fixtures / ${input.cricketLeagueCount} leagues`
            : renderLocale === "zh-TW"
              ? `${input.cricketMatches.length} 場賽事 / ${input.cricketLeagueCount} 個聯賽`
              : `${input.cricketMatches.length} 场赛事 / ${input.cricketLeagueCount} 个联赛`,
      };
    }

    if (moduleCode === "esports") {
      return {
        ...module,
        metric:
          renderLocale === "en"
            ? `${esportsLiveCount} live / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} circuits`
            : renderLocale === "zh-TW"
              ? `${esportsLiveCount} 場進行中 / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} 條賽道`
              : `${esportsLiveCount} 场进行中 / ${Math.max(esportsCircuitCount, input.esportsLeagueCount)} 条赛道`,
      };
    }

    return module;
  });
}

export async function getHomepageBanners(locale: ContentLocale = defaultLocale): Promise<HomepageBanner[]> {
  const storedBanners = await getStoredHomepageBanners();
  const fallbackBanners = homepageBannerSeeds.map((item) => ({
    id: item.id,
    theme: item.theme,
    href: item.href,
    imageUrl: item.imageUrl,
    titleZhCn: item.translations["zh-CN"].title,
    titleZhTw: item.translations["zh-TW"].title,
    titleEn: item.translations.en.title,
    titleTh: item.translations.th.title,
    titleVi: item.translations.vi.title,
    titleHi: item.translations.hi.title,
    subtitleZhCn: item.translations["zh-CN"].subtitle,
    subtitleZhTw: item.translations["zh-TW"].subtitle,
    subtitleEn: item.translations.en.subtitle,
    subtitleTh: item.translations.th.subtitle,
    subtitleVi: item.translations.vi.subtitle,
    subtitleHi: item.translations.hi.subtitle,
    descriptionZhCn: item.translations["zh-CN"].description,
    descriptionZhTw: item.translations["zh-TW"].description,
    descriptionEn: item.translations.en.description,
    descriptionTh: item.translations.th.description,
    descriptionVi: item.translations.vi.description,
    descriptionHi: item.translations.hi.description,
    ctaLabelZhCn: item.translations["zh-CN"].ctaLabel,
    ctaLabelZhTw: item.translations["zh-TW"].ctaLabel,
    ctaLabelEn: item.translations.en.ctaLabel,
    ctaLabelTh: item.translations.th.ctaLabel,
    ctaLabelVi: item.translations.vi.ctaLabel,
    ctaLabelHi: item.translations.hi.ctaLabel,
  }));

  const source = storedBanners.length > 0 ? storedBanners : fallbackBanners;
  return source.map((item) => localizeHomepageBanner(item, locale));
}

export async function getHomepageModules(locale: ContentLocale = defaultLocale): Promise<HomepageModule[]> {
  const renderLocale = resolveContentLocale(locale);
  const modules = await getStoredHomepageModules();
  const source = mergeByKey(modules, mockHomepageModules, (item) => item.key ?? item.id);
  return source.map((item) => localizeHomepageModule(item, renderLocale));
}

export async function getSiteAnnouncements(locale: ContentLocale = defaultLocale): Promise<SiteAnnouncement[]> {
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
    titleTh: item.translations.th.title,
    titleVi: item.translations.vi.title,
    titleHi: item.translations.hi.title,
    messageZhCn: item.translations["zh-CN"].message,
    messageZhTw: item.translations["zh-TW"].message,
    messageEn: item.translations.en.message,
    messageTh: item.translations.th.message,
    messageVi: item.translations.vi.message,
    messageHi: item.translations.hi.message,
    ctaLabelZhCn: item.translations["zh-CN"].ctaLabel,
    ctaLabelZhTw: item.translations["zh-TW"].ctaLabel,
    ctaLabelEn: item.translations.en.ctaLabel,
    ctaLabelTh: item.translations.th.ctaLabel,
    ctaLabelVi: item.translations.vi.ctaLabel,
    ctaLabelHi: item.translations.hi.ctaLabel,
  }));

  const source = storedAnnouncements.length > 0 ? storedAnnouncements : fallbackAnnouncements;
  return source.map((item) => localizeSiteAnnouncement(item, locale));
}

export async function getSiteAds(
  locale: ContentLocale = defaultLocale,
  placement?: SiteAd["placement"],
): Promise<SiteAd[]> {
  return getManagedSiteAds(locale, placement);
}

export async function getAuthorTeams(locale: Locale = defaultLocale): Promise<AuthorTeam[]> {
  const authors = await getStoredAuthorTeams();
  const source = mergeById(authors, mockAuthorTeams);
  return source.map((item) => localizeAuthorTeam(item, locale));
}

export async function getAuthorById(authorId: string, locale: Locale = defaultLocale): Promise<AuthorTeam | undefined> {
  const authors = await getAuthorTeams(locale);
  return authors.find((item) => item.id === authorId);
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

export async function getSiteContentPayload(
  locale: ContentLocale = defaultLocale,
  options: {
    include?: SiteContentIncludeKey[];
    sport?: Sport;
  } = {},
): Promise<SiteContentPayload> {
  const renderLocale = resolveContentLocale(locale);
  const includeSet = new Set<SiteContentIncludeKey>(
    options.include && options.include.length > 0
      ? options.include
      : ["banners", "announcements", "ads", "homepageModules", "authors", "articlePlans", "predictions"],
  );

  const payload: SiteContentPayload = {};

  const tasks: Promise<void>[] = [];

  if (includeSet.has("banners")) {
    tasks.push(
      getHomepageBanners(locale).then((value) => {
        payload.banners = value;
      }),
    );
  }

  if (includeSet.has("announcements")) {
    tasks.push(
      getSiteAnnouncements(locale).then((value) => {
        payload.announcements = value;
      }),
    );
  }

  if (includeSet.has("ads")) {
    tasks.push(
      getSiteAds(locale).then((value) => {
        payload.ads = value;
      }),
    );
  }

  if (includeSet.has("homepageModules")) {
    tasks.push(
      getHomepageModules(locale).then((value) => {
        payload.homepageModules = value;
      }),
    );
  }

  if (includeSet.has("authors")) {
    tasks.push(
      getAuthorTeams(renderLocale).then((value) => {
        payload.authors = value;
      }),
    );
  }

  if (includeSet.has("articlePlans")) {
    tasks.push(
      getArticlePlans(options.sport, renderLocale).then((value) => {
        payload.articlePlans = value;
      }),
    );
  }

  if (includeSet.has("predictions")) {
    tasks.push(
      getPredictions(options.sport, renderLocale).then((value) => {
        payload.predictions = value;
      }),
    );
  }

  await Promise.all(tasks);
  return payload;
}
