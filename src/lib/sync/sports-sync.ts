import { prisma } from "@/lib/prisma";
import {
  getApiSportsDatabaseSnapshot,
  getApiSportsMatchesBySport,
  getApiSportsTrackedLeagues,
} from "@/lib/api-sports-provider";
import type {
  HeadToHeadRow,
  League,
  ScheduleRow,
  Sport,
  StandingRow,
  Team,
} from "@/lib/types";

function mapSport(value: string): Sport {
  if (value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return "football";
}

type SyncCounts = {
  leagues: number;
  teams: number;
  matches: number;
  oddsSnapshots: number;
  standings: number;
  schedules: number;
  headToHeads: number;
};

type SportSyncBreakdown = {
  sport: Sport;
  leagues: number;
  matches: number;
  coveredLeagues: string[];
};

export type RecentSyncRun = {
  id: string;
  source?: string;
  status: string;
  triggerSource?: string;
  requestedByUserId?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  countsSummary?: string;
  sports?: SportSyncBreakdown[];
  failures: string[];
  errorText?: string;
};

export type SportsSyncSummary = {
  runId: string;
  source: "api-sports-free";
  scope: "tracked-sports";
  mode: "database-sync";
  status: "completed" | "completed_with_errors" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  counts: SyncCounts;
  sports: SportSyncBreakdown[];
  failures: string[];
};

export type SyncRotationPlan = {
  source: "api-sports-free";
  windowMinutes: number;
  cooldownSeconds: number;
  currentSlotStartedAt: string;
  nextSlotStartsAt: string;
  sports: Array<{
    sport: Extract<Sport, "football" | "basketball">;
    currentLeagues: string[];
    nextLeagues: string[];
  }>;
};

type StoredLeagueRef = {
  id: string;
  slug: string;
  sport: Sport;
};

type StoredTeamRef = {
  id: string;
  sourceKey: string | null;
  name: string;
  displayName: string | null;
  shortName: string;
};

const syncRunStore = prisma as typeof prisma & {
  syncRun: {
    create(args: {
      data: {
        id?: string;
        source: string;
        scope: string;
        status: string;
        triggerSource?: string;
        requestedByUserId?: string | null;
        startedAt: Date;
      };
    }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: {
        status: string;
        finishedAt: Date;
        summaryJson?: string;
        errorText?: string;
      };
    }): Promise<unknown>;
    findFirst(args: {
      where: {
        source?: string;
        scope?: string;
        status?: string;
      };
      orderBy: { startedAt: "asc" | "desc" };
      select: {
        id: true;
        status?: true;
        startedAt: true;
        finishedAt?: true;
      };
    }): Promise<{ id: string; status?: string; startedAt: Date; finishedAt?: Date | null } | null>;
    findMany(args: {
      take: number;
      orderBy: { startedAt: "asc" | "desc" };
      select: {
        id: true;
        source: true;
        status: true;
        triggerSource: true;
        requestedByUserId: true;
        startedAt: true;
        finishedAt: true;
        summaryJson: true;
        errorText: true;
      };
    }): Promise<Array<{
      id: string;
      source: string;
      status: string;
      triggerSource: string;
      requestedByUserId: string | null;
      startedAt: Date;
      finishedAt: Date | null;
      summaryJson: string | null;
      errorText: string | null;
    }>>;
  };
  syncLock: {
    create(args: {
      data: {
        key: string;
        source: string;
        scope: string;
        runId: string;
        owner?: string | null;
        acquiredAt: Date;
        expiresAt: Date;
      };
    }): Promise<unknown>;
    findUnique(args: {
      where: { key: string };
      select: {
        key: true;
        runId: true;
        owner: true;
        expiresAt: true;
      };
    }): Promise<{
      key: string;
      runId: string;
      owner: string | null;
      expiresAt: Date;
    } | null>;
    upsert(args: {
      where: { key: string };
      update: {
        source: string;
        scope: string;
        runId: string;
        owner?: string | null;
        acquiredAt: Date;
        expiresAt: Date;
      };
      create: {
        key: string;
        source: string;
        scope: string;
        runId: string;
        owner?: string | null;
        acquiredAt: Date;
        expiresAt: Date;
      };
    }): Promise<unknown>;
    deleteMany(args: {
      where: { key: string; runId: string };
    }): Promise<unknown>;
  };
};

const SYNC_PROVIDER_SOURCE = "api-sports-free";
const STORAGE_SOURCE = "nowscore";
const SYNC_SCOPE = "tracked-sports";
const SNAPSHOT_ROTATION_WINDOW_MS = 15 * 60 * 1000;
const SNAPSHOT_ROTATION_LIMITS: Record<Extract<Sport, "football" | "basketball">, number> = {
  football: 1,
  basketball: 1,
};
const API_RETRY_DELAYS_MS = [1200, 2800];
const MIN_SYNC_INTERVAL_MS = 70 * 1000;

const RUNNING_SYNC_STALE_MS = 30 * 60 * 1000;
const SYNC_LOCK_TTL_MS = 20 * 60 * 1000;
const SYNC_LOCK_KEY = `${SYNC_PROVIDER_SOURCE}:${SYNC_SCOPE}`;

function createEmptyCounts(): SyncCounts {
  return {
    leagues: 0,
    teams: 0,
    matches: 0,
    oddsSnapshots: 0,
    standings: 0,
    schedules: 0,
    headToHeads: 0,
  };
}

function stringifyPayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function buildCountsSummary(counts: SyncCounts) {
  return [
    `L ${counts.leagues}`,
    `T ${counts.teams}`,
    `M ${counts.matches}`,
    `O ${counts.oddsSnapshots}`,
    `S ${counts.standings}`,
    `Sc ${counts.schedules}`,
    `H2H ${counts.headToHeads}`,
  ].join(" / ");
}

function parseStoredSummary(summaryJson: string | null) {
  if (!summaryJson) {
    return null;
  }

  try {
    return JSON.parse(summaryJson) as SportsSyncSummary;
  } catch {
    return null;
  }
}

function buildSyncLockOwner(triggerSource?: string, requestedByUserId?: string | null) {
  return requestedByUserId || triggerSource || "system";
}

async function acquireSyncLock(runId: string, triggerSource?: string, requestedByUserId?: string | null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SYNC_LOCK_TTL_MS);
  const owner = buildSyncLockOwner(triggerSource, requestedByUserId);

  try {
    await syncRunStore.syncLock.create({
      data: {
        key: SYNC_LOCK_KEY,
        source: SYNC_PROVIDER_SOURCE,
        scope: SYNC_SCOPE,
        runId,
        owner,
        acquiredAt: now,
        expiresAt,
      },
    });
    return;
  } catch {
    const currentLock = await syncRunStore.syncLock.findUnique({
      where: { key: SYNC_LOCK_KEY },
      select: {
        key: true,
        runId: true,
        owner: true,
        expiresAt: true,
      },
    });

    if (currentLock && currentLock.expiresAt.getTime() > now.getTime()) {
      throw new Error("SYNC_ALREADY_RUNNING");
    }

    await syncRunStore.syncLock.upsert({
      where: { key: SYNC_LOCK_KEY },
      update: {
        source: SYNC_PROVIDER_SOURCE,
        scope: SYNC_SCOPE,
        runId,
        owner,
        acquiredAt: now,
        expiresAt,
      },
      create: {
        key: SYNC_LOCK_KEY,
        source: SYNC_PROVIDER_SOURCE,
        scope: SYNC_SCOPE,
        runId,
        owner,
        acquiredAt: now,
        expiresAt,
      },
    });
  }
}

async function releaseSyncLock(runId: string) {
  await syncRunStore.syncLock.deleteMany({
    where: {
      key: SYNC_LOCK_KEY,
      runId,
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildTeamSlug(team: Team) {
  const readable = slugify(team.shortName || team.name || "");
  const sourceId = slugify(team.id) || "team";

  return readable ? `${readable}-${sourceId}` : sourceId;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function buildLeagueSourceKey(league: League) {
  return `league:${league.sport}:${league.id}`;
}

function buildTeamSourceKey(sport: Sport, leagueSlug: string, teamId: string) {
  return `team:${sport}:${leagueSlug}:${teamId}`;
}

function buildMatchSourceKey(sport: Sport, matchId: string) {
  return `match:${sport}:${matchId}`;
}

function pickRotatingLeagues<T>(items: T[], seed: number, limit: number) {
  if (items.length <= limit) {
    return items;
  }

  return Array.from({ length: limit }, (_, index) => items[(seed + index) % items.length]);
}

function buildRotationSeed(sport: Extract<Sport, "football" | "basketball">, startedAt: Date) {
  const slot = Math.floor(startedAt.getTime() / SNAPSHOT_ROTATION_WINDOW_MS);
  return sport === "football" ? slot : slot + 1;
}

function buildSlotStart(date: Date) {
  return new Date(Math.floor(date.getTime() / SNAPSHOT_ROTATION_WINDOW_MS) * SNAPSHOT_ROTATION_WINDOW_MS);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableApiError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("api-sports") || message.includes("rate") || message.includes("fetch");
}

async function runWithApiRetry<T>(task: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= API_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt >= API_RETRY_DELAYS_MS.length || !isRetryableApiError(error)) {
        throw error;
      }

      await sleep(API_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("API retry failed");
}

function parseScore(score: string) {
  const match = score.match(/(\d+)\s*-\s*(\d+)/);

  if (!match) {
    return {
      homeScore: null,
      awayScore: null,
    };
  }

  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2]),
  };
}

function findTeamIdByName(teams: StoredTeamRef[], teamName: string) {
  const normalized = normalizeName(teamName);

  const direct = teams.find((team) => {
    return [team.name, team.displayName ?? "", team.shortName]
      .filter(Boolean)
      .some((value) => normalizeName(value) === normalized);
  });

  if (direct) {
    return direct.id;
  }

  const fuzzy = teams.find((team) => {
    return [team.name, team.displayName ?? ""]
      .filter(Boolean)
      .some((value) => {
        const candidate = normalizeName(value);
        return candidate.includes(normalized) || normalized.includes(candidate);
      });
  });

  return fuzzy?.id ?? null;
}

async function upsertTrackedLeague(league: League, syncedAt: Date, counts: SyncCounts): Promise<StoredLeagueRef> {
  const stored = await prisma.league.upsert({
    where: { slug: league.slug },
    update: {
      source: STORAGE_SOURCE,
      sourceKey: buildLeagueSourceKey(league),
      sourcePayload: stringifyPayload(league),
      sport: league.sport,
      name: league.name,
      displayName: league.name,
      region: league.region,
      season: league.season,
      featured: league.featured,
      lastSyncedAt: syncedAt,
    },
    create: {
      source: STORAGE_SOURCE,
      sourceKey: buildLeagueSourceKey(league),
      sourcePayload: stringifyPayload(league),
      sport: league.sport,
      slug: league.slug,
      name: league.name,
      displayName: league.name,
      region: league.region,
      season: league.season,
      featured: league.featured,
      lastSyncedAt: syncedAt,
    },
    select: {
      id: true,
      slug: true,
      sport: true,
    },
  });

  counts.leagues += 1;

  return {
    id: stored.id,
    slug: stored.slug,
    sport: mapSport(stored.sport),
  };
}

async function syncLeagueSnapshot(
  league: StoredLeagueRef,
  teams: Team[],
  standings: StandingRow[],
  schedule: ScheduleRow[],
  h2h: HeadToHeadRow[],
  syncedAt: Date,
  counts: SyncCounts,
) {
  const teamIdBySource = new Map<string, string>();

  for (const team of teams) {
    const sourceKey = buildTeamSourceKey(league.sport, league.slug, team.id);
    const stored = await prisma.team.upsert({
      where: {
        source_sourceKey: {
          source: STORAGE_SOURCE,
          sourceKey,
        },
      },
      update: {
        sourcePayload: stringifyPayload(team),
        sport: league.sport,
        slug: buildTeamSlug(team),
        name: team.name,
        displayName: team.name,
        shortName: team.shortName,
        ranking: team.ranking,
        form: team.form,
        homeRecord: team.homeRecord,
        awayRecord: team.awayRecord,
        lastSyncedAt: syncedAt,
        leagueId: league.id,
      },
      create: {
        source: STORAGE_SOURCE,
        sourceKey,
        sourcePayload: stringifyPayload(team),
        sport: league.sport,
        slug: buildTeamSlug(team),
        name: team.name,
        displayName: team.name,
        shortName: team.shortName,
        ranking: team.ranking,
        form: team.form,
        homeRecord: team.homeRecord,
        awayRecord: team.awayRecord,
        lastSyncedAt: syncedAt,
        leagueId: league.id,
      },
      select: { id: true },
    });

    teamIdBySource.set(team.id, stored.id);
    counts.teams += 1;
  }

  await prisma.$transaction(async (tx) => {
    await tx.standingSnapshot.deleteMany({ where: { leagueId: league.id } });
    await tx.scheduleSnapshot.deleteMany({ where: { leagueId: league.id } });
    await tx.headToHeadSnapshot.deleteMany({ where: { leagueId: league.id } });

    if (standings.length > 0) {
      await tx.standingSnapshot.createMany({
        data: standings.map((row) => ({
          source: STORAGE_SOURCE,
          sourcePayload: stringifyPayload(row),
          scope: "overall",
          rank: row.rank,
          teamName: row.team,
          played: row.played,
          win: row.win,
          draw: row.draw,
          loss: row.loss,
          points: row.points,
          form: row.form ?? null,
          homeRecord: row.homeRecord ?? null,
          awayRecord: row.awayRecord ?? null,
          capturedAt: syncedAt,
          leagueId: league.id,
          teamId: row.teamId ? teamIdBySource.get(row.teamId) ?? null : null,
        })),
      });
      counts.standings += standings.length;
    }

    if (schedule.length > 0) {
      await tx.scheduleSnapshot.createMany({
        data: schedule.map((row) => ({
          source: STORAGE_SOURCE,
          sourcePayload: stringifyPayload(row),
          labelDate: row.date,
          fixture: row.fixture,
          result: row.result,
          note: row.note,
          capturedAt: syncedAt,
          leagueId: league.id,
          matchId: null,
        })),
      });
      counts.schedules += schedule.length;
    }

    if (h2h.length > 0) {
      await tx.headToHeadSnapshot.createMany({
        data: h2h.map((row, index) => ({
          source: STORAGE_SOURCE,
          sourcePayload: stringifyPayload(row),
          season: row.season,
          fixture: row.fixture,
          tag: row.tag,
          sortOrder: index,
          capturedAt: syncedAt,
          leagueId: league.id,
        })),
      });
      counts.headToHeads += h2h.length;
    }
  });
}

async function loadStoredTeamsByLeague(leagueIds: string[]) {
  const teams = await prisma.team.findMany({
    where: {
      leagueId: {
        in: leagueIds,
      },
    },
    select: {
      id: true,
      sourceKey: true,
      name: true,
      displayName: true,
      shortName: true,
      leagueId: true,
    },
  });

  const map = new Map<string, StoredTeamRef[]>();

  for (const team of teams) {
    const list = map.get(team.leagueId) ?? [];
    list.push(team);
    map.set(team.leagueId, list);
  }

  return map;
}

async function syncSportMatches(
  sport: Sport,
  leaguesBySlug: Map<string, StoredLeagueRef>,
  teamsByLeagueId: Map<string, StoredTeamRef[]>,
  syncedAt: Date,
  counts: SyncCounts,
) {
  const matches = await runWithApiRetry(() =>
    getApiSportsMatchesBySport(sport, {
      includeLiveOverlay: sport !== "football" ? true : false,
    }),
  );

  for (const match of matches) {
    const league = leaguesBySlug.get(match.leagueSlug);

    if (!league) {
      continue;
    }

    const teams = teamsByLeagueId.get(league.id) ?? [];
    const score = parseScore(match.score);

    const storedMatch = await prisma.match.upsert({
      where: {
        source_sourceKey: {
          source: STORAGE_SOURCE,
          sourceKey: buildMatchSourceKey(sport, match.id),
        },
      },
      update: {
        sourcePayload: stringifyPayload(match),
        sport,
        slug: slugify(`${match.homeTeam}-${match.awayTeam}-${match.kickoff}`),
        status: match.status,
        kickoff: new Date(match.kickoff),
        clock: match.clock ?? null,
        venue: match.venue,
        leagueId: league.id,
        homeTeamId: findTeamIdByName(teams, match.homeTeam),
        awayTeamId: findTeamIdByName(teams, match.awayTeam),
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        scoreText: match.score,
        statLine: match.statLine,
        insight: match.insight,
        lastSyncedAt: syncedAt,
      },
      create: {
        source: STORAGE_SOURCE,
        sourceKey: buildMatchSourceKey(sport, match.id),
        sourcePayload: stringifyPayload(match),
        sport,
        slug: slugify(`${match.homeTeam}-${match.awayTeam}-${match.kickoff}`),
        status: match.status,
        kickoff: new Date(match.kickoff),
        clock: match.clock ?? null,
        venue: match.venue,
        leagueId: league.id,
        homeTeamId: findTeamIdByName(teams, match.homeTeam),
        awayTeamId: findTeamIdByName(teams, match.awayTeam),
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        scoreText: match.score,
        statLine: match.statLine,
        insight: match.insight,
        lastSyncedAt: syncedAt,
      },
      select: { id: true },
    });

    counts.matches += 1;

    await prisma.oddsSnapshot.create({
      data: {
        source: STORAGE_SOURCE,
        sourceKey: `${buildMatchSourceKey(sport, match.id)}:${syncedAt.toISOString()}`,
        sourcePayload: stringifyPayload(match.odds),
        market: "main",
        home: match.odds.home,
        draw: match.odds.draw ?? null,
        away: match.odds.away,
        spread: match.odds.spread,
        total: match.odds.total,
        movement: match.odds.movement,
        capturedAt: syncedAt,
        matchId: storedMatch.id,
      },
    });

    counts.oddsSnapshots += 1;
  }

  return matches.length;
}

export async function runTrackedSportsSync(input?: {
  triggerSource?: string;
  requestedByUserId?: string | null;
}): Promise<SportsSyncSummary> {
  const startedAt = new Date();
  const runId = `sync-${startedAt.getTime()}`;
  const counts = createEmptyCounts();
  const failures: string[] = [];
  const existingRun = await syncRunStore.syncRun.findFirst({
    where: {
      source: SYNC_PROVIDER_SOURCE,
      scope: SYNC_SCOPE,
      status: "running",
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
    },
  });

  if (existingRun) {
    const ageMs = startedAt.getTime() - existingRun.startedAt.getTime();

    if (ageMs < RUNNING_SYNC_STALE_MS) {
      throw new Error("SYNC_ALREADY_RUNNING");
    }

    await syncRunStore.syncRun.update({
      where: { id: existingRun.id },
      data: {
        status: "failed",
        finishedAt: startedAt,
        errorText: "Marked as failed because a newer sync run started after the previous run stalled.",
      },
    });
  }

  const recentRun = await syncRunStore.syncRun.findFirst({
    where: {
      source: SYNC_PROVIDER_SOURCE,
      scope: SYNC_SCOPE,
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  if (
    recentRun &&
    recentRun.status !== "running" &&
    startedAt.getTime() - (recentRun.finishedAt?.getTime() ?? recentRun.startedAt.getTime()) < MIN_SYNC_INTERVAL_MS
  ) {
    throw new Error("SYNC_COOLDOWN_ACTIVE");
  }

  await acquireSyncLock(runId, input?.triggerSource, input?.requestedByUserId);

  const syncRun = await syncRunStore.syncRun.create({
    data: {
      id: runId,
      source: SYNC_PROVIDER_SOURCE,
      scope: SYNC_SCOPE,
      status: "running",
      triggerSource: input?.triggerSource ?? "manual-admin",
      requestedByUserId: input?.requestedByUserId ?? null,
      startedAt,
    },
  });

  try {
    const sports: Array<Extract<Sport, "football" | "basketball">> = ["football", "basketball"];
    const sportBreakdown: SportSyncBreakdown[] = [];
    const leaguesBySlug = new Map<string, StoredLeagueRef>();

    for (const sport of sports) {
      const trackedLeagues = await getApiSportsTrackedLeagues(sport);
      const selectedLeagues = pickRotatingLeagues(
        trackedLeagues,
        buildRotationSeed(sport, startedAt),
        SNAPSHOT_ROTATION_LIMITS[sport],
      );

      for (const league of trackedLeagues) {
        const storedLeague = await upsertTrackedLeague(league, startedAt, counts);
        leaguesBySlug.set(league.slug, storedLeague);
      }

      for (const league of selectedLeagues) {
        const storedLeague = leaguesBySlug.get(league.slug);

        if (!storedLeague) {
          failures.push(`${sport}:${league.slug}: stored league missing`);
          continue;
        }

        try {
          const snapshot = await runWithApiRetry(() => getApiSportsDatabaseSnapshot(sport, league.slug));

          if (!snapshot) {
            failures.push(`${sport}:${league.slug}: snapshot unavailable`);
            continue;
          }

          await syncLeagueSnapshot(
            storedLeague,
            snapshot.teams,
            snapshot.standings,
            snapshot.schedule,
            snapshot.h2h,
            startedAt,
            counts,
          );
        } catch (error) {
          failures.push(`${sport}:${league.slug}: ${error instanceof Error ? error.message : "snapshot sync failed"}`);
        }
      }

      sportBreakdown.push({
        sport,
        leagues: selectedLeagues.length,
        matches: 0,
        coveredLeagues: selectedLeagues.map((league) => league.name),
      });
    }

    const teamsByLeagueId = await loadStoredTeamsByLeague(Array.from(leaguesBySlug.values()).map((league) => league.id));

    for (const sport of sports) {
      try {
        const matchCount = await syncSportMatches(sport, leaguesBySlug, teamsByLeagueId, startedAt, counts);
        const existingBreakdown = sportBreakdown.find((item) => item.sport === sport);

        if (existingBreakdown) {
          existingBreakdown.matches = matchCount;
        }
      } catch (error) {
        failures.push(`${sport}: match sync failed - ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    const finishedAt = new Date();
    const summary: SportsSyncSummary = {
      runId: syncRun.id,
      source: SYNC_PROVIDER_SOURCE,
      scope: SYNC_SCOPE,
      mode: "database-sync",
      status: failures.length > 0 ? "completed_with_errors" : "completed",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      counts,
      sports: sportBreakdown,
      failures,
    };

    await syncRunStore.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: summary.status,
        finishedAt,
        summaryJson: JSON.stringify(summary),
      },
    });

    return summary;
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : "sync failed";

    await syncRunStore.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "failed",
        finishedAt,
        errorText: message,
      },
    });

    throw error;
  } finally {
    await releaseSyncLock(syncRun.id);
  }
}

export async function getSyncRotationPlan(at = new Date()): Promise<SyncRotationPlan> {
  const sports: Array<Extract<Sport, "football" | "basketball">> = ["football", "basketball"];
  const currentSlotStartedAt = buildSlotStart(at);
  const nextSlotStartsAt = new Date(currentSlotStartedAt.getTime() + SNAPSHOT_ROTATION_WINDOW_MS);
  const sportPlans = await Promise.all(
    sports.map(async (sport) => {
      const trackedLeagues = await getApiSportsTrackedLeagues(sport);
      const currentLeagues = pickRotatingLeagues(
        trackedLeagues,
        buildRotationSeed(sport, at),
        SNAPSHOT_ROTATION_LIMITS[sport],
      ).map((league) => league.name);
      const nextLeagues = pickRotatingLeagues(
        trackedLeagues,
        buildRotationSeed(sport, nextSlotStartsAt),
        SNAPSHOT_ROTATION_LIMITS[sport],
      ).map((league) => league.name);

      return {
        sport,
        currentLeagues,
        nextLeagues,
      };
    }),
  );

  return {
    source: SYNC_PROVIDER_SOURCE,
    windowMinutes: Math.round(SNAPSHOT_ROTATION_WINDOW_MS / 60_000),
    cooldownSeconds: Math.round(MIN_SYNC_INTERVAL_MS / 1000),
    currentSlotStartedAt: currentSlotStartedAt.toISOString(),
    nextSlotStartsAt: nextSlotStartsAt.toISOString(),
    sports: sportPlans,
  };
}

export async function getRecentSyncRuns(limit = 8): Promise<RecentSyncRun[]> {
  const runs = await syncRunStore.syncRun.findMany({
    take: limit,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      source: true,
      status: true,
      triggerSource: true,
      requestedByUserId: true,
      startedAt: true,
      finishedAt: true,
      summaryJson: true,
      errorText: true,
    },
  });

  return runs.map((run) => {
    const summary = parseStoredSummary(run.summaryJson);

    return {
      id: run.id,
      source: run.source,
      status: run.status,
      triggerSource: run.triggerSource || undefined,
      requestedByUserId: run.requestedByUserId ?? undefined,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      durationMs: summary?.durationMs ?? (run.finishedAt ? run.finishedAt.getTime() - run.startedAt.getTime() : undefined),
      countsSummary: summary ? buildCountsSummary(summary.counts) : undefined,
      sports: summary?.sports,
      failures: summary?.failures ?? [],
      errorText: run.errorText ?? undefined,
    };
  });
}
