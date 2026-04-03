import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type {
  HeadToHeadRow,
  League,
  Match,
  OddsSnapshot,
  ScheduleRow,
  Sport,
  StandingRow,
  Team,
} from "@/lib/types";

type StoredDatabaseSnapshot = {
  leagues: League[];
  standings: StandingRow[];
  schedule: ScheduleRow[];
  teams: Team[];
  h2h: HeadToHeadRow[];
};

function mapMovement(value: string | null | undefined): OddsSnapshot["movement"] {
  if (value === "up" || value === "down") {
    return value;
  }

  return "flat";
}

function mapSport(value: string): Sport {
  if (value === "basketball" || value === "cricket") {
    return value;
  }

  return "football";
}

function mapLeague(record: {
  id: string;
  slug: string;
  sport: string;
  name: string;
  displayName: string | null;
  region: string;
  season: string;
  featured: boolean;
}): League {
  return {
    id: record.id,
    slug: record.slug,
    sport: mapSport(record.sport),
    name: record.displayName ?? record.name,
    region: record.region,
    season: record.season,
    featured: record.featured,
  };
}

function mapTeam(record: {
  id: string;
  sport: string;
  league: { slug: string };
  name: string;
  displayName: string | null;
  shortName: string;
  ranking: number | null;
  form: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
}): Team {
  return {
    id: record.id,
    sport: mapSport(record.sport),
    leagueSlug: record.league.slug,
    name: record.displayName ?? record.name,
    shortName: record.shortName,
    ranking: record.ranking ?? 0,
    form: record.form ?? "--",
    homeRecord: record.homeRecord ?? "--",
    awayRecord: record.awayRecord ?? "--",
  };
}

function mapStanding(record: {
  rank: number;
  teamId: string | null;
  teamName: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  form: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
}): StandingRow {
  return {
    rank: record.rank,
    teamId: record.teamId ?? undefined,
    team: record.teamName,
    played: record.played,
    win: record.win,
    draw: record.draw,
    loss: record.loss,
    points: record.points,
    form: record.form ?? undefined,
    homeRecord: record.homeRecord ?? undefined,
    awayRecord: record.awayRecord ?? undefined,
  };
}

function mapSchedule(record: {
  id: string;
  labelDate: string;
  fixture: string;
  result: string;
  note: string;
}): ScheduleRow {
  return {
    id: record.id,
    date: record.labelDate,
    fixture: record.fixture,
    result: record.result,
    note: record.note,
  };
}

function mapHeadToHead(record: { season: string; fixture: string; tag: string }): HeadToHeadRow {
  return {
    season: record.season,
    fixture: record.fixture,
    tag: record.tag,
  };
}

function mapOdds(record: {
  home: number | null;
  draw: number | null;
  away: number | null;
  spread: string | null;
  total: string | null;
  movement: string | null;
} | null): OddsSnapshot {
  return {
    home: record?.home ?? null,
    draw: record?.draw ?? null,
    away: record?.away ?? null,
    spread: record?.spread ?? "--",
    total: record?.total ?? "--",
    movement: mapMovement(record?.movement),
  };
}

function mapMatch(record: {
  id: string;
  sourceKey: string | null;
  sport: string;
  status: string;
  kickoff: Date;
  clock: string | null;
  venue: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreText: string | null;
  statLine: string | null;
  insight: string | null;
  league: { slug: string; name: string; displayName: string | null };
  oddsSnapshots: {
    home: number | null;
    draw: number | null;
    away: number | null;
    spread: string | null;
    total: string | null;
    movement: string | null;
  }[];
}): Match {
  const score =
    record.scoreText ??
    (record.homeScore == null || record.awayScore == null ? "-" : `${record.homeScore} - ${record.awayScore}`);

  return {
    id: record.sourceKey ?? record.id,
    sport: mapSport(record.sport),
    leagueSlug: record.league.slug,
    leagueName: record.league.displayName ?? record.league.name,
    kickoff: record.kickoff.toISOString(),
    status:
      record.status === "live" || record.status === "finished" || record.status === "upcoming"
        ? record.status
        : "upcoming",
    clock: record.clock ?? undefined,
    venue: record.venue,
    homeTeam: record.homeTeamName,
    awayTeam: record.awayTeamName,
    score,
    statLine: record.statLine ?? "--",
    insight: record.insight ?? "--",
    odds: mapOdds(record.oddsSnapshots[0] ?? null),
  };
}

async function getLatestCapturedAt(model: "standingSnapshot" | "scheduleSnapshot" | "headToHeadSnapshot", leagueId: string) {
  if (model === "standingSnapshot") {
    const latest = await prisma.standingSnapshot.findFirst({
      where: { leagueId },
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });

    return latest?.capturedAt ?? null;
  }

  if (model === "scheduleSnapshot") {
    const latest = await prisma.scheduleSnapshot.findFirst({
      where: { leagueId },
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });

    return latest?.capturedAt ?? null;
  }

  const latest = await prisma.headToHeadSnapshot.findFirst({
    where: { leagueId },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  return latest?.capturedAt ?? null;
}

export const getStoredLeaguesBySport = cache(async (sport: Sport): Promise<League[]> => {
  try {
    const leagues = await prisma.league.findMany({
      where: { sport },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return leagues.map(mapLeague);
  } catch {
    return [];
  }
});

export const getStoredMatchesBySport = cache(async (sport: Sport): Promise<Match[]> => {
  try {
    const matches = await prisma.match.findMany({
      where: { sport },
      include: {
        league: true,
        oddsSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ kickoff: "asc" }],
      take: 64,
    });

    return matches.map(mapMatch);
  } catch {
    return [];
  }
});

export const getStoredFeaturedMatches = cache(async (limit = 4): Promise<Match[]> => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        league: true,
        oddsSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { kickoff: "asc" }],
      take: limit,
    });

    return matches.map(mapMatch);
  } catch {
    return [];
  }
});

export const getStoredMatchById = cache(async (id: string): Promise<Match | undefined> => {
  try {
    const match = await prisma.match.findFirst({
      where: {
        OR: [{ id }, { sourceKey: id }],
      },
      include: {
        league: true,
        oddsSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
    });

    return match ? mapMatch(match) : undefined;
  } catch {
    return undefined;
  }
});

export const getStoredDatabaseSnapshot = cache(async (
  sport: Sport,
  leagueSlug: string,
): Promise<StoredDatabaseSnapshot | null> => {
  try {
    const [leagues, league] = await Promise.all([
      prisma.league.findMany({
        where: { sport },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.league.findFirst({
        where: { sport, slug: leagueSlug },
      }),
    ]);

    if (!league) {
      return leagues.length > 0
        ? {
            leagues: leagues.map(mapLeague),
            standings: [],
            schedule: [],
            teams: [],
            h2h: [],
          }
        : null;
    }

    const [teams, latestStandingAt, latestScheduleAt, latestH2hAt] = await Promise.all([
      prisma.team.findMany({
        where: { leagueId: league.id },
        include: { league: { select: { slug: true } } },
        orderBy: [{ ranking: "asc" }, { name: "asc" }],
      }),
      getLatestCapturedAt("standingSnapshot", league.id),
      getLatestCapturedAt("scheduleSnapshot", league.id),
      getLatestCapturedAt("headToHeadSnapshot", league.id),
    ]);

    const [standings, schedule, h2h] = await Promise.all([
      latestStandingAt
        ? prisma.standingSnapshot.findMany({
            where: { leagueId: league.id, capturedAt: latestStandingAt },
            orderBy: { rank: "asc" },
          })
        : Promise.resolve([]),
      latestScheduleAt
        ? prisma.scheduleSnapshot.findMany({
            where: { leagueId: league.id, capturedAt: latestScheduleAt },
            orderBy: [{ sortDate: "asc" }, { fixture: "asc" }],
          })
        : Promise.resolve([]),
      latestH2hAt
        ? prisma.headToHeadSnapshot.findMany({
            where: { leagueId: league.id, capturedAt: latestH2hAt },
            orderBy: [{ sortOrder: "asc" }, { season: "desc" }],
          })
        : Promise.resolve([]),
    ]);

    return {
      leagues: leagues.map(mapLeague),
      standings: standings.map(mapStanding),
      schedule: schedule.map(mapSchedule),
      teams: teams.map(mapTeam),
      h2h: h2h.map(mapHeadToHead),
    };
  } catch {
    return null;
  }
});
