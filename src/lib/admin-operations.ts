import { revalidatePath } from "next/cache";
import {
  homepageBannerSeeds,
  homepageModules as mockHomepageModules,
  siteAnnouncementSeeds,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

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
  lastImpressionAt?: string;
  lastClickAt?: string;
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

const siteSurfacePaths = [
  "/",
  "/live/football",
  "/live/basketball",
  "/live/cricket",
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
  const banners = await prisma.homepageBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return banners.map((banner) => ({
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
    lastImpressionAt: banner.lastImpressionAt?.toISOString(),
    lastClickAt: banner.lastClickAt?.toISOString(),
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
