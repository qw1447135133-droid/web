import { revalidatePath } from "next/cache";
import { localizeMatch } from "@/lib/localized-content";
import { bootstrapSupportKnowledgeBase, type AssistantHandoffRecord } from "@/lib/site-assistant-service";
import {
  homepageBannerSeeds,
  homepageModules as mockHomepageModules,
  siteAnnouncementSeeds,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import {
  getStoredConfiguredFeaturedMatches,
  getStoredFeaturedMatches,
} from "@/lib/repositories/sports-repository";
import { getFeaturedMatches } from "@/lib/sports-data";
import { defaultLocale, type Locale } from "@/lib/i18n-config";
import type { Match } from "@/lib/types";

export type AdminHomepageModuleRecord = {
  id: string;
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  metric: string;
  status: string;
  sortOrder: number;
};

export type AdminSyncRunRecord = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  failureCount: number;
  countsSummary: string;
  errorText?: string;
};

export type AdminHomepageFeaturedMatchesPreview = {
  source: "manual-slots" | "sync-cache" | "live-fallback" | "mock-fallback";
  matches: Match[];
};

export type AdminHomepageFeaturedMatchSlotRecord = {
  id: string;
  key: string;
  matchRef: string;
  matchId?: string;
  status: string;
  sortOrder: number;
  match?: Match;
};

export type AdminHomepageBannerRecord = {
  id: string;
  key: string;
  theme: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  subtitleZhCn: string;
  subtitleZhTw: string;
  subtitleEn: string;
  descriptionZhCn: string;
  descriptionZhTw: string;
  descriptionEn: string;
  href: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
  imageUrl: string;
  startsAt?: string;
  endsAt?: string;
  status: string;
  sortOrder: number;
  impressionCount: number;
  clickCount: number;
  primaryImpressionCount: number;
  primaryClickCount: number;
  secondaryImpressionCount: number;
  secondaryClickCount: number;
  lastImpressionAt?: string;
  lastClickAt?: string;
  recentImpressionCount: number;
  recentClickCount: number;
  dailyStats: Array<{
    date: string;
    impressionCount: number;
    clickCount: number;
  }>;
};

export type AdminSiteAnnouncementRecord = {
  id: string;
  key: string;
  tone: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  messageZhCn: string;
  messageZhTw: string;
  messageEn: string;
  href: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
  startsAt?: string;
  endsAt?: string;
  status: string;
  sortOrder: number;
};

export type AdminAssistantHandoffRequestRecord = AssistantHandoffRecord;

export type AdminSupportKnowledgeItemRecord = {
  id: string;
  key: string;
  category: string;
  questionZhCn: string;
  questionZhTw: string;
  questionEn: string;
  answerZhCn: string;
  answerZhTw: string;
  answerEn: string;
  href?: string;
  tagsText?: string;
  status: string;
  sortOrder: number;
  updatedAt: string;
};

const siteSurfacePaths = [
  "/",
  "/live/football",
  "/live/basketball",
  "/live/cricket",
  "/live/esports",
  "/database",
  "/ai-predictions",
  "/plans",
  "/member",
  "/admin",
];

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("static generation store missing")) {
        throw error;
      }
    }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueModuleKey(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "module";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.homepageModule.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueFeaturedMatchSlotKey(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "featured-match";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.homepageFeaturedMatchSlot.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueBannerKey(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "banner";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.homepageBanner.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSyncSummary(summaryJson: string | null, startedAt: Date, finishedAt: Date | null) {
  if (!summaryJson) {
    return {
      durationMs: finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined,
      failureCount: 0,
      countsSummary: "-",
    };
  }

  try {
    const parsed = JSON.parse(summaryJson) as {
      durationMs?: number;
      counts?: Record<string, number>;
      failures?: string[];
    };

    const counts = parsed.counts ?? {};
    const parts = [
      ["L", counts.leagues ?? 0],
      ["T", counts.teams ?? 0],
      ["M", counts.matches ?? 0],
      ["O", counts.oddsSnapshots ?? 0],
    ].map(([label, value]) => `${label}:${value}`);

    return {
      durationMs: parsed.durationMs ?? (finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined),
      failureCount: parsed.failures?.length ?? 0,
      countsSummary: parts.join(" / "),
    };
  } catch {
    return {
      durationMs: finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined,
      failureCount: 0,
      countsSummary: "-",
    };
  }
}

export async function getAdminHomepageFeaturedMatches(
  locale: Locale = defaultLocale,
  limit = 6,
): Promise<AdminHomepageFeaturedMatchesPreview> {
  const configuredMatches = await getStoredConfiguredFeaturedMatches(limit);

  if (configuredMatches.length > 0) {
    return {
      source: "manual-slots",
      matches: configuredMatches.map((match) => localizeMatch(match, locale)).slice(0, limit),
    };
  }

  const storedMatches = await getStoredFeaturedMatches(limit);

  if (storedMatches.length > 0) {
    return {
      source: "sync-cache",
      matches: storedMatches.map((match) => localizeMatch(match, locale)).slice(0, limit),
    };
  }

  const fallbackMatches = await getFeaturedMatches(locale);
  const hasApiSportsIds = fallbackMatches.some((match) => match.id.includes(":"));

  return {
    source: hasApiSportsIds ? "live-fallback" : "mock-fallback",
    matches: fallbackMatches.slice(0, limit),
  };
}

export async function getAdminHomepageFeaturedMatchSlots(
  locale: Locale = defaultLocale,
): Promise<AdminHomepageFeaturedMatchSlotRecord[]> {
  const slots = await prisma.homepageFeaturedMatchSlot.findMany({
    include: {
      match: {
        include: {
          league: true,
          oddsSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 24,
  });

  return slots.map((slot) => ({
    id: slot.id,
    key: slot.key,
    matchRef: slot.matchRef,
    matchId: slot.matchId ?? undefined,
    status: slot.status,
    sortOrder: slot.sortOrder,
    match: slot.match ? localizeMatch({
      id: slot.match.sourceKey ?? slot.match.id,
      sport:
        slot.match.sport === "basketball" || slot.match.sport === "cricket" || slot.match.sport === "esports"
          ? slot.match.sport
          : "football",
      leagueSlug: slot.match.league.slug,
      leagueName: slot.match.league.displayName ?? slot.match.league.name,
      kickoff: slot.match.kickoff.toISOString(),
      status:
        slot.match.status === "live" || slot.match.status === "finished" || slot.match.status === "upcoming"
          ? slot.match.status
          : "upcoming",
      clock: slot.match.clock ?? undefined,
      venue: slot.match.venue,
      homeTeam: slot.match.homeTeamName,
      awayTeam: slot.match.awayTeamName,
      score:
        slot.match.scoreText ??
        (slot.match.homeScore == null || slot.match.awayScore == null ? "-" : `${slot.match.homeScore} - ${slot.match.awayScore}`),
      statLine: slot.match.statLine ?? "--",
      insight: slot.match.insight ?? "--",
      odds: {
        home: slot.match.oddsSnapshots[0]?.home ?? null,
        draw: slot.match.oddsSnapshots[0]?.draw ?? null,
        away: slot.match.oddsSnapshots[0]?.away ?? null,
        spread: slot.match.oddsSnapshots[0]?.spread ?? "--",
        total: slot.match.oddsSnapshots[0]?.total ?? "--",
        movement:
          slot.match.oddsSnapshots[0]?.movement === "up" || slot.match.oddsSnapshots[0]?.movement === "down"
            ? slot.match.oddsSnapshots[0].movement
            : "flat",
      },
    }, locale) : undefined,
  }));
}

export async function getAdminHomepageModules(): Promise<AdminHomepageModuleRecord[]> {
  const modules = await prisma.homepageModule.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return modules.map((module) => ({
    id: module.id,
    key: module.key,
    eyebrow: module.eyebrow,
    title: module.title,
    description: module.description,
    href: module.href,
    metric: module.metric,
    status: module.status,
    sortOrder: module.sortOrder,
  }));
}

export async function getAdminHomepageBanners(): Promise<AdminHomepageBannerRecord[]> {
  const recentSince = new Date();
  recentSince.setUTCDate(recentSince.getUTCDate() - 6);
  recentSince.setUTCHours(0, 0, 0, 0);

  const banners = await prisma.homepageBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      dailyStats: {
        where: {
          metricDate: {
            gte: recentSince,
          },
        },
        select: {
          metricDate: true,
          impressionCount: true,
          clickCount: true,
        },
      },
    },
  });

  return banners.map((banner) => ({
    dailyStats: Array.from({ length: 7 }, (_, index) => {
      const metricDate = new Date(recentSince);
      metricDate.setUTCDate(recentSince.getUTCDate() + index);
      const metricDateKey = metricDate.toISOString();
      const snapshot = banner.dailyStats.find((item) => item.metricDate.toISOString() === metricDateKey);

      return {
        date: metricDateKey,
        impressionCount: snapshot?.impressionCount ?? 0,
        clickCount: snapshot?.clickCount ?? 0,
      };
    }),
    id: banner.id,
    key: banner.key,
    theme: banner.theme,
    titleZhCn: banner.titleZhCn,
    titleZhTw: banner.titleZhTw,
    titleEn: banner.titleEn,
    subtitleZhCn: banner.subtitleZhCn,
    subtitleZhTw: banner.subtitleZhTw,
    subtitleEn: banner.subtitleEn,
    descriptionZhCn: banner.descriptionZhCn,
    descriptionZhTw: banner.descriptionZhTw,
    descriptionEn: banner.descriptionEn,
    href: banner.href,
    ctaLabelZhCn: banner.ctaLabelZhCn,
    ctaLabelZhTw: banner.ctaLabelZhTw,
    ctaLabelEn: banner.ctaLabelEn,
    imageUrl: banner.imageUrl,
    startsAt: banner.startsAt?.toISOString(),
    endsAt: banner.endsAt?.toISOString(),
    status: banner.status,
    sortOrder: banner.sortOrder,
    impressionCount: banner.impressionCount,
    clickCount: banner.clickCount,
    primaryImpressionCount: banner.primaryImpressionCount,
    primaryClickCount: banner.primaryClickCount,
    secondaryImpressionCount: banner.secondaryImpressionCount,
    secondaryClickCount: banner.secondaryClickCount,
    lastImpressionAt: banner.lastImpressionAt?.toISOString(),
    lastClickAt: banner.lastClickAt?.toISOString(),
    recentImpressionCount: banner.dailyStats.reduce((sum, item) => sum + item.impressionCount, 0),
    recentClickCount: banner.dailyStats.reduce((sum, item) => sum + item.clickCount, 0),
  }));
}

export async function bootstrapMockHomepageModules() {
  for (const [index, module] of mockHomepageModules.entries()) {
    await prisma.homepageModule.upsert({
      where: { key: module.id },
      update: {
        eyebrow: module.eyebrow,
        title: module.title,
        description: module.description,
        href: module.href,
        metric: module.metric,
        status: "active",
        sortOrder: index,
      },
      create: {
        key: module.id,
        eyebrow: module.eyebrow,
        title: module.title,
        description: module.description,
        href: module.href,
        metric: module.metric,
        status: "active",
        sortOrder: index,
      },
    });
  }

  safeRevalidate(siteSurfacePaths);
}

export async function bootstrapHomepageFeaturedMatchSlots() {
  const existingCount = await prisma.homepageFeaturedMatchSlot.count();

  if (existingCount > 0) {
    return;
  }

  const matches = await getStoredFeaturedMatches(3);

  for (const [index, match] of matches.entries()) {
    const matchRecord = await prisma.match.findFirst({
      where: {
        OR: [{ id: match.id }, { sourceKey: match.id }],
      },
      select: { id: true },
    });

    if (!matchRecord) {
      continue;
    }

    await prisma.homepageFeaturedMatchSlot.create({
      data: {
        key: `homepage-featured-${index + 1}`,
        matchRef: match.id,
        matchId: matchRecord.id,
        status: "active",
        sortOrder: index,
      },
    });
  }

  safeRevalidate(siteSurfacePaths);
}

export async function bootstrapMockHomepageBanners() {
  for (const banner of homepageBannerSeeds) {
    await prisma.homepageBanner.upsert({
      where: { key: banner.key },
      update: {
        theme: banner.theme,
        titleZhCn: banner.translations["zh-CN"].title,
        titleZhTw: banner.translations["zh-TW"].title,
        titleEn: banner.translations.en.title,
        subtitleZhCn: banner.translations["zh-CN"].subtitle,
        subtitleZhTw: banner.translations["zh-TW"].subtitle,
        subtitleEn: banner.translations.en.subtitle,
        descriptionZhCn: banner.translations["zh-CN"].description,
        descriptionZhTw: banner.translations["zh-TW"].description,
        descriptionEn: banner.translations.en.description,
        href: banner.href,
        ctaLabelZhCn: banner.translations["zh-CN"].ctaLabel,
        ctaLabelZhTw: banner.translations["zh-TW"].ctaLabel,
        ctaLabelEn: banner.translations.en.ctaLabel,
        imageUrl: banner.imageUrl,
        startsAt: banner.startsAt ? new Date(banner.startsAt) : null,
        endsAt: banner.endsAt ? new Date(banner.endsAt) : null,
        status: "active",
        sortOrder: banner.sortOrder,
      },
      create: {
        key: banner.key,
        theme: banner.theme,
        titleZhCn: banner.translations["zh-CN"].title,
        titleZhTw: banner.translations["zh-TW"].title,
        titleEn: banner.translations.en.title,
        subtitleZhCn: banner.translations["zh-CN"].subtitle,
        subtitleZhTw: banner.translations["zh-TW"].subtitle,
        subtitleEn: banner.translations.en.subtitle,
        descriptionZhCn: banner.translations["zh-CN"].description,
        descriptionZhTw: banner.translations["zh-TW"].description,
        descriptionEn: banner.translations.en.description,
        href: banner.href,
        ctaLabelZhCn: banner.translations["zh-CN"].ctaLabel,
        ctaLabelZhTw: banner.translations["zh-TW"].ctaLabel,
        ctaLabelEn: banner.translations.en.ctaLabel,
        imageUrl: banner.imageUrl,
        startsAt: banner.startsAt ? new Date(banner.startsAt) : null,
        endsAt: banner.endsAt ? new Date(banner.endsAt) : null,
        status: "active",
        sortOrder: banner.sortOrder,
      },
    });
  }

  safeRevalidate(siteSurfacePaths);
}

export async function getAdminSiteAnnouncements(): Promise<AdminSiteAnnouncementRecord[]> {
  const announcements = await prisma.siteAnnouncement.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return announcements.map((announcement) => ({
    id: announcement.id,
    key: announcement.key,
    tone: announcement.tone,
    titleZhCn: announcement.titleZhCn,
    titleZhTw: announcement.titleZhTw,
    titleEn: announcement.titleEn,
    messageZhCn: announcement.messageZhCn,
    messageZhTw: announcement.messageZhTw,
    messageEn: announcement.messageEn,
    href: announcement.href ?? "",
    ctaLabelZhCn: announcement.ctaLabelZhCn ?? "",
    ctaLabelZhTw: announcement.ctaLabelZhTw ?? "",
    ctaLabelEn: announcement.ctaLabelEn ?? "",
    startsAt: announcement.startsAt?.toISOString(),
    endsAt: announcement.endsAt?.toISOString(),
    status: announcement.status,
    sortOrder: announcement.sortOrder,
  }));
}

async function ensureUniqueAnnouncementKey(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "announcement";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.siteAnnouncement.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueSupportKnowledgeKey(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "assistant-knowledge";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.supportKnowledgeItem.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function normalizeSupportKnowledgeTags(value: string) {
  const parts = value
    .split(/[\n,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.join("|");
}

export async function bootstrapMockSiteAnnouncements() {
  for (const announcement of siteAnnouncementSeeds) {
    await prisma.siteAnnouncement.upsert({
      where: { key: announcement.key },
      update: {
        tone: announcement.tone,
        titleZhCn: announcement.translations["zh-CN"].title,
        titleZhTw: announcement.translations["zh-TW"].title,
        titleEn: announcement.translations.en.title,
        messageZhCn: announcement.translations["zh-CN"].message,
        messageZhTw: announcement.translations["zh-TW"].message,
        messageEn: announcement.translations.en.message,
        href: announcement.href ?? null,
        ctaLabelZhCn: announcement.translations["zh-CN"].ctaLabel ?? null,
        ctaLabelZhTw: announcement.translations["zh-TW"].ctaLabel ?? null,
        ctaLabelEn: announcement.translations.en.ctaLabel ?? null,
        startsAt: announcement.startsAt ? new Date(announcement.startsAt) : null,
        endsAt: announcement.endsAt ? new Date(announcement.endsAt) : null,
        status: "active",
        sortOrder: announcement.sortOrder,
      },
      create: {
        key: announcement.key,
        tone: announcement.tone,
        titleZhCn: announcement.translations["zh-CN"].title,
        titleZhTw: announcement.translations["zh-TW"].title,
        titleEn: announcement.translations.en.title,
        messageZhCn: announcement.translations["zh-CN"].message,
        messageZhTw: announcement.translations["zh-TW"].message,
        messageEn: announcement.translations.en.message,
        href: announcement.href ?? null,
        ctaLabelZhCn: announcement.translations["zh-CN"].ctaLabel ?? null,
        ctaLabelZhTw: announcement.translations["zh-TW"].ctaLabel ?? null,
        ctaLabelEn: announcement.translations.en.ctaLabel ?? null,
        startsAt: announcement.startsAt ? new Date(announcement.startsAt) : null,
        endsAt: announcement.endsAt ? new Date(announcement.endsAt) : null,
        status: "active",
        sortOrder: announcement.sortOrder,
      },
    });
  }

  safeRevalidate(siteSurfacePaths);
}

export async function getAdminAssistantHandoffRequests(limit = 12): Promise<AdminAssistantHandoffRequestRecord[]> {
  await bootstrapSupportKnowledgeBase();

  const requests = await prisma.assistantHandoffRequest.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    include: {
      conversation: {
        select: {
          id: true,
          title: true,
          summary: true,
        },
      },
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  return requests.map((item) => ({
    id: item.id,
    status: item.status,
    locale: item.locale,
    contactName: item.contactName ?? undefined,
    contactMethod: item.contactMethod ?? undefined,
    note: item.note ?? undefined,
    conversationId: item.conversationId,
    conversationTitle: item.conversation.title ?? undefined,
    conversationSummary: item.conversation.summary ?? undefined,
    requesterName: item.user?.displayName ?? undefined,
    requesterEmail: item.user?.email ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function getAdminSupportKnowledgeItems(): Promise<AdminSupportKnowledgeItemRecord[]> {
  await bootstrapSupportKnowledgeBase();

  const items = await prisma.supportKnowledgeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return items.map((item) => ({
    id: item.id,
    key: item.key,
    category: item.category,
    questionZhCn: item.questionZhCn,
    questionZhTw: item.questionZhTw,
    questionEn: item.questionEn,
    answerZhCn: item.answerZhCn,
    answerZhTw: item.answerZhTw,
    answerEn: item.answerEn,
    href: item.href ?? undefined,
    tagsText: item.tagsText ?? undefined,
    status: item.status,
    sortOrder: item.sortOrder,
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function saveHomepageModule(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    throw new Error("首页运营位标题不能为空。");
  }

  const key = await ensureUniqueModuleKey(String(formData.get("key") || title), id || undefined);
  const eyebrow = String(formData.get("eyebrow") || "").trim() || "Homepage";
  const description = String(formData.get("description") || "").trim() || "待补充描述";
  const href = String(formData.get("href") || "").trim() || "/";
  const metric = String(formData.get("metric") || "").trim() || "-";
  const status = String(formData.get("status") || "active").trim() || "active";
  const sortOrder = parseSortOrder(formData.get("sortOrder"));

  if (id) {
    const updated = await prisma.homepageModule.update({
      where: { id },
      data: {
        key,
        eyebrow,
        title,
        description,
        href,
        metric,
        status,
        sortOrder,
      },
    });

    safeRevalidate(siteSurfacePaths);
    return updated;
  }

  const created = await prisma.homepageModule.create({
    data: {
      key,
      eyebrow,
      title,
      description,
      href,
      metric,
      status,
      sortOrder,
    },
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function saveHomepageFeaturedMatchSlot(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const matchRef = String(formData.get("matchRef") || "").trim();

  if (!matchRef) {
    throw new Error("首页焦点比赛槽位需要绑定比赛。");
  }

  const matchRecord = await prisma.match.findFirst({
    where: {
      OR: [{ id: matchRef }, { sourceKey: matchRef }],
    },
    select: { id: true, sourceKey: true, homeTeamName: true, awayTeamName: true },
  });

  if (!matchRecord) {
    throw new Error("所选比赛暂时不存在或尚未同步入库。");
  }

  const key = await ensureUniqueFeaturedMatchSlotKey(
    String(formData.get("key") || `${matchRecord.homeTeamName}-${matchRecord.awayTeamName}`),
    id || undefined,
  );
  const status = String(formData.get("status") || "active").trim() || "active";
  const sortOrder = parseSortOrder(formData.get("sortOrder"));

  if (id) {
    const updated = await prisma.homepageFeaturedMatchSlot.update({
      where: { id },
      data: {
        key,
        matchRef,
        matchId: matchRecord.id,
        status,
        sortOrder,
      },
    });

    safeRevalidate(siteSurfacePaths);
    return updated;
  }

  const created = await prisma.homepageFeaturedMatchSlot.create({
    data: {
      key,
      matchRef,
      matchId: matchRecord.id,
      status,
      sortOrder,
    },
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function saveHomepageBanner(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const titleZhCn = String(formData.get("titleZhCn") || "").trim();
  const titleZhTw = String(formData.get("titleZhTw") || "").trim() || titleZhCn;
  const titleEn = String(formData.get("titleEn") || "").trim() || titleZhCn;
  const subtitleZhCn = String(formData.get("subtitleZhCn") || "").trim() || titleZhCn;
  const subtitleZhTw = String(formData.get("subtitleZhTw") || "").trim() || subtitleZhCn;
  const subtitleEn = String(formData.get("subtitleEn") || "").trim() || subtitleZhCn;
  const descriptionZhCn = String(formData.get("descriptionZhCn") || "").trim();
  const descriptionZhTw = String(formData.get("descriptionZhTw") || "").trim() || descriptionZhCn;
  const descriptionEn = String(formData.get("descriptionEn") || "").trim() || descriptionZhCn;

  if (!titleZhCn || !descriptionZhCn) {
    throw new Error("首页 Banner 至少需要简体中文标题和正文。");
  }

  const key = await ensureUniqueBannerKey(String(formData.get("key") || titleZhCn), id || undefined);
  const theme = String(formData.get("theme") || "sunrise").trim() || "sunrise";
  const href = String(formData.get("href") || "").trim() || "/";
  const ctaLabelZhCn = String(formData.get("ctaLabelZhCn") || "").trim() || "查看详情";
  const ctaLabelZhTw = String(formData.get("ctaLabelZhTw") || "").trim() || ctaLabelZhCn;
  const ctaLabelEn = String(formData.get("ctaLabelEn") || "").trim() || ctaLabelZhCn;
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const startsAt = parseOptionalDate(formData.get("startsAt"));
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const status = String(formData.get("status") || "active").trim() || "active";
  const sortOrder = parseSortOrder(formData.get("sortOrder"));

  if (!imageUrl) {
    throw new Error("首页 Banner 需要背景图 URL。");
  }

  if (endsAt && startsAt && endsAt < startsAt) {
    throw new Error("Banner 结束时间不能早于开始时间。");
  }

  const payload = {
    key,
    theme,
    titleZhCn,
    titleZhTw,
    titleEn,
    subtitleZhCn,
    subtitleZhTw,
    subtitleEn,
    descriptionZhCn,
    descriptionZhTw,
    descriptionEn,
    href,
    ctaLabelZhCn,
    ctaLabelZhTw,
    ctaLabelEn,
    imageUrl,
    startsAt,
    endsAt,
    status,
    sortOrder,
  };

  if (id) {
    const updated = await prisma.homepageBanner.update({
      where: { id },
      data: payload,
    });

    safeRevalidate(siteSurfacePaths);
    return updated;
  }

  const created = await prisma.homepageBanner.create({
    data: payload,
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function toggleHomepageModuleStatus(id: string) {
  const current = await prisma.homepageModule.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("首页运营位不存在。");
  }

  const updated = await prisma.homepageModule.update({
    where: { id },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
  });

  safeRevalidate(siteSurfacePaths);
  return updated;
}

export async function toggleHomepageFeaturedMatchSlotStatus(id: string) {
  const current = await prisma.homepageFeaturedMatchSlot.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("首页焦点比赛槽位不存在。");
  }

  const updated = await prisma.homepageFeaturedMatchSlot.update({
    where: { id },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
  });

  safeRevalidate(siteSurfacePaths);
  return updated;
}

export async function deleteHomepageFeaturedMatchSlot(id: string) {
  const current = await prisma.homepageFeaturedMatchSlot.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    throw new Error("首页焦点比赛槽位不存在。");
  }

  await prisma.homepageFeaturedMatchSlot.delete({
    where: { id },
  });

  safeRevalidate(siteSurfacePaths);
}

export async function toggleHomepageBannerStatus(id: string) {
  const current = await prisma.homepageBanner.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("首页 Banner 不存在。");
  }

  const updated = await prisma.homepageBanner.update({
    where: { id },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
  });

  safeRevalidate(siteSurfacePaths);
  return updated;
}

export async function duplicateHomepageBanner(id: string) {
  const current = await prisma.homepageBanner.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("首页 Banner 不存在。");
  }

  const key = await ensureUniqueBannerKey(`${current.key}-copy`);

  const duplicated = await prisma.homepageBanner.create({
    data: {
      key,
      theme: current.theme,
      titleZhCn: current.titleZhCn,
      titleZhTw: current.titleZhTw,
      titleEn: current.titleEn,
      subtitleZhCn: current.subtitleZhCn,
      subtitleZhTw: current.subtitleZhTw,
      subtitleEn: current.subtitleEn,
      descriptionZhCn: current.descriptionZhCn,
      descriptionZhTw: current.descriptionZhTw,
      descriptionEn: current.descriptionEn,
      href: current.href,
      ctaLabelZhCn: current.ctaLabelZhCn,
      ctaLabelZhTw: current.ctaLabelZhTw,
      ctaLabelEn: current.ctaLabelEn,
      imageUrl: current.imageUrl,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      status: "inactive",
      sortOrder: current.sortOrder + 1,
      impressionCount: 0,
      clickCount: 0,
      primaryImpressionCount: 0,
      primaryClickCount: 0,
      secondaryImpressionCount: 0,
      secondaryClickCount: 0,
      lastImpressionAt: null,
      lastClickAt: null,
    },
    select: { id: true },
  });

  safeRevalidate(siteSurfacePaths);
  return duplicated;
}

export async function moveHomepageModule(id: string, direction: "up" | "down") {
  const modules = await prisma.homepageModule.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, sortOrder: true },
  });

  const index = modules.findIndex((module) => module.id === id);

  if (index === -1) {
    throw new Error("首页运营位不存在。");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= modules.length) {
    return;
  }

  const current = modules[index];
  const target = modules[targetIndex];

  await prisma.$transaction([
    prisma.homepageModule.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.homepageModule.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate(siteSurfacePaths);
}

export async function moveHomepageFeaturedMatchSlot(id: string, direction: "up" | "down") {
  const slots = await prisma.homepageFeaturedMatchSlot.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, sortOrder: true },
  });

  const index = slots.findIndex((slot) => slot.id === id);

  if (index === -1) {
    throw new Error("首页焦点比赛槽位不存在。");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= slots.length) {
    return;
  }

  const current = slots[index];
  const target = slots[targetIndex];

  await prisma.$transaction([
    prisma.homepageFeaturedMatchSlot.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.homepageFeaturedMatchSlot.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate(siteSurfacePaths);
}

export async function moveHomepageBanner(id: string, direction: "up" | "down") {
  const banners = await prisma.homepageBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, sortOrder: true },
  });

  const index = banners.findIndex((banner) => banner.id === id);

  if (index === -1) {
    throw new Error("首页 Banner 不存在。");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= banners.length) {
    return;
  }

  const current = banners[index];
  const target = banners[targetIndex];

  await prisma.$transaction([
    prisma.homepageBanner.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.homepageBanner.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate(siteSurfacePaths);
}

export async function saveSiteAnnouncement(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const titleZhCn = String(formData.get("titleZhCn") || "").trim();
  const titleZhTw = String(formData.get("titleZhTw") || "").trim() || titleZhCn;
  const titleEn = String(formData.get("titleEn") || "").trim() || titleZhCn;
  const messageZhCn = String(formData.get("messageZhCn") || "").trim();
  const messageZhTw = String(formData.get("messageZhTw") || "").trim() || messageZhCn;
  const messageEn = String(formData.get("messageEn") || "").trim() || messageZhCn;

  if (!titleZhCn || !messageZhCn) {
    throw new Error("站内公告至少需要简体中文标题和正文。");
  }

  const key = await ensureUniqueAnnouncementKey(
    String(formData.get("key") || titleZhCn),
    id || undefined,
  );
  const tone = String(formData.get("tone") || "info").trim() || "info";
  const href = String(formData.get("href") || "").trim();
  const ctaLabelZhCn = String(formData.get("ctaLabelZhCn") || "").trim();
  const ctaLabelZhTw = String(formData.get("ctaLabelZhTw") || "").trim() || ctaLabelZhCn;
  const ctaLabelEn = String(formData.get("ctaLabelEn") || "").trim() || ctaLabelZhCn;
  const startsAt = parseOptionalDate(formData.get("startsAt"));
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const status = String(formData.get("status") || "active").trim() || "active";
  const sortOrder = parseSortOrder(formData.get("sortOrder"));

  if (endsAt && startsAt && endsAt < startsAt) {
    throw new Error("公告结束时间不能早于开始时间。");
  }

  const payload = {
    key,
    tone,
    titleZhCn,
    titleZhTw,
    titleEn,
    messageZhCn,
    messageZhTw,
    messageEn,
    href: href || null,
    ctaLabelZhCn: ctaLabelZhCn || null,
    ctaLabelZhTw: ctaLabelZhTw || null,
    ctaLabelEn: ctaLabelEn || null,
    startsAt,
    endsAt,
    status,
    sortOrder,
  };

  if (id) {
    const updated = await prisma.siteAnnouncement.update({
      where: { id },
      data: payload,
    });

    safeRevalidate(siteSurfacePaths);
    return updated;
  }

  const created = await prisma.siteAnnouncement.create({
    data: payload,
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function toggleSiteAnnouncementStatus(id: string) {
  const current = await prisma.siteAnnouncement.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("站内公告不存在。");
  }

  const updated = await prisma.siteAnnouncement.update({
    where: { id },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
  });

  safeRevalidate(siteSurfacePaths);
  return updated;
}

export async function moveSiteAnnouncement(id: string, direction: "up" | "down") {
  const announcements = await prisma.siteAnnouncement.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, sortOrder: true },
  });

  const index = announcements.findIndex((announcement) => announcement.id === id);

  if (index === -1) {
    throw new Error("站内公告不存在。");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= announcements.length) {
    return;
  }

  const current = announcements[index];
  const target = announcements[targetIndex];

  await prisma.$transaction([
    prisma.siteAnnouncement.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.siteAnnouncement.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate(siteSurfacePaths);
}

export async function saveSupportKnowledgeItem(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const questionZhCn = String(formData.get("questionZhCn") || "").trim();
  const answerZhCn = String(formData.get("answerZhCn") || "").trim();
  const questionZhTw = String(formData.get("questionZhTw") || "").trim() || questionZhCn;
  const answerZhTw = String(formData.get("answerZhTw") || "").trim() || answerZhCn;
  const questionEn = String(formData.get("questionEn") || "").trim() || questionZhCn;
  const answerEn = String(formData.get("answerEn") || "").trim() || answerZhCn;

  if (!questionZhCn || !answerZhCn) {
    throw new Error("客服知识库至少需要简体中文问题和答案。");
  }

  const key = await ensureUniqueSupportKnowledgeKey(
    String(formData.get("key") || questionZhCn),
    id || undefined,
  );
  const category = String(formData.get("category") || "general").trim() || "general";
  const href = String(formData.get("href") || "").trim();
  const tagsText = normalizeSupportKnowledgeTags(String(formData.get("tagsText") || ""));
  const status = String(formData.get("status") || "active").trim() || "active";
  const sortOrder = parseSortOrder(formData.get("sortOrder"));

  const payload = {
    key,
    category,
    questionZhCn,
    questionZhTw,
    questionEn,
    answerZhCn,
    answerZhTw,
    answerEn,
    href: href || null,
    tagsText: tagsText || null,
    status,
    sortOrder,
  };

  if (id) {
    const updated = await prisma.supportKnowledgeItem.update({
      where: { id },
      data: payload,
      select: { id: true },
    });

    safeRevalidate(siteSurfacePaths);
    return updated;
  }

  const created = await prisma.supportKnowledgeItem.create({
    data: payload,
    select: { id: true },
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function toggleSupportKnowledgeItemStatus(id: string) {
  const current = await prisma.supportKnowledgeItem.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("客服知识条目不存在。");
  }

  const updated = await prisma.supportKnowledgeItem.update({
    where: { id },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
    select: { id: true },
  });

  safeRevalidate(siteSurfacePaths);
  return updated;
}

export async function moveSupportKnowledgeItem(id: string, direction: "up" | "down") {
  const items = await prisma.supportKnowledgeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, sortOrder: true },
  });

  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("客服知识条目不存在。");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= items.length) {
    return;
  }

  const current = items[index];
  const target = items[targetIndex];

  await prisma.$transaction([
    prisma.supportKnowledgeItem.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.supportKnowledgeItem.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate(siteSurfacePaths);
}

export async function getRecentSyncRuns(limit = 8): Promise<AdminSyncRunRecord[]> {
  const runs = await prisma.syncRun.findMany({
    take: limit,
    orderBy: { startedAt: "desc" },
  });

  return runs.map((run) => {
    const summary = parseSyncSummary(run.summaryJson, run.startedAt, run.finishedAt);

    return {
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      durationMs: summary.durationMs,
      failureCount: summary.failureCount,
      countsSummary: summary.countsSummary,
      errorText: run.errorText ?? undefined,
    };
  });
}
