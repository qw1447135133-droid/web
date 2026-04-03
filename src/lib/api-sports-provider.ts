import { cache } from "react";
import type {
  HeadToHeadRow,
  League,
  Match,
  MatchStatus,
  OddsSnapshot,
  ScheduleRow,
  Sport,
  StandingRow,
  Team,
} from "@/lib/types";

type ApiTrackedLeague = {
  id: string;
  slug: string;
  sport: "football" | "basketball";
  apiLeagueId: number;
  name: string;
  region: string;
  featured: boolean;
  seasonMode: "split-year" | "calendar-year" | "basketball-year" | "single-year";
  databaseSeason: number | string;
  databaseSeasonLabel: string;
  databaseFixturesFrom?: string;
  databaseFixturesTo?: string;
};

type FootballFixtureItem = {
  fixture: {
    id: number;
    date: string;
    venue?: { name?: string | null; city?: string | null } | null;
    status?: { long?: string | null; short?: string | null; elapsed?: number | null } | null;
  };
  league: {
    id: number;
    name: string;
    country?: string | null;
    season?: number | null;
    round?: string | null;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals?: { home?: number | null; away?: number | null } | null;
  score?: {
    halftime?: { home?: number | null; away?: number | null } | null;
    fulltime?: { home?: number | null; away?: number | null } | null;
  } | null;
};

type FootballStandingItem = {
  rank: number;
  team: { id: number; name: string };
  points: number;
  form?: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
  };
  home: {
    win: number;
    draw: number;
    lose: number;
  };
  away: {
    win: number;
    draw: number;
    lose: number;
  };
};

type FootballStandingsResponse = {
  league: {
    id: number;
    season: number;
    standings: FootballStandingItem[][];
  };
};

type FootballTeamItem = {
  team: {
    id: number;
    name: string;
    code?: string | null;
  };
  venue?: {
    name?: string | null;
    city?: string | null;
  } | null;
};

type BasketballGameItem = {
  id: number;
  date: string;
  time?: string | null;
  week?: string | null;
  venue?: string | null;
  status?: { long?: string | null; short?: string | null; timer?: string | null } | null;
  league: {
    id: number;
    name: string;
    season?: string | number | null;
  };
  country?: {
    name?: string | null;
  } | null;
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  scores?: {
    home?: {
      quarter_1?: number | null;
      quarter_2?: number | null;
      quarter_3?: number | null;
      quarter_4?: number | null;
      over_time?: number | null;
      total?: number | null;
    } | null;
    away?: {
      quarter_1?: number | null;
      quarter_2?: number | null;
      quarter_3?: number | null;
      quarter_4?: number | null;
      over_time?: number | null;
      total?: number | null;
    } | null;
  } | null;
};

type BasketballStandingItem = {
  position: number;
  group?: {
    name?: string | null;
  } | null;
  stage?: string | null;
  team: {
    id: number;
    name: string;
  };
  league: {
    season?: string | number | null;
  };
  games: {
    played: number;
    win: {
      total: number;
      percentage?: string | null;
    };
    lose: {
      total: number;
      percentage?: string | null;
    };
  };
  points?: {
    for?: number | null;
    against?: number | null;
  } | null;
  form?: string | null;
  description?: string | null;
};

type BasketballTeamItem = {
  id: number;
  name: string;
};

export type ApiSportsDatabaseSnapshot = {
  leagues: League[];
  standings: StandingRow[];
  schedule: ScheduleRow[];
  teams: Team[];
  h2h: HeadToHeadRow[];
};

const API_SPORTS_TIMEZONE = process.env.APISPORTS_TIMEZONE?.trim() || "Asia/Shanghai";
const DATABASE_WINDOW_OFFSETS = [-1, 0, 1];

const TRACKED_LEAGUES: ApiTrackedLeague[] = [
  {
    id: "epl",
    slug: "premier-league",
    sport: "football",
    apiLeagueId: 39,
    name: "Premier League",
    region: "Europe",
    featured: true,
    seasonMode: "split-year",
    databaseSeason: 2024,
    databaseSeasonLabel: "2024-2025",
    databaseFixturesFrom: "2025-05-01",
    databaseFixturesTo: "2025-05-31",
  },
  {
    id: "laliga",
    slug: "la-liga",
    sport: "football",
    apiLeagueId: 140,
    name: "La Liga",
    region: "Europe",
    featured: true,
    seasonMode: "split-year",
    databaseSeason: 2024,
    databaseSeasonLabel: "2024-2025",
    databaseFixturesFrom: "2025-05-01",
    databaseFixturesTo: "2025-05-31",
  },
  {
    id: "j1",
    slug: "j1-league",
    sport: "football",
    apiLeagueId: 98,
    name: "J1 League",
    region: "Asia",
    featured: true,
    seasonMode: "calendar-year",
    databaseSeason: 2024,
    databaseSeasonLabel: "2024",
    databaseFixturesFrom: "2024-11-01",
    databaseFixturesTo: "2024-11-30",
  },
  {
    id: "nba",
    slug: "nba",
    sport: "basketball",
    apiLeagueId: 12,
    name: "NBA",
    region: "North America",
    featured: true,
    seasonMode: "basketball-year",
    databaseSeason: "2023-2024",
    databaseSeasonLabel: "2023-2024",
  },
  {
    id: "cba",
    slug: "cba",
    sport: "basketball",
    apiLeagueId: 31,
    name: "CBA",
    region: "Asia",
    featured: true,
    seasonMode: "basketball-year",
    databaseSeason: "2023-2024",
    databaseSeasonLabel: "2023-2024",
  },
  {
    id: "euroleague",
    slug: "euroleague",
    sport: "basketball",
    apiLeagueId: 120,
    name: "EuroLeague",
    region: "Europe",
    featured: false,
    seasonMode: "single-year",
    databaseSeason: 2023,
    databaseSeasonLabel: "2023-2024",
  },
];

const TRACKED_BY_SPORT = {
  football: TRACKED_LEAGUES.filter((league) => league.sport === "football"),
  basketball: TRACKED_LEAGUES.filter((league) => league.sport === "basketball"),
  cricket: [],
  esports: [],
} satisfies Record<Sport, ApiTrackedLeague[]>;

const FOOTBALL_LEAGUE_IDS = new Set(TRACKED_BY_SPORT.football.map((league) => league.apiLeagueId));
const BASKETBALL_LEAGUE_IDS = new Set(TRACKED_BY_SPORT.basketball.map((league) => league.apiLeagueId));
const FOOTBALL_LEAGUE_BY_ID = new Map(TRACKED_BY_SPORT.football.map((league) => [league.apiLeagueId, league]));
const BASKETBALL_LEAGUE_BY_ID = new Map(TRACKED_BY_SPORT.basketball.map((league) => [league.apiLeagueId, league]));
const TRACKED_BY_SLUG = new Map(TRACKED_LEAGUES.map((league) => [league.slug, league]));

function readApiKey() {
  return process.env.APISPORTS_KEY?.trim() || "";
}

function ensureApiKey() {
  const apiKey = readApiKey();

  if (!apiKey) {
    throw new Error("APISPORTS_KEY is not configured");
  }

  return apiKey;
}

function buildDisplaySeason(mode: ApiTrackedLeague["seasonMode"], date = new Date()) {
  if (mode === "calendar-year") {
    return String(date.getFullYear());
  }

  if (mode === "single-year") {
    const startYear = date.getMonth() + 1 >= 8 ? date.getFullYear() : date.getFullYear() - 1;
    return String(startYear);
  }

  const startYear = date.getMonth() + 1 >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function buildMatchId(sport: "football" | "basketball", apiId: number) {
  return `${sport}:${apiId}`;
}

function parseMatchId(id: string) {
  const [sport, rawId] = id.split(":");
  const apiId = Number.parseInt(rawId ?? "", 10);

  if ((sport === "football" || sport === "basketball") && Number.isFinite(apiId)) {
    return { sport, apiId } as const;
  }

  return null;
}

function mapFootballStatus(short?: string | null): MatchStatus {
  const code = (short ?? "").toUpperCase();

  if (["FT", "AET", "PEN"].includes(code)) {
    return "finished";
  }

  if (["NS", "TBD", "PST"].includes(code)) {
    return "upcoming";
  }

  return "live";
}

function mapBasketballStatus(short?: string | null): MatchStatus {
  const code = (short ?? "").toUpperCase();

  if (["NS", "TBD", "PST"].includes(code)) {
    return "upcoming";
  }

  if (["FT", "AOT", "CANC"].includes(code)) {
    return "finished";
  }

  return "live";
}

function createEmptyOdds(): OddsSnapshot {
  return {
    home: null,
    draw: null,
    away: null,
    spread: "--",
    total: "--",
    movement: "flat",
  };
}

function formatFootballInsight(item: FootballFixtureItem) {
  const parts = [item.league.country, item.league.round, item.fixture.status?.long].filter(Boolean);
  return parts.join(" | ") || item.league.name;
}

function formatBasketballStatLine(item: BasketballGameItem) {
  const score = item.scores;
  const home = score?.home;
  const away = score?.away;
  const segments = [
    home?.quarter_1 != null && away?.quarter_1 != null ? `Q1 ${home.quarter_1}-${away.quarter_1}` : null,
    home?.quarter_2 != null && away?.quarter_2 != null ? `Q2 ${home.quarter_2}-${away.quarter_2}` : null,
    home?.quarter_3 != null && away?.quarter_3 != null ? `Q3 ${home.quarter_3}-${away.quarter_3}` : null,
    home?.quarter_4 != null && away?.quarter_4 != null ? `Q4 ${home.quarter_4}-${away.quarter_4}` : null,
    home?.over_time != null && away?.over_time != null ? `OT ${home.over_time}-${away.over_time}` : null,
  ].filter(Boolean);

  return segments.join(" | ") || item.status?.long || item.league.name;
}

function formatBasketballInsight(item: BasketballGameItem) {
  const parts = [item.country?.name, item.league.name, item.week ? `Week ${item.week}` : null].filter(Boolean);
  return parts.join(" | ");
}

function mapFootballFixture(item: FootballFixtureItem): Match | null {
  const trackedLeague = FOOTBALL_LEAGUE_BY_ID.get(item.league.id);

  if (!trackedLeague) {
    return null;
  }

  const homeGoals = item.goals?.home ?? null;
  const awayGoals = item.goals?.away ?? null;
  const score = homeGoals == null || awayGoals == null ? "-" : `${homeGoals} - ${awayGoals}`;

  return {
    id: buildMatchId("football", item.fixture.id),
    sport: "football",
    leagueSlug: trackedLeague.slug,
    leagueName: trackedLeague.name,
    kickoff: item.fixture.date,
    status: mapFootballStatus(item.fixture.status?.short),
    clock:
      item.fixture.status?.elapsed != null
        ? `${item.fixture.status.elapsed}'`
        : item.fixture.status?.short || undefined,
    venue: item.fixture.venue?.name || item.fixture.venue?.city || "--",
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    score,
    statLine: item.league.round || item.league.name,
    insight: formatFootballInsight(item),
    odds: createEmptyOdds(),
  };
}

function mapBasketballGame(item: BasketballGameItem): Match | null {
  const trackedLeague = BASKETBALL_LEAGUE_BY_ID.get(item.league.id);

  if (!trackedLeague) {
    return null;
  }

  const homeScore = item.scores?.home?.total ?? null;
  const awayScore = item.scores?.away?.total ?? null;
  const score = homeScore == null || awayScore == null ? "-" : `${homeScore} - ${awayScore}`;

  return {
    id: buildMatchId("basketball", item.id),
    sport: "basketball",
    leagueSlug: trackedLeague.slug,
    leagueName: trackedLeague.name,
    kickoff: item.date,
    status: mapBasketballStatus(item.status?.short),
    clock: item.status?.timer || item.status?.short || undefined,
    venue: item.venue || "--",
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    score,
    statLine: formatBasketballStatLine(item),
    insight: formatBasketballInsight(item),
    odds: createEmptyOdds(),
  };
}

function sortMatches(matches: Match[]) {
  const order = {
    live: 0,
    upcoming: 1,
    finished: 2,
  } as const;

  return [...matches].sort((left, right) => {
    const statusDiff = order[left.status] - order[right.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
  });
}

function buildShortName(name: string, fallback: string) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || fallback;
}

function formatMonthDay(date: string) {
  const kickoff = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: API_SPORTS_TIMEZONE,
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(kickoff).replace("/", "-");
}

function buildFootballRecord(row: FootballStandingItem["home"] | FootballStandingItem["away"]) {
  return `${row.win}-${row.draw}-${row.lose}`;
}

function buildFootballStandings(rows: FootballStandingItem[]): StandingRow[] {
  return rows.map((row) => ({
    rank: row.rank,
    teamId: String(row.team.id),
    team: row.team.name,
    played: row.all.played,
    win: row.all.win,
    draw: row.all.draw,
    loss: row.all.lose,
    points: row.points,
    form: row.form ?? undefined,
    homeRecord: buildFootballRecord(row.home),
    awayRecord: buildFootballRecord(row.away),
  }));
}

function buildFootballTeams(
  rows: FootballStandingItem[],
  teamDetails: FootballTeamItem[],
  league: ApiTrackedLeague,
): Team[] {
  const teamById = new Map(teamDetails.map((item) => [item.team.id, item]));

  return rows.map((row) => {
    const teamDetailsRow = teamById.get(row.team.id);

    return {
      id: String(row.team.id),
      leagueSlug: league.slug,
      sport: "football",
      name: row.team.name,
      shortName: teamDetailsRow?.team.code || buildShortName(row.team.name, `F${row.rank}`),
      ranking: row.rank,
      form: row.form ?? "--",
      homeRecord: buildFootballRecord(row.home),
      awayRecord: buildFootballRecord(row.away),
    } satisfies Team;
  });
}

function buildFootballScheduleRows(fixtures: FootballFixtureItem[], league: ApiTrackedLeague): ScheduleRow[] {
  const now = Date.now();

  return fixtures
    .map((item) => {
      const kickoff = new Date(item.fixture.date);
      const homeGoals = item.goals?.home;
      const awayGoals = item.goals?.away;
      const result =
        homeGoals != null && awayGoals != null
          ? `${homeGoals} - ${awayGoals}`
          : mapFootballStatus(item.fixture.status?.short) === "upcoming"
            ? "vs"
            : "-";
      const noteParts = [
        item.fixture.status?.long,
        item.league.round,
        item.fixture.venue?.name || item.fixture.venue?.city || null,
      ].filter(Boolean);

      return {
        id: buildMatchId("football", item.fixture.id),
        kickoff,
        row: {
          id: buildMatchId("football", item.fixture.id),
          date: formatMonthDay(item.fixture.date),
          fixture: `${item.teams.home.name} vs ${item.teams.away.name}`,
          result,
          note: noteParts.join(" | ") || `${league.name} fixture`,
        } satisfies ScheduleRow,
      };
    })
    .sort((left, right) => Math.abs(left.kickoff.getTime() - now) - Math.abs(right.kickoff.getTime() - now))
    .slice(0, 12)
    .map((item) => item.row);
}

function buildFootballHeadToHead(
  fixtures: FootballFixtureItem[],
  standings: StandingRow[],
  league: ApiTrackedLeague,
): HeadToHeadRow[] {
  const topTwoTeamIds = standings.slice(0, 2).flatMap((row) => (row.teamId ? [row.teamId] : []));
  const finished = fixtures.filter((item) => mapFootballStatus(item.fixture.status?.short) === "finished");
  const selected = finished.filter((item) => {
    const homeId = String(item.teams.home.id);
    const awayId = String(item.teams.away.id);
    return topTwoTeamIds.length === 2 && topTwoTeamIds.includes(homeId) && topTwoTeamIds.includes(awayId);
  });
  const source = (selected.length > 0 ? selected : finished)
    .sort((left, right) => new Date(right.fixture.date).getTime() - new Date(left.fixture.date).getTime())
    .slice(0, 5);

  return source.map((item) => ({
    season: league.databaseSeasonLabel,
    fixture: `${item.teams.home.name} ${item.goals?.home ?? "-"}-${item.goals?.away ?? "-"} ${item.teams.away.name}`,
    tag: selected.length > 0 ? "H2H" : "Recent",
  }));
}

function flattenBasketballStandings(groups: BasketballStandingItem[][]) {
  return groups.flatMap((group) => group);
}

function buildBasketballStandings(rows: BasketballStandingItem[]): StandingRow[] {
  return rows.map((row) => ({
    rank: row.position,
    teamId: String(row.team.id),
    team: row.team.name,
    played: row.games.played,
    win: row.games.win.total,
    draw: 0,
    loss: row.games.lose.total,
    points: row.games.win.total * 2,
    form: row.form ?? undefined,
    homeRecord: undefined,
    awayRecord: undefined,
  }));
}

function buildBasketballTeams(
  rows: BasketballStandingItem[],
  teamDetails: BasketballTeamItem[],
  league: ApiTrackedLeague,
): Team[] {
  const teamById = new Map(teamDetails.map((item) => [item.id, item]));

  return rows.map((row) => {
    const teamDetailsRow = teamById.get(row.team.id);

    return {
      id: String(row.team.id),
      leagueSlug: league.slug,
      sport: "basketball",
      name: teamDetailsRow?.name || row.team.name,
      shortName: buildShortName(teamDetailsRow?.name || row.team.name, `B${row.position}`),
      ranking: row.position,
      form: row.form ?? "--",
      homeRecord: "--",
      awayRecord: "--",
    } satisfies Team;
  });
}

function buildBasketballScheduleRows(games: BasketballGameItem[], league: ApiTrackedLeague): ScheduleRow[] {
  const now = Date.now();

  return games
    .map((item) => {
      const kickoff = new Date(item.date);
      const homeScore = item.scores?.home?.total;
      const awayScore = item.scores?.away?.total;
      const result =
        homeScore != null && awayScore != null
          ? `${homeScore} - ${awayScore}`
          : mapBasketballStatus(item.status?.short) === "upcoming"
            ? "vs"
            : "-";
      const noteParts = [item.status?.long, item.week ? `Week ${item.week}` : null, item.venue].filter(Boolean);

      return {
        id: buildMatchId("basketball", item.id),
        kickoff,
        row: {
          id: buildMatchId("basketball", item.id),
          date: formatMonthDay(item.date),
          fixture: `${item.teams.home.name} vs ${item.teams.away.name}`,
          result,
          note: noteParts.join(" | ") || `${league.name} fixture`,
        } satisfies ScheduleRow,
      };
    })
    .sort((left, right) => Math.abs(left.kickoff.getTime() - now) - Math.abs(right.kickoff.getTime() - now))
    .slice(0, 12)
    .map((item) => item.row);
}

function buildBasketballHeadToHead(
  games: BasketballGameItem[],
  standings: StandingRow[],
  league: ApiTrackedLeague,
): HeadToHeadRow[] {
  const topTwoTeamIds = standings.slice(0, 2).flatMap((row) => (row.teamId ? [row.teamId] : []));
  const finished = games.filter((item) => mapBasketballStatus(item.status?.short) === "finished");
  const selected = finished.filter((item) => {
    const homeId = String(item.teams.home.id);
    const awayId = String(item.teams.away.id);
    return topTwoTeamIds.length === 2 && topTwoTeamIds.includes(homeId) && topTwoTeamIds.includes(awayId);
  });
  const source = (selected.length > 0 ? selected : finished)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 5);

  return source.map((item) => ({
    season: league.databaseSeasonLabel,
    fixture: `${item.teams.home.name} ${item.scores?.home?.total ?? "-"}-${item.scores?.away?.total ?? "-"} ${item.teams.away.name}`,
    tag: selected.length > 0 ? "H2H" : "Recent",
  }));
}

async function fetchApiSportsJson<T>(url: string, revalidate = 120): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "x-apisports-key": ensureApiKey(),
    },
    next: {
      revalidate,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Sports request failed: ${response.status} ${url}`);
  }

  const payload = (await response.json()) as {
    errors?: Record<string, unknown> | unknown[];
    response?: T;
  };

  const hasErrors =
    Array.isArray(payload.errors)
      ? payload.errors.length > 0
      : Boolean(payload.errors && Object.keys(payload.errors).length > 0);

  if (hasErrors) {
    throw new Error(`API-Sports response returned errors for ${url}`);
  }

  return (payload.response ?? []) as T;
}

function formatDateForTimezone(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: API_SPORTS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return formatter.format(now);
}

const loadFootballFixturesByDate = cache(async (date: string) => {
  return fetchApiSportsJson<FootballFixtureItem[]>(
    `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=${encodeURIComponent(API_SPORTS_TIMEZONE)}`,
    300,
  );
});

const loadFootballTodayFixtures = cache(async () => {
  const date = formatDateForTimezone(0);
  return loadFootballFixturesByDate(date);
});

const loadFootballLiveFixtures = cache(async () => {
  return fetchApiSportsJson<FootballFixtureItem[]>(
    "https://v3.football.api-sports.io/fixtures?live=all",
    30,
  );
});

const loadFootballFixtureById = cache(async (apiId: number) => {
  const response = await fetchApiSportsJson<FootballFixtureItem[]>(
    `https://v3.football.api-sports.io/fixtures?id=${apiId}`,
    30,
  );
  return response[0] ?? null;
});

const loadFootballStandings = cache(async (leagueId: number, season: number) => {
  const response = await fetchApiSportsJson<FootballStandingsResponse[]>(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    3600,
  );
  return response[0] ?? null;
});

const loadFootballArchiveFixtures = cache(async (leagueId: number, season: number, from: string, to: string) => {
  return fetchApiSportsJson<FootballFixtureItem[]>(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}&timezone=${encodeURIComponent(API_SPORTS_TIMEZONE)}`,
    3600,
  );
});

const loadFootballTeams = cache(async (leagueId: number, season: number) => {
  return fetchApiSportsJson<FootballTeamItem[]>(
    `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`,
    3600,
  );
});

const loadBasketballGamesByDate = cache(async (date: string) => {
  return fetchApiSportsJson<BasketballGameItem[]>(
    `https://v1.basketball.api-sports.io/games?date=${date}&timezone=${encodeURIComponent(API_SPORTS_TIMEZONE)}`,
    300,
  );
});

const loadBasketballTodayGames = cache(async () => {
  const date = formatDateForTimezone(0);
  return loadBasketballGamesByDate(date);
});

const loadBasketballGameById = cache(async (apiId: number) => {
  const response = await fetchApiSportsJson<BasketballGameItem[]>(
    `https://v1.basketball.api-sports.io/games?id=${apiId}`,
    30,
  );
  return response[0] ?? null;
});

const loadBasketballStandings = cache(async (leagueId: number, season: string | number) => {
  const response = await fetchApiSportsJson<BasketballStandingItem[][]>(
    `https://v1.basketball.api-sports.io/standings?league=${leagueId}&season=${season}`,
    3600,
  );
  return flattenBasketballStandings(response);
});

const loadBasketballTeams = cache(async (leagueId: number, season: string | number) => {
  return fetchApiSportsJson<BasketballTeamItem[]>(
    `https://v1.basketball.api-sports.io/teams?league=${leagueId}&season=${season}`,
    3600,
  );
});

async function loadFootballLeagueWindow(league: ApiTrackedLeague) {
  if (league.databaseFixturesFrom && league.databaseFixturesTo) {
    try {
      const archivedFixtures = await loadFootballArchiveFixtures(
        league.apiLeagueId,
        Number(league.databaseSeason),
        league.databaseFixturesFrom,
        league.databaseFixturesTo,
      );

      if (archivedFixtures.length > 0) {
        return archivedFixtures;
      }
    } catch {
      // Fall through to the nearby-day window when the archive endpoint is unavailable.
    }
  }

  const byId = new Map<number, FootballFixtureItem>();
  const dates = DATABASE_WINDOW_OFFSETS.map((offset) => formatDateForTimezone(offset));
  const results = await Promise.allSettled(dates.map((date) => loadFootballFixturesByDate(date)));
  const batches = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  for (const batch of batches) {
    for (const item of batch) {
      if (item.league.id === league.apiLeagueId) {
        byId.set(item.fixture.id, item);
      }
    }
  }

  const fixtures = Array.from(byId.values());

  if (fixtures.length > 0) {
    return fixtures;
  }

  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") {
    throw failure.reason instanceof Error ? failure.reason : new Error("Football schedule window unavailable");
  }

  return fixtures;
}

async function loadBasketballLeagueWindow(league: ApiTrackedLeague) {
  const byId = new Map<number, BasketballGameItem>();
  const dates = DATABASE_WINDOW_OFFSETS.map((offset) => formatDateForTimezone(offset));
  const results = await Promise.allSettled(dates.map((date) => loadBasketballGamesByDate(date)));
  const batches = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  for (const batch of batches) {
    for (const item of batch) {
      if (item.league.id === league.apiLeagueId) {
        byId.set(item.id, item);
      }
    }
  }

  const games = Array.from(byId.values());

  if (games.length > 0) {
    return games;
  }

  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") {
    throw failure.reason instanceof Error ? failure.reason : new Error("Basketball schedule window unavailable");
  }

  return games;
}

export async function getApiSportsTrackedLeagues(sport: Sport): Promise<League[]> {
  return TRACKED_BY_SPORT[sport].map((league) => ({
    id: league.id,
    slug: league.slug,
    sport: league.sport,
    name: league.name,
    region: league.region,
    season: buildDisplaySeason(league.seasonMode),
    featured: league.featured,
  }));
}

export async function getApiSportsMatchesBySport(
  sport: Sport,
  options?: {
    includeLiveOverlay?: boolean;
  },
): Promise<Match[]> {
  if (sport === "football") {
    const results = await Promise.allSettled([
      loadFootballTodayFixtures(),
      options?.includeLiveOverlay === false ? Promise.resolve<FootballFixtureItem[]>([]) : loadFootballLiveFixtures(),
    ]);
    const todayFixtures = results[0].status === "fulfilled" ? results[0].value : [];
    const liveFixtures = results[1].status === "fulfilled" ? results[1].value : [];
    const failures = results.filter((result) => result.status === "rejected");

    if (todayFixtures.length === 0 && liveFixtures.length === 0 && failures.length > 0) {
      throw failures[0].reason instanceof Error ? failures[0].reason : new Error("Football fixtures unavailable");
    }

    const merged = new Map<number, FootballFixtureItem>();

    for (const item of [...todayFixtures, ...liveFixtures]) {
      if (FOOTBALL_LEAGUE_IDS.has(item.league.id)) {
        merged.set(item.fixture.id, item);
      }
    }

    return sortMatches(
      Array.from(merged.values())
        .map((item) => mapFootballFixture(item))
        .filter((item): item is Match => item !== null),
    );
  }

  if (sport === "basketball") {
    const games = await loadBasketballTodayGames();

    return sortMatches(
      games
        .filter((item) => BASKETBALL_LEAGUE_IDS.has(item.league.id))
        .map((item) => mapBasketballGame(item))
        .filter((item): item is Match => item !== null),
    );
  }

  return [];
}

export async function getApiSportsMatchById(id: string): Promise<Match | undefined> {
  const parsed = parseMatchId(id);

  if (!parsed) {
    return undefined;
  }

  if (parsed.sport === "football") {
    const fixture = await loadFootballFixtureById(parsed.apiId);
    return fixture ? mapFootballFixture(fixture) ?? undefined : undefined;
  }

  const game = await loadBasketballGameById(parsed.apiId);
  return game ? mapBasketballGame(game) ?? undefined : undefined;
}

export async function getApiSportsDatabaseSnapshot(
  sport: Sport,
  leagueSlug: string,
): Promise<ApiSportsDatabaseSnapshot | null> {
  const league = TRACKED_BY_SLUG.get(leagueSlug);

  if (!league || league.sport !== sport) {
    return null;
  }

  if (sport === "football") {
    const [standingsResponse, teamDetails, fixtures] = await Promise.all([
      loadFootballStandings(league.apiLeagueId, Number(league.databaseSeason)),
      loadFootballTeams(league.apiLeagueId, Number(league.databaseSeason)),
      loadFootballLeagueWindow(league),
    ]);

    const standingsRows = standingsResponse?.league.standings?.[0] ?? [];
    const standings = buildFootballStandings(standingsRows);
    const teams = buildFootballTeams(standingsRows, teamDetails, league);

    return {
      leagues: TRACKED_BY_SPORT.football.map((item) => ({
        id: item.id,
        slug: item.slug,
        sport: item.sport,
        name: item.name,
        region: item.region,
        season: item.databaseSeasonLabel,
        featured: item.featured,
      })),
      standings,
      schedule: buildFootballScheduleRows(fixtures, league),
      teams,
      h2h: buildFootballHeadToHead(fixtures, standings, league),
    };
  }

  if (sport === "basketball") {
    const [standingsRows, teamDetails, games] = await Promise.all([
      loadBasketballStandings(league.apiLeagueId, league.databaseSeason),
      loadBasketballTeams(league.apiLeagueId, league.databaseSeason),
      loadBasketballLeagueWindow(league),
    ]);
    const standings = buildBasketballStandings(standingsRows);
    const teams = buildBasketballTeams(standingsRows, teamDetails, league);

    return {
      leagues: TRACKED_BY_SPORT.basketball.map((item) => ({
        id: item.id,
        slug: item.slug,
        sport: item.sport,
        name: item.name,
        region: item.region,
        season: item.databaseSeasonLabel,
        featured: item.featured,
      })),
      standings,
      schedule: buildBasketballScheduleRows(games, league),
      teams,
      h2h: buildBasketballHeadToHead(games, standings, league),
    };
  }

  return null;
}
