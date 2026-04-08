import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type {
  ArticlePlan,
  AuthorTeam,
  HomepageBanner,
  HomepageFeaturedMatchSlot,
  HomepageModule,
  PredictionRecord,
  SiteAnnouncement,
  Sport,
} from "@/lib/types";

function mapSport(value: string): Sport {
  if (value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return "football";
}

function splitList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePredictionPayload(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as { matchRef?: string };
  } catch {
    return {};
  }
}

function mapAuthor(record: {
  id: string;
  name: string;
  focus: string;
  streak: string;
  winRate: string;
  monthlyRoi: string;
  followers: string;
  badge: string;
}): AuthorTeam {
  return {
    id: record.id,
    name: record.name,
    focus: record.focus,
    streak: record.streak,
    winRate: record.winRate,
    monthlyRoi: record.monthlyRoi,
    followers: record.followers,
    badge: record.badge,
  };
}

function mapPrediction(record: {
  id: string;
  sport: string;
  matchId: string | null;
  sourceKey: string | null;
  sourcePayload?: string | null;
  market: string;
  pick: string;
  confidence: string;
  expectedEdge: string;
  explanation: string;
  factorsText: string;
  result: string;
  match: { sourceKey: string | null } | null;
}): PredictionRecord {
  const payload = parsePredictionPayload(record.sourcePayload);
  const manualMatchKey = record.sourceKey?.startsWith("prediction:")
    ? record.sourceKey.slice("prediction:".length)
    : null;

  return {
    id: record.id,
    sport: mapSport(record.sport),
    matchId: record.match?.sourceKey ?? payload.matchRef ?? manualMatchKey ?? record.matchId ?? "",
    market: record.market,
    pick: record.pick,
    confidence: record.confidence,
    expectedEdge: record.expectedEdge,
    explanation: record.explanation,
    factors: splitList(record.factorsText),
    result: record.result === "won" || record.result === "lost" ? record.result : "pending",
  };
}

function mapArticlePlan(record: {
  id: string;
  slug: string;
  sport: string;
  matchId?: string | null;
  title: string;
  leagueLabel: string;
  kickoff: Date;
  authorId: string;
  teaser: string;
  marketSummary: string;
  previewText: string | null;
  fullAnalysisText: string;
  price: number;
  isHot: boolean;
  performance: string;
  tagsText: string;
}): ArticlePlan {
  const analysis = splitList(record.fullAnalysisText);

  return {
    id: record.id,
    slug: record.slug,
    sport: mapSport(record.sport),
    matchId: record.matchId ?? undefined,
    title: record.title,
    league: record.leagueLabel,
    kickoff: record.kickoff.toISOString(),
    authorId: record.authorId,
    teaser: record.teaser,
    marketSummary: record.marketSummary,
    analysis: analysis.length > 0 ? analysis : splitList(record.previewText),
    price: record.price,
    isHot: record.isHot,
    performance: record.performance,
    tags: splitTags(record.tagsText),
  };
}

function mapHomepageModule(record: {
  id: string;
  key?: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  metric: string;
}): HomepageModule {
  return {
    id: record.id,
    key: record.key,
    eyebrow: record.eyebrow,
    title: record.title,
    description: record.description,
    href: record.href,
    metric: record.metric,
  };
}

function mapHomepageFeaturedMatchSlot(record: {
  id: string;
  key: string;
  matchRef: string;
  matchId: string | null;
  status: string;
  sortOrder: number;
}): HomepageFeaturedMatchSlot {
  return {
    id: record.id,
    key: record.key,
    matchRef: record.matchRef,
    matchId: record.matchId ?? undefined,
    status: record.status,
    sortOrder: record.sortOrder,
  };
}

function mapHomepageBanner(record: {
  id: string;
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
  href: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
  ctaLabelTh: string;
  ctaLabelVi: string;
  ctaLabelHi: string;
  imageUrl: string;
  theme: string;
}): HomepageBanner & {
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
} {
  return {
    id: record.id,
    title: record.titleZhCn,
    subtitle: record.subtitleZhCn,
    description: record.descriptionZhCn,
    href: record.href,
    ctaLabel: record.ctaLabelZhCn,
    imageUrl: record.imageUrl,
    theme: record.theme === "field" || record.theme === "midnight" ? record.theme : "sunrise",
    titleZhCn: record.titleZhCn,
    titleZhTw: record.titleZhTw,
    titleEn: record.titleEn,
    titleTh: record.titleTh,
    titleVi: record.titleVi,
    titleHi: record.titleHi,
    subtitleZhCn: record.subtitleZhCn,
    subtitleZhTw: record.subtitleZhTw,
    subtitleEn: record.subtitleEn,
    subtitleTh: record.subtitleTh,
    subtitleVi: record.subtitleVi,
    subtitleHi: record.subtitleHi,
    descriptionZhCn: record.descriptionZhCn,
    descriptionZhTw: record.descriptionZhTw,
    descriptionEn: record.descriptionEn,
    descriptionTh: record.descriptionTh,
    descriptionVi: record.descriptionVi,
    descriptionHi: record.descriptionHi,
    ctaLabelZhCn: record.ctaLabelZhCn,
    ctaLabelZhTw: record.ctaLabelZhTw,
    ctaLabelEn: record.ctaLabelEn,
    ctaLabelTh: record.ctaLabelTh,
    ctaLabelVi: record.ctaLabelVi,
    ctaLabelHi: record.ctaLabelHi,
  };
}

function mapSiteAnnouncement(record: {
  id: string;
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
  href: string | null;
  ctaLabelZhCn: string | null;
  ctaLabelZhTw: string | null;
  ctaLabelEn: string | null;
  ctaLabelTh: string | null;
  ctaLabelVi: string | null;
  ctaLabelHi: string | null;
  tone: string;
}): SiteAnnouncement & {
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
} {
  return {
    id: record.id,
    title: record.titleZhCn,
    message: record.messageZhCn,
    href: record.href ?? undefined,
    ctaLabel: record.ctaLabelZhCn ?? undefined,
    tone: record.tone === "success" || record.tone === "warning" ? record.tone : "info",
    titleZhCn: record.titleZhCn,
    titleZhTw: record.titleZhTw,
    titleEn: record.titleEn,
    titleTh: record.titleTh,
    titleVi: record.titleVi,
    titleHi: record.titleHi,
    messageZhCn: record.messageZhCn,
    messageZhTw: record.messageZhTw,
    messageEn: record.messageEn,
    messageTh: record.messageTh,
    messageVi: record.messageVi,
    messageHi: record.messageHi,
    ctaLabelZhCn: record.ctaLabelZhCn ?? undefined,
    ctaLabelZhTw: record.ctaLabelZhTw ?? undefined,
    ctaLabelEn: record.ctaLabelEn ?? undefined,
    ctaLabelTh: record.ctaLabelTh ?? undefined,
    ctaLabelVi: record.ctaLabelVi ?? undefined,
    ctaLabelHi: record.ctaLabelHi ?? undefined,
  };
}

export const getStoredAuthorTeams = cache(async (): Promise<AuthorTeam[]> => {
  try {
    const authors = await prisma.authorTeam.findMany({
      where: { status: "active" },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });

    return authors.map(mapAuthor);
  } catch {
    return [];
  }
});

export const getStoredArticlePlans = cache(async (sport?: Sport): Promise<ArticlePlan[]> => {
  try {
    const plans = await prisma.articlePlan.findMany({
      where: {
        status: "published",
        ...(sport ? { sport } : {}),
      },
      orderBy: [{ isHot: "desc" }, { kickoff: "asc" }],
    });

    return plans.map(mapArticlePlan);
  } catch {
    return [];
  }
});

export const getStoredArticlePlanBySlug = cache(async (slug: string): Promise<ArticlePlan | undefined> => {
  try {
    const plan = await prisma.articlePlan.findUnique({
      where: { slug },
    });

    return plan && plan.status === "published" ? mapArticlePlan(plan) : undefined;
  } catch {
    return undefined;
  }
});

export const getStoredArticlePlanPriceById = cache(async (id: string): Promise<{ id: string; price: number } | undefined> => {
  try {
    const plan = await prisma.articlePlan.findUnique({
      where: { id },
      select: {
        id: true,
        price: true,
        status: true,
      },
    });

    if (!plan || plan.status !== "published") {
      return undefined;
    }

    return {
      id: plan.id,
      price: plan.price,
    };
  } catch {
    return undefined;
  }
});

export const getStoredHomepageModules = cache(async (): Promise<HomepageModule[]> => {
  try {
    const modules = await prisma.homepageModule.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return modules.map(mapHomepageModule);
  } catch {
    return [];
  }
});

export const getStoredHomepageFeaturedMatchSlots = cache(async (): Promise<HomepageFeaturedMatchSlot[]> => {
  try {
    const slots = await prisma.homepageFeaturedMatchSlot.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return slots.map(mapHomepageFeaturedMatchSlot);
  } catch {
    return [];
  }
});

export const getStoredHomepageBanners = cache(async (): Promise<
  (HomepageBanner & {
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
  })[]
> => {
  try {
    const now = new Date();
    const banners = await prisma.homepageBanner.findMany({
      where: {
        status: "active",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3,
    });

    return banners.map(mapHomepageBanner);
  } catch {
    return [];
  }
});

export const getStoredSiteAnnouncements = cache(async (): Promise<
  (SiteAnnouncement & {
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
  })[]
> => {
  try {
    const now = new Date();
    const announcements = await prisma.siteAnnouncement.findMany({
      where: {
        status: "active",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return announcements.map(mapSiteAnnouncement);
  } catch {
    return [];
  }
});

export const getStoredPredictions = cache(async (sport?: Sport): Promise<PredictionRecord[]> => {
  try {
    const predictions = await prisma.predictionRecord.findMany({
      where: sport ? { sport } : undefined,
      include: {
        match: {
          select: { sourceKey: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    return predictions.map((prediction) =>
      mapPrediction({
        ...prediction,
        sourceKey: prediction.sourceKey,
        sourcePayload: prediction.sourcePayload,
      }),
    );
  } catch {
    return [];
  }
});

export const getStoredPredictionByMatchId = cache(async (matchId: string): Promise<PredictionRecord | undefined> => {
  try {
    const prediction = await prisma.predictionRecord.findFirst({
      where: {
        OR: [
          { matchId },
          { sourceKey: `prediction:${matchId}` },
          { match: { sourceKey: matchId } },
        ],
      },
      include: {
        match: {
          select: { sourceKey: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    if (prediction) {
      return mapPrediction({
        ...prediction,
        sourceKey: prediction.sourceKey,
        sourcePayload: prediction.sourcePayload,
      });
    }

    const manualPrediction = await prisma.predictionRecord.findFirst({
      where: {
        sourcePayload: {
          contains: `"matchRef":"${matchId}"`,
        },
      },
      include: {
        match: {
          select: { sourceKey: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    return manualPrediction
      ? mapPrediction({
          ...manualPrediction,
          sourceKey: manualPrediction.sourceKey,
          sourcePayload: manualPrediction.sourcePayload,
        })
      : undefined;
  } catch {
    return undefined;
  }
});
