import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { articlePlans as mockArticlePlans, authorTeams as mockAuthorTeams, predictions as mockPredictions } from "@/lib/mock-data";
import type { Sport } from "@/lib/types";

export type AdminAuthorTeamRecord = {
  id: string;
  name: string;
  slug: string;
  focus: string;
  streak: string;
  winRate: string;
  monthlyRoi: string;
  followers: string;
  badge: string;
  bio: string;
  status: string;
};

export type AdminArticlePlanRecord = {
  id: string;
  slug: string;
  sport: Sport;
  matchId?: string;
  title: string;
  leagueLabel: string;
  kickoff: string;
  authorId: string;
  teaser: string;
  marketSummary: string;
  previewText: string;
  fullAnalysisText: string;
  price: number;
  isHot: boolean;
  performance: string;
  tagsText: string;
  status: string;
  publishedAt?: string;
};

export type AdminPredictionRecord = {
  id: string;
  sport: Sport;
  matchId?: string;
  matchRef: string;
  authorId?: string;
  market: string;
  pick: string;
  confidence: string;
  expectedEdge: string;
  explanation: string;
  factorsText: string;
  result: string;
  publishedAt?: string;
  updatedAt: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeSport(value: string): Sport {
  if (value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return "football";
}

function parseDate(value: string | null | undefined) {
  const resolved = value?.trim();

  if (!resolved) {
    return new Date();
  }

  const parsed = new Date(resolved);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeTags(value: string | null | undefined) {
  return (value ?? "")
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" | ");
}

function resolvePreviewText(previewText: string, fullAnalysisText: string, teaser: string) {
  if (previewText) {
    return previewText;
  }

  const firstParagraph = fullAnalysisText.split("\n").find(Boolean)?.trim();
  return firstParagraph || teaser;
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

async function resolveMatchRecordId(matchRef: string) {
  const value = matchRef.trim();

  if (!value) {
    return null;
  }

  const match = await prisma.match.findFirst({
    where: {
      OR: [{ id: value }, { sourceKey: value }],
    },
    select: { id: true },
  });

  return match?.id ?? null;
}

async function ensureUniqueAuthorSlug(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "author";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.authorTeam.findFirst({
      where: {
        slug: candidate,
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

async function ensureUniquePlanSlug(baseValue: string, ignoreId?: string) {
  const base = slugify(baseValue) || "plan";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.articlePlan.findFirst({
      where: {
        slug: candidate,
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

function revalidateContentViews(slug?: string, matchId?: string) {
  const paths = ["/", "/plans", "/member", "/admin", "/ai-predictions"];

  if (slug) {
    paths.push(`/plans/${slug}`);
  }

  if (matchId) {
    paths.push(`/matches/${matchId}`);
  }

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

export async function getAdminAuthorTeams(): Promise<AdminAuthorTeamRecord[]> {
  const records = await prisma.authorTeam.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
  });

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    slug: record.slug,
    focus: record.focus,
    streak: record.streak,
    winRate: record.winRate,
    monthlyRoi: record.monthlyRoi,
    followers: record.followers,
    badge: record.badge,
    bio: record.bio ?? "",
    status: record.status,
  }));
}

export async function getAdminArticlePlans(): Promise<AdminArticlePlanRecord[]> {
  const records = await prisma.articlePlan.findMany({
    orderBy: [{ status: "asc" }, { isHot: "desc" }, { kickoff: "asc" }],
  });

  return records.map((record) => ({
    id: record.id,
    slug: record.slug,
    sport: normalizeSport(record.sport),
    matchId: record.matchId ?? undefined,
    title: record.title,
    leagueLabel: record.leagueLabel,
    kickoff: record.kickoff.toISOString(),
    authorId: record.authorId,
    teaser: record.teaser,
    marketSummary: record.marketSummary,
    previewText: record.previewText ?? "",
    fullAnalysisText: record.fullAnalysisText,
    price: record.price,
    isHot: record.isHot,
    performance: record.performance,
    tagsText: record.tagsText,
    status: record.status,
    publishedAt: record.publishedAt?.toISOString(),
  }));
}

export async function getAdminPredictionRecords(): Promise<AdminPredictionRecord[]> {
  const records = await prisma.predictionRecord.findMany({
    include: {
      match: {
        select: { id: true, sourceKey: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map((record) => {
    const payload = parsePredictionPayload(record.sourcePayload);

    return {
      id: record.id,
      sport: normalizeSport(record.sport),
      matchId: record.matchId ?? undefined,
      matchRef: record.match?.sourceKey ?? payload.matchRef ?? "",
      authorId: record.authorId ?? undefined,
      market: record.market,
      pick: record.pick,
      confidence: record.confidence,
      expectedEdge: record.expectedEdge,
      explanation: record.explanation,
      factorsText: record.factorsText,
      result: record.result,
      publishedAt: record.publishedAt?.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  });
}

export async function saveAuthorTeam(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    throw new Error("作者/团队名称不能为空。");
  }

  const focus = String(formData.get("focus") || "").trim() || "待补充领域";
  const streak = String(formData.get("streak") || "").trim() || "待更新";
  const winRate = String(formData.get("winRate") || "").trim() || "待更新";
  const monthlyRoi = String(formData.get("monthlyRoi") || "").trim() || "待更新";
  const followers = String(formData.get("followers") || "").trim() || "0";
  const badge = String(formData.get("badge") || "").trim() || "内容团队";
  const bio = String(formData.get("bio") || "").trim();
  const status = String(formData.get("status") || "active").trim() || "active";
  const slug = await ensureUniqueAuthorSlug(String(formData.get("slug") || name), id || undefined);

  if (id) {
    const updated = await prisma.authorTeam.update({
      where: { id },
      data: {
        name,
        slug,
        focus,
        streak,
        winRate,
        monthlyRoi,
        followers,
        badge,
        bio: bio || null,
        status,
      },
    });

    revalidateContentViews();
    return updated;
  }

  const created = await prisma.authorTeam.create({
    data: {
      source: "manual",
      name,
      slug,
      focus,
      streak,
      winRate,
      monthlyRoi,
      followers,
      badge,
      bio: bio || null,
      status,
    },
  });

  revalidateContentViews();
  return created;
}

export async function toggleAuthorTeamStatus(authorId: string) {
  const current = await prisma.authorTeam.findUnique({
    where: { id: authorId },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error("作者/团队不存在。");
  }

  const updated = await prisma.authorTeam.update({
    where: { id: authorId },
    data: {
      status: current.status === "active" ? "inactive" : "active",
    },
  });

  revalidateContentViews();
  return updated;
}

export async function saveArticlePlan(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const authorId = String(formData.get("authorId") || "").trim();

  if (!title) {
    throw new Error("计划单标题不能为空。");
  }

  if (!authorId) {
    throw new Error("计划单必须绑定作者/团队。");
  }

  const author = await prisma.authorTeam.findUnique({
    where: { id: authorId },
    select: { id: true },
  });

  if (!author) {
    throw new Error("所选作者/团队不存在。");
  }

  const sport = normalizeSport(String(formData.get("sport") || "football"));
  const matchId = String(formData.get("matchId") || "").trim() || null;
  const leagueLabel = String(formData.get("leagueLabel") || "").trim() || "待配置联赛";
  const kickoff = parseDate(String(formData.get("kickoff") || ""));
  const teaser = String(formData.get("teaser") || "").trim() || "待补充摘要";
  const marketSummary = String(formData.get("marketSummary") || "").trim() || "待补充市场摘要";
  const fullAnalysisText = normalizeLines(String(formData.get("fullAnalysisText") || teaser));
  const previewText = resolvePreviewText(
    normalizeLines(String(formData.get("previewText") || "")),
    fullAnalysisText,
    teaser,
  );
  const price = Math.max(0, Number(formData.get("price") || 0) || 0);
  const performance = String(formData.get("performance") || "").trim() || "待验证";
  const tagsText = normalizeTags(String(formData.get("tagsText") || ""));
  const status = String(formData.get("status") || "draft").trim() || "draft";
  const isHot = String(formData.get("isHot") || "") === "on";
  const slug = await ensureUniquePlanSlug(String(formData.get("slug") || title), id || undefined);
  const publishedAt = status === "published" ? new Date() : null;

  if (id) {
    const current = await prisma.articlePlan.findUnique({
      where: { id },
      select: { publishedAt: true },
    });

    const updated = await prisma.articlePlan.update({
      where: { id },
      data: {
        slug,
        sport,
        matchId,
        title,
        leagueLabel,
        kickoff,
        teaser,
        marketSummary,
        previewText,
        fullAnalysisText,
        price,
        isHot,
        performance,
        tagsText,
        status,
        authorId,
        publishedAt: status === "published" ? current?.publishedAt ?? publishedAt : null,
      },
    });

    revalidateContentViews(updated.slug, matchId ?? undefined);
    return updated;
  }

  const created = await prisma.articlePlan.create({
    data: {
      source: "manual",
      slug,
      sport,
      matchId,
      title,
      leagueLabel,
      kickoff,
      teaser,
      marketSummary,
      previewText,
      fullAnalysisText,
      price,
      isHot,
      performance,
      tagsText,
      status,
      authorId,
      publishedAt,
    },
  });

  revalidateContentViews(created.slug, matchId ?? undefined);
  return created;
}

export async function savePredictionRecord(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const sport = normalizeSport(String(formData.get("sport") || "football"));
  const market = String(formData.get("market") || "").trim();
  const pick = String(formData.get("pick") || "").trim();

  if (!market) {
    throw new Error("预测玩法不能为空。");
  }

  if (!pick) {
    throw new Error("预测选择不能为空。");
  }

  const matchRef = String(formData.get("matchId") || "").trim();
  const authorId = String(formData.get("authorId") || "").trim() || null;
  const confidence = String(formData.get("confidence") || "").trim() || "--";
  const expectedEdge = String(formData.get("expectedEdge") || "").trim() || "--";
  const explanation = String(formData.get("explanation") || "").trim() || "待补充解释";
  const factorsText = normalizeLines(String(formData.get("factorsText") || ""));
  const result = String(formData.get("result") || "pending").trim() || "pending";
  const matchId = await resolveMatchRecordId(matchRef);

  if (authorId) {
    const author = await prisma.authorTeam.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!author) {
      throw new Error("所选作者/团队不存在。");
    }
  }

  const sourcePayload = JSON.stringify({ matchRef: matchRef || undefined });
  const sourceKey = matchRef ? `prediction:${matchRef}` : null;

  if (id) {
    const existing = await prisma.predictionRecord.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });

    if (existing) {
      const updated = await prisma.predictionRecord.update({
        where: { id },
        data: {
          sport,
          market,
          pick,
          confidence,
          expectedEdge,
          explanation,
          factorsText,
          result,
          authorId,
          matchId,
          sourceKey,
          sourcePayload,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });

      revalidateContentViews(undefined, matchRef || undefined);
      return updated;
    }
  }

  if (sourceKey) {
    const existingBySourceKey = await prisma.predictionRecord.findFirst({
      where: { sourceKey },
      select: { id: true, publishedAt: true },
    });

    if (existingBySourceKey) {
      const updated = await prisma.predictionRecord.update({
        where: { id: existingBySourceKey.id },
        data: {
          sport,
          market,
          pick,
          confidence,
          expectedEdge,
          explanation,
          factorsText,
          result,
          authorId,
          matchId,
          sourceKey,
          sourcePayload,
          publishedAt: existingBySourceKey.publishedAt ?? new Date(),
        },
      });

      revalidateContentViews(undefined, matchRef || undefined);
      return updated;
    }
  }

  const fallbackPredictionId = matchRef
    ? mockPredictions.find((prediction) => prediction.matchId === matchRef)?.id
    : undefined;

  const created = await prisma.predictionRecord.create({
    data: {
      id: id || fallbackPredictionId || undefined,
      source: "manual",
      sport,
      market,
      pick,
      confidence,
      expectedEdge,
      explanation,
      factorsText,
      result,
      sourceKey,
      authorId,
      matchId,
      sourcePayload,
      publishedAt: new Date(),
    },
  });

  revalidateContentViews(undefined, matchRef || undefined);
  return created;
}

export async function deletePredictionRecord(predictionId: string) {
  const current = await prisma.predictionRecord.findUnique({
    where: { id: predictionId },
    include: {
      match: {
        select: { sourceKey: true },
      },
    },
  });

  if (!current) {
    throw new Error("AI 预测记录不存在。");
  }

  await prisma.predictionRecord.delete({
    where: { id: predictionId },
  });

  const payload = parsePredictionPayload(current.sourcePayload);
  revalidateContentViews(undefined, current.match?.sourceKey ?? payload.matchRef ?? undefined);
}

export async function toggleArticlePlanStatus(planId: string) {
  const current = await prisma.articlePlan.findUnique({
    where: { id: planId },
    select: { id: true, slug: true, matchId: true, status: true, publishedAt: true },
  });

  if (!current) {
    throw new Error("计划单不存在。");
  }

  const nextStatus = current.status === "published" ? "draft" : "published";
  const updated = await prisma.articlePlan.update({
    where: { id: planId },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === "published" ? current.publishedAt ?? new Date() : null,
    },
  });

  revalidateContentViews(current.slug, current.matchId ?? undefined);
  return updated;
}

export async function toggleArticlePlanHot(planId: string) {
  const current = await prisma.articlePlan.findUnique({
    where: { id: planId },
    select: { id: true, slug: true, matchId: true, isHot: true },
  });

  if (!current) {
    throw new Error("计划单不存在。");
  }

  const updated = await prisma.articlePlan.update({
    where: { id: planId },
    data: {
      isHot: !current.isHot,
    },
  });

  revalidateContentViews(current.slug, current.matchId ?? undefined);
  return updated;
}

export async function archiveArticlePlan(planId: string) {
  const current = await prisma.articlePlan.findUnique({
    where: { id: planId },
    select: { id: true, slug: true, matchId: true },
  });

  if (!current) {
    throw new Error("计划单不存在。");
  }

  const updated = await prisma.articlePlan.update({
    where: { id: planId },
    data: {
      status: "archived",
      publishedAt: null,
    },
  });

  revalidateContentViews(current.slug, current.matchId ?? undefined);
  return updated;
}

export async function bootstrapMockContent() {
  for (const author of mockAuthorTeams) {
    const slug = await ensureUniqueAuthorSlug(author.name, author.id);

    await prisma.authorTeam.upsert({
      where: { id: author.id },
      update: {
        source: "mock-bootstrap",
        sourceKey: `mock-author:${author.id}`,
        name: author.name,
        slug,
        focus: author.focus,
        streak: author.streak,
        winRate: author.winRate,
        monthlyRoi: author.monthlyRoi,
        followers: author.followers,
        badge: author.badge,
        status: "active",
      },
      create: {
        id: author.id,
        source: "mock-bootstrap",
        sourceKey: `mock-author:${author.id}`,
        name: author.name,
        slug,
        focus: author.focus,
        streak: author.streak,
        winRate: author.winRate,
        monthlyRoi: author.monthlyRoi,
        followers: author.followers,
        badge: author.badge,
        status: "active",
      },
    });
  }

  for (const plan of mockArticlePlans) {
    const slug = await ensureUniquePlanSlug(plan.slug || plan.title, plan.id);

    await prisma.articlePlan.upsert({
      where: { id: plan.id },
      update: {
        source: "mock-bootstrap",
        sourceKey: `mock-plan:${plan.id}`,
        slug,
        sport: plan.sport,
        matchId: plan.matchId ?? null,
        title: plan.title,
        leagueLabel: plan.league,
        kickoff: parseDate(plan.kickoff),
        teaser: plan.teaser,
        marketSummary: plan.marketSummary,
        previewText: plan.analysis[0] ?? plan.teaser,
        fullAnalysisText: normalizeLines(plan.analysis.join("\n")),
        price: plan.price,
        isHot: plan.isHot,
        performance: plan.performance,
        tagsText: normalizeTags(plan.tags.join(" | ")),
        status: "published",
        publishedAt: new Date(),
        authorId: plan.authorId,
      },
      create: {
        id: plan.id,
        source: "mock-bootstrap",
        sourceKey: `mock-plan:${plan.id}`,
        slug,
        sport: plan.sport,
        matchId: plan.matchId ?? null,
        title: plan.title,
        leagueLabel: plan.league,
        kickoff: parseDate(plan.kickoff),
        teaser: plan.teaser,
        marketSummary: plan.marketSummary,
        previewText: plan.analysis[0] ?? plan.teaser,
        fullAnalysisText: normalizeLines(plan.analysis.join("\n")),
        price: plan.price,
        isHot: plan.isHot,
        performance: plan.performance,
        tagsText: normalizeTags(plan.tags.join(" | ")),
        status: "published",
        publishedAt: new Date(),
        authorId: plan.authorId,
      },
    });
  }

  for (const prediction of mockPredictions) {
    const matchId = await resolveMatchRecordId(prediction.matchId);

    await prisma.predictionRecord.upsert({
      where: { id: prediction.id },
      update: {
        source: "mock-bootstrap",
        sourceKey: `prediction:${prediction.matchId}`,
        sport: prediction.sport,
        market: prediction.market,
        pick: prediction.pick,
        confidence: prediction.confidence,
        expectedEdge: prediction.expectedEdge,
        explanation: prediction.explanation,
        factorsText: normalizeLines(prediction.factors.join("\n")),
        result: prediction.result,
        authorId: mockArticlePlans.find((plan) => plan.matchId === prediction.matchId)?.authorId ?? null,
        matchId,
        sourcePayload: JSON.stringify({ matchRef: prediction.matchId }),
        publishedAt: new Date(),
      },
      create: {
        id: prediction.id,
        source: "mock-bootstrap",
        sourceKey: `prediction:${prediction.matchId}`,
        sport: prediction.sport,
        market: prediction.market,
        pick: prediction.pick,
        confidence: prediction.confidence,
        expectedEdge: prediction.expectedEdge,
        explanation: prediction.explanation,
        factorsText: normalizeLines(prediction.factors.join("\n")),
        result: prediction.result,
        authorId: mockArticlePlans.find((plan) => plan.matchId === prediction.matchId)?.authorId ?? null,
        matchId,
        sourcePayload: JSON.stringify({ matchRef: prediction.matchId }),
        publishedAt: new Date(),
      },
    });
  }

  revalidateContentViews();
}
