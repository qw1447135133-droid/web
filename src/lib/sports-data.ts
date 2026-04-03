import {
  cricketH2HRowsByLeague,
  cricketScheduleRowsByLeague,
  getFeaturedMatches as getMockFeaturedMatches,
  getMatchById as getMockMatchById,
  h2hRows as mockH2hRows,
  leagues as mockLeagues,
  matches as mockMatches,
  scheduleRows as mockScheduleRows,
  standings as mockStandings,
  teams as mockTeams,
} from "@/lib/mock-data";
import { getPredictionByMatchId as getContentPredictionByMatchId } from "@/lib/content-data";
import {
  localizeHeadToHeadRow,
  localizeLeague,
  localizeMatch,
  localizeScheduleRow,
  localizeStandingRow,
  localizeTeam,
} from "@/lib/localized-content";
import {
  getNowscoreDatabaseSnapshot,
  getNowscoreMatchById,
  getNowscoreMatchesBySport,
  getNowscoreTrackedLeagues,
} from "@/lib/nowscore-provider";
import {
  getStoredDatabaseSnapshot,
  getStoredFeaturedMatches,
  getStoredLeaguesBySport,
  getStoredMatchById,
  getStoredMatchesBySport,
} from "@/lib/repositories/sports-repository";
import { defaultLocale, type Locale } from "@/lib/i18n-config";
import type {
  HeadToHeadRow,
  League,
  Match,
  PredictionRecord,
  ScheduleRow,
  Sport,
  StandingRow,
  Team,
} from "@/lib/types";

type DatabaseSnapshot = {
  leagues: League[];
  standings: StandingRow[];
  schedule: ScheduleRow[];
  teams: Team[];
  h2h: HeadToHeadRow[];
};

function parseRecord(record: string) {
  const [winsRaw, lossesRaw] = record.split("-").map((part) => Number.parseInt(part, 10));
  const wins = Number.isFinite(winsRaw) ? winsRaw : 0;
  const losses = Number.isFinite(lossesRaw) ? lossesRaw : 0;

  return {
    wins,
    losses,
    played: wins + losses,
  };
}

function buildCricketStandings(teams: Team[], locale: Locale) {
  return teams
    .map((team) => {
      const home = parseRecord(team.homeRecord);
      const away = parseRecord(team.awayRecord);
      const win = home.wins + away.wins;
      const loss = home.losses + away.losses;
      const played = home.played + away.played;

      return localizeStandingRow(
        {
          rank: team.ranking,
          teamId: team.id,
          team: team.name,
          played,
          win,
          draw: 0,
          loss,
          points: win * 2,
          form: team.form,
          homeRecord: team.homeRecord,
          awayRecord: team.awayRecord,
        },
        locale,
      );
    })
    .sort((left, right) => left.rank - right.rank);
}

function withLeagueName(match: Match, locale: Locale): Match {
  const localized = localizeMatch(match, locale);

  return {
    ...localized,
    leagueName:
      localized.leagueName ??
      localizeLeague(
        mockLeagues.find((league) => league.slug === match.leagueSlug) ?? {
          id: match.leagueSlug,
          slug: match.leagueSlug,
          sport: match.sport,
          name: match.leagueSlug,
          region: "",
          season: "",
          featured: false,
        },
        locale,
      ).name,
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

function fallbackLeagues(sport: Sport, locale: Locale) {
  return mockLeagues.filter((league) => league.sport === sport).map((league) => localizeLeague(league, locale));
}

function fallbackMatches(sport: Sport, locale: Locale) {
  return sortMatches(mockMatches.filter((match) => match.sport === sport).map((match) => withLeagueName(match, locale)));
}

function buildFallbackDatabaseSnapshot(sport: Sport, leagueSlug: string, locale: Locale): DatabaseSnapshot {
  if (sport === "cricket") {
    const teams = mockTeams
      .filter((team) => team.sport === sport && team.leagueSlug === leagueSlug)
      .map((team) => localizeTeam(team, locale));

    return {
      leagues: fallbackLeagues(sport, locale),
      standings: buildCricketStandings(teams, locale),
      schedule: (cricketScheduleRowsByLeague[leagueSlug] ?? []).map((row) => localizeScheduleRow(row, locale)),
      teams,
      h2h: (cricketH2HRowsByLeague[leagueSlug] ?? []).map((row) => localizeHeadToHeadRow(row, locale)),
    };
  }

  return {
    leagues: fallbackLeagues(sport, locale),
    standings: mockStandings.map((row) => localizeStandingRow({
      ...row,
      teamId: row.team,
      form: undefined,
      homeRecord: undefined,
      awayRecord: undefined,
    }, locale)),
    schedule: mockScheduleRows.map((row) => localizeScheduleRow(row, locale)),
    teams: mockTeams.filter((team) => team.sport === sport && team.leagueSlug === leagueSlug).map((team) => localizeTeam(team, locale)),
    h2h: mockH2hRows.map((row) => localizeHeadToHeadRow(row, locale)),
  };
}

export async function getSportsDataMode() {
  return "nowscore-scrape-with-cricket-fallback";
}

export async function getTrackedLeagues(sport: Sport, locale: Locale = defaultLocale): Promise<League[]> {
  if (sport === "cricket") {
    return fallbackLeagues(sport, locale);
  }

  const storedLeagues = await getStoredLeaguesBySport(sport);

  if (storedLeagues.length > 0) {
    return storedLeagues.map((league) => localizeLeague(league, locale));
  }

  try {
    const leagues = await getNowscoreTrackedLeagues(sport);
    return leagues.length > 0 ? leagues.map((league) => localizeLeague(league, locale)) : fallbackLeagues(sport, locale);
  } catch {
    return fallbackLeagues(sport, locale);
  }
}

export async function getMatchesBySport(sport: Sport, locale: Locale = defaultLocale): Promise<Match[]> {
  if (sport === "cricket") {
    return fallbackMatches(sport, locale);
  }

  const storedMatches = await getStoredMatchesBySport(sport);

  if (storedMatches.length > 0) {
    return sortMatches(storedMatches.map((match) => withLeagueName(match, locale)));
  }

  try {
    const matches = await getNowscoreMatchesBySport(sport);
    return matches.length > 0 ? sortMatches(matches.map((match) => withLeagueName(match, locale))) : fallbackMatches(sport, locale);
  } catch {
    return fallbackMatches(sport, locale);
  }
}

export async function getFeaturedMatches(locale: Locale = defaultLocale) {
  const storedMatches = await getStoredFeaturedMatches(4);

  if (storedMatches.length > 0) {
    return sortMatches(storedMatches.map((match) => withLeagueName(match, locale))).slice(0, 4);
  }

  try {
    const [football, basketball, cricket] = await Promise.all([
      getMatchesBySport("football", locale),
      getMatchesBySport("basketball", locale),
      getMatchesBySport("cricket", locale),
    ]);
    const liveMatches = sortMatches([...football, ...basketball, ...cricket]);

    return liveMatches.slice(0, 4);
  } catch {
    return getMockFeaturedMatches().map((match) => withLeagueName(match, locale));
  }
}

export async function getMatchById(id: string, locale: Locale = defaultLocale) {
  const storedMatch = await getStoredMatchById(id);

  if (storedMatch) {
    return withLeagueName(storedMatch, locale);
  }

  const fallback = getMockMatchById(id);

  if (fallback?.sport === "cricket") {
    return withLeagueName(fallback, locale);
  }

  try {
    const liveMatch = await getNowscoreMatchById(id);

    if (liveMatch) {
      return withLeagueName(liveMatch, locale);
    }
  } catch {
    // Fall through to mock data for non-tracked or temporarily unavailable matches.
  }

  return fallback ? withLeagueName(fallback, locale) : undefined;
}

export async function getPredictionByMatchId(matchId: string, locale: Locale = defaultLocale): Promise<PredictionRecord | undefined> {
  return getContentPredictionByMatchId(matchId, locale);
}

export async function getDatabaseSnapshot(sport: Sport, leagueSlug: string, locale: Locale = defaultLocale): Promise<DatabaseSnapshot> {
  if (sport === "cricket") {
    return buildFallbackDatabaseSnapshot(sport, leagueSlug, locale);
  }

  const storedSnapshot = await getStoredDatabaseSnapshot(sport, leagueSlug);

  if (storedSnapshot) {
    return {
      leagues: storedSnapshot.leagues.map((league) => localizeLeague(league, locale)),
      standings: storedSnapshot.standings.map((row) => localizeStandingRow(row, locale)),
      schedule: storedSnapshot.schedule.map((row) => localizeScheduleRow(row, locale)),
      teams: storedSnapshot.teams.map((team) => localizeTeam(team, locale)),
      h2h: storedSnapshot.h2h.map((row) => localizeHeadToHeadRow(row, locale)),
    };
  }

  try {
    const snapshot = await getNowscoreDatabaseSnapshot(sport, leagueSlug);

    if (snapshot) {
      return {
        leagues: snapshot.leagues.map((league) => localizeLeague(league, locale)),
        standings: snapshot.standings.map((row) => localizeStandingRow(row, locale)),
        schedule: snapshot.schedule.map((row) => localizeScheduleRow(row, locale)),
        teams: snapshot.teams.map((team) => localizeTeam(team, locale)),
        h2h: snapshot.h2h.map((row) => localizeHeadToHeadRow(row, locale)),
      };
    }
  } catch {
    // Fall back to mock database modules below.
  }

  return buildFallbackDatabaseSnapshot(sport, leagueSlug, locale);
}
