import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Sport } from "@/lib/types";

export type AdminLeagueRecord = {
  id: string;
  source: string;
  sourceKey?: string;
  sport: Sport;
  slug: string;
  name: string;
  displayName?: string;
  region: string;
  season: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  teamCount: number;
  matchCount: number;
  adminLockedFields: string[];
  adminNote?: string;
  adminEditedAt?: string;
  lastSyncedAt?: string;
  updatedAt: string;
  latestAudit?: AdminEventAuditRecord;
};

export type AdminMatchRecord = {
  id: string;
  source: string;
  sourceKey?: string;
  sport: Sport;
  slug?: string;
  status: string;
  kickoff: string;
  clock?: string;
  venue: string;
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  scoreText?: string;
  statLine?: string;
  insight?: string;
  adminVisible: boolean;
  adminLockedFields: string[];
  adminNote?: string;
  adminEditedAt?: string;
  lastSyncedAt?: string;
  updatedAt: string;
  latestAudit?: AdminEventAuditRecord;
  latestOdds?: {
    bookmaker?: string;
    home?: number;
    draw?: number;
    away?: number;
    spread?: string;
    total?: string;
    movement?: string;
    capturedAt: string;
  };
};

export type AdminEventAuditRecord = {
  id: string;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  status: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
};

export type AdminEventsDashboard = {
  metrics: {
    totalLeagues: number;
    activeLeagues: number;
    manualLeagues: number;
    totalMatches: number;
    visibleMatches: number;
    manualMatches: number;
  };
  leagues: AdminLeagueRecord[];
  matches: AdminMatchRecord[];
  leagueOptions: Array<{
    id: string;
    name: string;
    label: string;
    sport: Sport;
    status: string;
  }>;
  auditLogs: AdminEventAuditRecord[];
  auditActionOptions: string[];
};

export type AdminEventsFilters = {
  sport?: Sport | "all";
  leagueStatus?: "all" | "active" | "inactive";
  matchStatus?: "all" | "live" | "upcoming" | "finished";
  matchVisibility?: "all" | "visible" | "hidden";
  query?: string;
  auditStatus?: "all" | "success" | "failed";
  auditAction?: string;
  auditTargetType?: "all" | "league" | "match";
  auditQuery?: string;
};

const sitePaths = [
  "/",
  "/live/football",
  "/live/basketball",
  "/live/cricket",
  "/live/esports",
  "/database",
  "/matches/[id]",
  "/admin",
];

const ADMIN_EVENT_AUDIT_ACTIONS = [
  "save-admin-league",
  "toggle-admin-league-status",
  "toggle-admin-league-featured",
  "move-admin-league-up",
  "move-admin-league-down",
  "clear-admin-league-override",
  "delete-admin-league",
  "save-admin-match",
  "toggle-admin-match-visibility",
  "clear-admin-match-override",
  "delete-admin-match",
] as const;

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      if (path.includes("[") && path.includes("]")) {
        revalidatePath(path, "page");
      } else {
        revalidatePath(path);
      }
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

function normalizeSport(value: string): Sport {
  if (value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return "football";
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === "on";
}

function parseInteger(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFloatValue(value: FormDataEntryValue | null) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return undefined;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseLockedFields(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Fall through to legacy pipe-delimited parsing.
  }

  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeLockedFields(fields: string[]) {
  const normalized = Array.from(new Set(fields.filter(Boolean)));
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

function parseOverrideJson<T>(value: string | null | undefined): Partial<T> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Partial<T>;
  } catch {
    return {};
  }
}

function buildLeagueSourceKey(sport: Sport, slug: string) {
  return `manual-league:${sport}:${slug}`;
}

function buildMatchSourceKey(sport: Sport, slug: string) {
  return `manual-match:${sport}:${slug}`;
}

async function getNextLeagueSortOrder() {
  const league = await prisma.league.findFirst({
    orderBy: [{ sortOrder: "desc" }, { updatedAt: "desc" }],
    select: { sortOrder: true },
  });

  return (league?.sortOrder ?? 0) + 1;
}

async function getNextMatchKickoff() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  return now;
}

async function findTeamIdsForMatch(leagueId: string, homeTeamName: string, awayTeamName: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: {
      id: true,
      name: true,
      displayName: true,
      shortName: true,
    },
  });

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fff]/g, "");

  const matchName = (target: string) => {
    const normalizedTarget = normalize(target);
    const found = teams.find((team) =>
      [team.name, team.displayName ?? "", team.shortName]
        .filter(Boolean)
        .some((value) => normalize(value) === normalizedTarget),
    );

    return found?.id;
  };

  return {
    homeTeamId: matchName(homeTeamName),
    awayTeamId: matchName(awayTeamName),
  };
}

export async function getAdminEventsDashboard(
  filters: AdminEventsFilters = {},
): Promise<AdminEventsDashboard> {
  const sportFilter = filters.sport && filters.sport !== "all" ? filters.sport : undefined;
  const query = filters.query?.trim();
  const auditQuery = filters.auditQuery?.trim();
  const leagueWhere = {
    ...(sportFilter ? { sport: sportFilter } : {}),
    ...(filters.leagueStatus && filters.leagueStatus !== "all" ? { status: filters.leagueStatus } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { displayName: { contains: query } },
            { slug: { contains: query } },
            { region: { contains: query } },
            { season: { contains: query } },
          ],
        }
      : {}),
  };
  const matchWhere = {
    ...(sportFilter ? { sport: sportFilter } : {}),
    ...(filters.matchStatus && filters.matchStatus !== "all" ? { status: filters.matchStatus } : {}),
    ...(filters.matchVisibility === "visible"
      ? { adminVisible: true }
      : filters.matchVisibility === "hidden"
        ? { adminVisible: false }
        : {}),
    ...(query
      ? {
          OR: [
            { homeTeamName: { contains: query } },
            { awayTeamName: { contains: query } },
            { league: { name: { contains: query } } },
            { league: { displayName: { contains: query } } },
            { sourceKey: { contains: query } },
          ],
        }
      : {}),
  };

  const [leagueCounts, matchCounts, leagues, matches, leagueOptions, auditLogs] = await Promise.all([
    prisma.league.findMany({
      select: {
        id: true,
        status: true,
        source: true,
        adminLockedFields: true,
      },
    }),
    prisma.match.findMany({
      select: {
        id: true,
        source: true,
        adminVisible: true,
        adminLockedFields: true,
      },
    }),
    prisma.league.findMany({
      where: leagueWhere,
      include: {
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
      },
      orderBy: [{ sport: "asc" }, { featured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 30,
    }),
    prisma.match.findMany({
      where: matchWhere,
      include: {
        league: {
          select: {
            id: true,
            slug: true,
            name: true,
            displayName: true,
          },
        },
        oddsSnapshots: {
          orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ kickoff: "desc" }, { updatedAt: "desc" }],
      take: 36,
    }),
    prisma.league.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        sport: true,
        status: true,
      },
      orderBy: [{ sport: "asc" }, { status: "asc" }, { featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.adminAuditLog.findMany({
      where: {
        OR: [{ scope: "events" }, { scope: { startsWith: "events." } }],
        ...(filters.auditStatus && filters.auditStatus !== "all" ? { status: filters.auditStatus } : {}),
        ...(filters.auditAction && filters.auditAction !== "all" ? { action: filters.auditAction } : {}),
        ...(filters.auditTargetType && filters.auditTargetType !== "all"
          ? { targetType: filters.auditTargetType }
          : {}),
        ...(auditQuery
          ? {
              AND: [
                {
                  OR: [
                    { action: { contains: auditQuery } },
                    { scope: { contains: auditQuery } },
                    { detail: { contains: auditQuery } },
                    { actorDisplayName: { contains: auditQuery } },
                    { actorRole: { contains: auditQuery } },
                    { targetType: { contains: auditQuery } },
                    { targetId: { contains: auditQuery } },
                    { ipAddress: { contains: auditQuery } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const activeLeagueCount = leagueCounts.filter((item) => item.status === "active").length;
  const manualLeagueCount = leagueCounts.filter((item) => item.source === "manual").length;
  const visibleMatchCount = matchCounts.filter((item) => item.adminVisible).length;
  const manualMatchCount = matchCounts.filter((item) => item.source === "manual").length;
  const auditTargetIds = [...new Set([...leagues.map((league) => league.id), ...matches.map((match) => match.id)])];
  const latestAuditRows =
    auditTargetIds.length > 0
      ? await prisma.adminAuditLog.findMany({
          where: {
            OR: [{ scope: "events" }, { scope: { startsWith: "events." } }],
            targetId: { in: auditTargetIds },
            targetType: { in: ["league", "match"] },
          },
          orderBy: { createdAt: "desc" },
          take: Math.max(auditTargetIds.length * 4, 24),
        })
      : [];
  const leagueLabelById = new Map(
    leagues.map((league) => [league.id, league.displayName ?? league.name]),
  );
  const matchLabelById = new Map(
    matches.map((match) => [match.id, `${match.homeTeamName} vs ${match.awayTeamName}`]),
  );
  const buildAuditRecord = (item: (typeof auditLogs)[number]): AdminEventAuditRecord => ({
    id: item.id,
    actorDisplayName: item.actorDisplayName,
    actorRole: item.actorRole,
    action: item.action,
    scope: item.scope,
    targetType: item.targetType ?? undefined,
    targetId: item.targetId ?? undefined,
    targetLabel:
      (item.targetId ? leagueLabelById.get(item.targetId) : undefined) ??
      (item.targetId ? matchLabelById.get(item.targetId) : undefined),
    status: item.status,
    detail: item.detail ?? undefined,
    ipAddress: item.ipAddress ?? undefined,
    createdAt: item.createdAt.toISOString(),
  });
  const latestAuditByTargetId = new Map<string, AdminEventAuditRecord>();

  for (const item of latestAuditRows) {
    if (!item.targetId || latestAuditByTargetId.has(item.targetId)) {
      continue;
    }

    latestAuditByTargetId.set(item.targetId, buildAuditRecord(item));
  }

  return {
    metrics: {
      totalLeagues: leagueCounts.length,
      activeLeagues: activeLeagueCount,
      manualLeagues: manualLeagueCount,
      totalMatches: matchCounts.length,
      visibleMatches: visibleMatchCount,
      manualMatches: manualMatchCount,
    },
    leagues: leagues.map((league) => ({
      id: league.id,
      source: league.source,
      sourceKey: league.sourceKey ?? undefined,
      sport: normalizeSport(league.sport),
      slug: league.slug,
      name: league.name,
      displayName: league.displayName ?? undefined,
      region: league.region,
      season: league.season,
      status: league.status,
      featured: league.featured,
      sortOrder: league.sortOrder,
      teamCount: league._count.teams,
      matchCount: league._count.matches,
      adminLockedFields: parseLockedFields(league.adminLockedFields),
      adminNote: league.adminNote ?? undefined,
      adminEditedAt: league.adminEditedAt?.toISOString(),
      lastSyncedAt: league.lastSyncedAt?.toISOString(),
      updatedAt: league.updatedAt.toISOString(),
      latestAudit: latestAuditByTargetId.get(league.id),
    })),
    matches: matches.map((match) => ({
      id: match.id,
      source: match.source,
      sourceKey: match.sourceKey ?? undefined,
      sport: normalizeSport(match.sport),
      slug: match.slug ?? undefined,
      status: match.status,
      kickoff: match.kickoff.toISOString(),
      clock: match.clock ?? undefined,
      venue: match.venue,
      leagueId: match.leagueId,
      leagueName: match.league.displayName ?? match.league.name,
      leagueSlug: match.league.slug,
      homeTeamId: match.homeTeamId ?? undefined,
      awayTeamId: match.awayTeamId ?? undefined,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
      scoreText: match.scoreText ?? undefined,
      statLine: match.statLine ?? undefined,
      insight: match.insight ?? undefined,
      adminVisible: match.adminVisible,
      adminLockedFields: parseLockedFields(match.adminLockedFields),
      adminNote: match.adminNote ?? undefined,
      adminEditedAt: match.adminEditedAt?.toISOString(),
      lastSyncedAt: match.lastSyncedAt?.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
      latestAudit: latestAuditByTargetId.get(match.id),
      latestOdds: match.oddsSnapshots[0]
        ? {
            bookmaker: match.oddsSnapshots[0].bookmaker ?? undefined,
            home: match.oddsSnapshots[0].home ?? undefined,
            draw: match.oddsSnapshots[0].draw ?? undefined,
            away: match.oddsSnapshots[0].away ?? undefined,
            spread: match.oddsSnapshots[0].spread ?? undefined,
            total: match.oddsSnapshots[0].total ?? undefined,
            movement: match.oddsSnapshots[0].movement ?? undefined,
            capturedAt: match.oddsSnapshots[0].capturedAt.toISOString(),
          }
        : undefined,
    })),
    leagueOptions: leagueOptions.map((league) => ({
      id: league.id,
      name: league.displayName ?? league.name,
      label: `${league.displayName ?? league.name} · ${league.sport} · ${league.status}`,
      sport: normalizeSport(league.sport),
      status: league.status,
    })),
    auditLogs: auditLogs.map((item) => ({
      ...buildAuditRecord(item),
    })),
    auditActionOptions: [...ADMIN_EVENT_AUDIT_ACTIONS],
  };
}

export async function saveAdminLeague(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const sport = normalizeSport(String(formData.get("sport") ?? "football").trim());
  const slugInput = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || name;
  const region = String(formData.get("region") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const featured = parseBoolean(formData.get("featured"));
  const sortOrder = parseInteger(formData.get("sortOrder")) ?? (await getNextLeagueSortOrder());
  const adminNote = parseOptionalText(formData.get("adminNote")) ?? null;

  if (!name || !region || !season) {
    throw new Error("LEAGUE_INVALID");
  }

  const slug = slugify(slugInput || displayName || name);

  if (!slug) {
    throw new Error("LEAGUE_INVALID_SLUG");
  }

  const overridePayload = {
    name,
    displayName,
    region,
    season,
    status,
    featured,
    sortOrder,
  };
  const lockedFields = ["name", "displayName", "region", "season", "status", "featured", "sortOrder"];

  if (id) {
    const existing = await prisma.league.findUnique({
      where: { id },
      select: { id: true, source: true },
    });

    if (!existing) {
      throw new Error("LEAGUE_NOT_FOUND");
    }

    const updated = await prisma.league.update({
      where: { id },
      data: {
        sport,
        slug,
        name,
        displayName,
        region,
        season,
        status,
        featured,
        sortOrder,
        adminLockedFields: existing.source === "manual" ? null : serializeLockedFields(lockedFields),
        adminOverrideJson: existing.source === "manual" ? null : JSON.stringify(overridePayload),
        adminNote,
        adminEditedAt: new Date(),
      },
      select: { id: true },
    });

    safeRevalidate(sitePaths);
    return updated;
  }

  const created = await prisma.league.create({
    data: {
      source: "manual",
      sourceKey: buildLeagueSourceKey(sport, slug),
      sport,
      slug,
      name,
      displayName,
      region,
      season,
      status,
      featured,
      sortOrder,
      adminLockedFields: serializeLockedFields(lockedFields),
      adminOverrideJson: JSON.stringify(overridePayload),
      adminNote,
      adminEditedAt: new Date(),
    },
    select: { id: true },
  });

  safeRevalidate(sitePaths);
  return created;
}

export async function toggleAdminLeagueStatus(id: string) {
  const current = await prisma.league.findUnique({
    where: { id },
    select: { id: true, status: true, source: true, adminOverrideJson: true, adminLockedFields: true },
  });

  if (!current) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  const nextStatus = current.status === "active" ? "inactive" : "active";
  const lockedFields = current.source === "manual" ? parseLockedFields(current.adminLockedFields) : Array.from(new Set([...parseLockedFields(current.adminLockedFields), "status"]));
  const overridePayload = {
    ...parseOverrideJson<Record<string, unknown>>(current.adminOverrideJson),
    status: nextStatus,
  };

  await prisma.league.update({
    where: { id },
    data: {
      status: nextStatus,
      adminLockedFields: current.source === "manual" ? current.adminLockedFields : serializeLockedFields(lockedFields),
      adminOverrideJson: current.source === "manual" ? current.adminOverrideJson : JSON.stringify(overridePayload),
      adminEditedAt: new Date(),
    },
  });

  safeRevalidate(sitePaths);
}

export async function toggleAdminLeagueFeatured(id: string) {
  const current = await prisma.league.findUnique({
    where: { id },
    select: { id: true, featured: true, source: true, adminOverrideJson: true, adminLockedFields: true },
  });

  if (!current) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  const nextFeatured = !current.featured;
  const lockedFields = current.source === "manual" ? parseLockedFields(current.adminLockedFields) : Array.from(new Set([...parseLockedFields(current.adminLockedFields), "featured"]));
  const overridePayload = {
    ...parseOverrideJson<Record<string, unknown>>(current.adminOverrideJson),
    featured: nextFeatured,
  };

  await prisma.league.update({
    where: { id },
    data: {
      featured: nextFeatured,
      adminLockedFields: current.source === "manual" ? current.adminLockedFields : serializeLockedFields(lockedFields),
      adminOverrideJson: current.source === "manual" ? current.adminOverrideJson : JSON.stringify(overridePayload),
      adminEditedAt: new Date(),
    },
  });

  safeRevalidate(sitePaths);
}

export async function moveAdminLeague(id: string, direction: "up" | "down") {
  const leagues = await prisma.league.findMany({
    orderBy: [{ sport: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      sport: true,
      sortOrder: true,
      source: true,
      adminOverrideJson: true,
      adminLockedFields: true,
    },
  });

  const index = leagues.findIndex((item) => item.id === id);

  if (index < 0) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  const current = leagues[index];
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const target = leagues[targetIndex];

  if (!target || target.sport !== current.sport) {
    return;
  }

  const buildUpdate = (item: typeof current, nextSortOrder: number) => {
    const lockedFields = item.source === "manual" ? parseLockedFields(item.adminLockedFields) : Array.from(new Set([...parseLockedFields(item.adminLockedFields), "sortOrder"]));
    const overridePayload = {
      ...parseOverrideJson<Record<string, unknown>>(item.adminOverrideJson),
      sortOrder: nextSortOrder,
    };

    return {
      sortOrder: nextSortOrder,
      adminLockedFields: item.source === "manual" ? item.adminLockedFields : serializeLockedFields(lockedFields),
      adminOverrideJson: item.source === "manual" ? item.adminOverrideJson : JSON.stringify(overridePayload),
      adminEditedAt: new Date(),
    };
  };

  await prisma.$transaction([
    prisma.league.update({
      where: { id: current.id },
      data: buildUpdate(current, target.sortOrder),
    }),
    prisma.league.update({
      where: { id: target.id },
      data: buildUpdate(target, current.sortOrder),
    }),
  ]);

  safeRevalidate(sitePaths);
}

export async function clearAdminLeagueOverride(id: string) {
  const current = await prisma.league.findUnique({
    where: { id },
    select: { id: true, source: true },
  });

  if (!current) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  if (current.source !== "manual") {
    await prisma.league.update({
      where: { id },
      data: {
        adminLockedFields: null,
        adminOverrideJson: null,
        adminEditedAt: new Date(),
      },
    });
  }

  safeRevalidate(sitePaths);
}

export async function deleteAdminLeague(id: string) {
  const current = await prisma.league.findUnique({
    where: { id },
    select: {
      id: true,
      source: true,
    },
  });

  if (!current) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  if (current.source !== "manual") {
    throw new Error("LEAGUE_DELETE_FORBIDDEN");
  }

  await prisma.league.delete({
    where: { id },
  });

  safeRevalidate(sitePaths);
}

export async function saveAdminMatch(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const status = String(formData.get("status") ?? "upcoming").trim() || "upcoming";
  const kickoff = parseDateTime(formData.get("kickoff")) ?? (await getNextMatchKickoff());
  const clock = parseOptionalText(formData.get("clock")) ?? null;
  const venue = parseOptionalText(formData.get("venue")) ?? "--";
  const homeTeamName = String(formData.get("homeTeamName") ?? "").trim();
  const awayTeamName = String(formData.get("awayTeamName") ?? "").trim();
  const homeScore = parseInteger(formData.get("homeScore")) ?? null;
  const awayScore = parseInteger(formData.get("awayScore")) ?? null;
  const scoreText =
    parseOptionalText(formData.get("scoreText")) ??
    (homeScore != null && awayScore != null ? `${homeScore} - ${awayScore}` : undefined) ??
    null;
  const statLine = parseOptionalText(formData.get("statLine")) ?? null;
  const insight = parseOptionalText(formData.get("insight")) ?? null;
  const adminVisible = parseBoolean(formData.get("adminVisible"));
  const adminNote = parseOptionalText(formData.get("adminNote")) ?? null;
  const bookmaker = parseOptionalText(formData.get("bookmaker")) ?? null;
  const oddsHome = parseFloatValue(formData.get("oddsHome")) ?? null;
  const oddsDraw = parseFloatValue(formData.get("oddsDraw")) ?? null;
  const oddsAway = parseFloatValue(formData.get("oddsAway")) ?? null;
  const oddsSpread = parseOptionalText(formData.get("oddsSpread")) ?? null;
  const oddsTotal = parseOptionalText(formData.get("oddsTotal")) ?? null;
  const oddsMovement = parseOptionalText(formData.get("oddsMovement")) ?? null;

  if (!leagueId || !homeTeamName || !awayTeamName) {
    throw new Error("MATCH_INVALID");
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      sport: true,
      slug: true,
      name: true,
      displayName: true,
    },
  });

  if (!league) {
    throw new Error("MATCH_LEAGUE_NOT_FOUND");
  }

  const sport = normalizeSport(league.sport);
  const teamIds = await findTeamIdsForMatch(leagueId, homeTeamName, awayTeamName);
  const slug = slugify(`${homeTeamName}-${awayTeamName}-${kickoff.toISOString()}`);
  const overridePayload = {
    leagueId,
    status,
    kickoff: kickoff.toISOString(),
    clock,
    venue,
    homeTeamId: teamIds.homeTeamId ?? null,
    awayTeamId: teamIds.awayTeamId ?? null,
    homeTeamName,
    awayTeamName,
    homeScore,
    awayScore,
    scoreText,
    statLine,
    insight,
    adminVisible,
  };
  const lockedFields = [
    "leagueId",
    "status",
    "kickoff",
    "clock",
    "venue",
    "homeTeamId",
    "awayTeamId",
    "homeTeamName",
    "awayTeamName",
    "homeScore",
    "awayScore",
    "scoreText",
    "statLine",
    "insight",
    "adminVisible",
  ];

  let matchId = id;

  if (id) {
    const existing = await prisma.match.findUnique({
      where: { id },
      select: { id: true, source: true },
    });

    if (!existing) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const updated = await prisma.match.update({
      where: { id },
      data: {
        sport,
        slug,
        status,
        kickoff,
        clock,
        venue,
        leagueId,
        homeTeamId: teamIds.homeTeamId ?? null,
        awayTeamId: teamIds.awayTeamId ?? null,
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        scoreText,
        statLine,
        insight,
        adminVisible,
        adminLockedFields: existing.source === "manual" ? serializeLockedFields(lockedFields) : serializeLockedFields(lockedFields),
        adminOverrideJson: existing.source === "manual" ? JSON.stringify(overridePayload) : JSON.stringify(overridePayload),
        adminNote,
        adminEditedAt: new Date(),
      },
      select: { id: true },
    });

    matchId = updated.id;
  } else {
    const created = await prisma.match.create({
      data: {
        source: "manual",
        sourceKey: buildMatchSourceKey(sport, slug || `${league.slug}-${Date.now()}`),
        sport,
        slug,
        status,
        kickoff,
        clock,
        venue,
        leagueId,
        homeTeamId: teamIds.homeTeamId ?? null,
        awayTeamId: teamIds.awayTeamId ?? null,
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        scoreText,
        statLine,
        insight,
        adminVisible,
        adminLockedFields: serializeLockedFields(lockedFields),
        adminOverrideJson: JSON.stringify(overridePayload),
        adminNote,
        adminEditedAt: new Date(),
      },
      select: { id: true },
    });

    matchId = created.id;
  }

  const hasOddsPayload =
    bookmaker ||
    oddsHome != null ||
    oddsDraw != null ||
    oddsAway != null ||
    oddsSpread ||
    oddsTotal ||
    oddsMovement;

  if (hasOddsPayload) {
    await prisma.oddsSnapshot.create({
      data: {
        source: "manual",
        sourceKey: `manual-odds:${matchId}:${Date.now()}`,
        bookmaker,
        market: "main",
        home: oddsHome,
        draw: oddsDraw,
        away: oddsAway,
        spread: oddsSpread,
        total: oddsTotal,
        movement: oddsMovement,
        matchId,
      },
    });
  }

  safeRevalidate(sitePaths);
  return { id: matchId };
}

export async function toggleAdminMatchVisibility(id: string) {
  const current = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      adminVisible: true,
      adminOverrideJson: true,
      adminLockedFields: true,
    },
  });

  if (!current) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const nextVisible = !current.adminVisible;
  const lockedFields = Array.from(new Set([...parseLockedFields(current.adminLockedFields), "adminVisible"]));
  const overridePayload = {
    ...parseOverrideJson<Record<string, unknown>>(current.adminOverrideJson),
    adminVisible: nextVisible,
  };

  await prisma.match.update({
    where: { id },
    data: {
      adminVisible: nextVisible,
      adminLockedFields: serializeLockedFields(lockedFields),
      adminOverrideJson: JSON.stringify(overridePayload),
      adminEditedAt: new Date(),
    },
  });

  safeRevalidate(sitePaths);
}

export async function clearAdminMatchOverride(id: string) {
  const current = await prisma.match.findUnique({
    where: { id },
    select: { id: true, source: true },
  });

  if (!current) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (current.source !== "manual") {
    await prisma.match.update({
      where: { id },
      data: {
        adminLockedFields: null,
        adminOverrideJson: null,
        adminEditedAt: new Date(),
      },
    });
  }

  safeRevalidate(sitePaths);
}

export async function deleteAdminMatch(id: string) {
  const current = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      source: true,
    },
  });

  if (!current) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (current.source !== "manual") {
    throw new Error("MATCH_DELETE_FORBIDDEN");
  }

  await prisma.match.delete({
    where: { id },
  });

  safeRevalidate(sitePaths);
}
