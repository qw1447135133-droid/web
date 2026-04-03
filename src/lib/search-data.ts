import { getArticlePlans, getAuthorTeams } from "@/lib/content-data";
import { defaultLocale, type Locale } from "@/lib/i18n-config";
import { getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import type { MatchStatus, Sport } from "@/lib/types";

const RESULT_LIMIT = 8;
const SPORTS: Sport[] = ["football", "basketball", "cricket", "esports"];

export type SearchMatchResult = {
  id: string;
  title: string;
  href: string;
  sport: Sport;
  league: string;
  kickoff: string;
  status: MatchStatus;
  summary: string;
};

export type SearchLeagueResult = {
  id: string;
  title: string;
  href: string;
  sport: Sport;
  region: string;
  season: string;
  summary: string;
};

export type SearchPlanResult = {
  id: string;
  title: string;
  href: string;
  sport: Sport;
  league: string;
  kickoff: string;
  price: number;
  summary: string;
};

export type SearchAuthorResult = {
  id: string;
  title: string;
  href: string;
  sport?: Sport;
  badge: string;
  focus: string;
  summary: string;
};

export type SearchResults = {
  query: string;
  matches: SearchMatchResult[];
  leagues: SearchLeagueResult[];
  plans: SearchPlanResult[];
  authors: SearchAuthorResult[];
  total: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/|.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(query: string) {
  return normalizeText(query)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreText(query: string, tokens: string[], haystackParts: Array<string | undefined>) {
  const haystack = normalizeText(haystackParts.filter(Boolean).join(" "));

  if (!haystack || tokens.length === 0) {
    return -1;
  }

  if (!tokens.every((token) => haystack.includes(token))) {
    return -1;
  }

  let score = 0;
  const normalizedQuery = normalizeText(query);

  if (haystack.includes(normalizedQuery)) {
    score += 100;
  }

  for (const token of tokens) {
    if (haystack.startsWith(token)) {
      score += 16;
      continue;
    }

    if (haystack.includes(` ${token}`)) {
      score += 10;
      continue;
    }

    score += 6;
  }

  return score;
}

function statusPriority(status: MatchStatus) {
  if (status === "live") {
    return 24;
  }

  if (status === "upcoming") {
    return 12;
  }

  return 4;
}

export async function searchSite(query: string, locale: Locale = defaultLocale): Promise<SearchResults> {
  const trimmedQuery = query.trim();
  const tokens = tokenize(trimmedQuery);

  if (!trimmedQuery || tokens.length === 0) {
    return {
      query: trimmedQuery,
      matches: [],
      leagues: [],
      plans: [],
      authors: [],
      total: 0,
    };
  }

  const [matchesBySport, leaguesBySport, plans, authors] = await Promise.all([
    Promise.all(SPORTS.map((sport) => getMatchesBySport(sport, locale))),
    Promise.all(SPORTS.map((sport) => getTrackedLeagues(sport, locale))),
    getArticlePlans(undefined, locale),
    getAuthorTeams(locale),
  ]);

  const allMatches = matchesBySport.flat();
  const allLeagues = leaguesBySport.flat();
  const plansByAuthorId = new Map<string, Array<(typeof plans)[number]>>();

  for (const plan of plans) {
    const items = plansByAuthorId.get(plan.authorId) ?? [];
    items.push(plan);
    plansByAuthorId.set(plan.authorId, items);
  }

  const matches = allMatches
    .map((match) => {
      const baseScore = scoreText(trimmedQuery, tokens, [
        match.homeTeam,
        match.awayTeam,
        match.leagueName,
        match.leagueSlug,
        match.venue,
        match.statLine,
        match.insight,
        match.score,
      ]);
      const score = baseScore < 0 ? -1 : baseScore + statusPriority(match.status);

      return {
        score,
        item: {
          id: match.id,
          title: `${match.homeTeam} vs ${match.awayTeam}`,
          href: `/matches/${match.id}`,
          sport: match.sport,
          league: match.leagueName ?? match.leagueSlug,
          kickoff: match.kickoff,
          status: match.status,
          summary: match.insight,
        } satisfies SearchMatchResult,
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.item);

  const leagues = allLeagues
    .map((league) => {
      const baseScore = scoreText(trimmedQuery, tokens, [league.name, league.slug, league.region, league.season]);
      const score = baseScore < 0 ? -1 : baseScore + (league.featured ? 6 : 0);

      return {
        score,
        item: {
          id: league.id,
          title: league.name,
          href: `/database?sport=${league.sport}&league=${league.slug}`,
          sport: league.sport,
          region: league.region,
          season: league.season,
          summary: `${league.region} · ${league.season}`,
        } satisfies SearchLeagueResult,
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.item);

  const planResults = plans
    .map((plan) => {
      const baseScore = scoreText(trimmedQuery, tokens, [
        plan.title,
        plan.league,
        plan.teaser,
        plan.marketSummary,
        plan.performance,
        ...plan.tags,
      ]);
      const score = baseScore < 0 ? -1 : baseScore + (plan.isHot ? 8 : 0);

      return {
        score,
        item: {
          id: plan.id,
          title: plan.title,
          href: `/plans/${plan.slug}`,
          sport: plan.sport,
          league: plan.league,
          kickoff: plan.kickoff,
          price: plan.price,
          summary: plan.teaser,
        } satisfies SearchPlanResult,
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.item);

  const authorResults = authors
    .map((author) => {
      const relatedPlans = plansByAuthorId.get(author.id) ?? [];
      const primarySport = relatedPlans[0]?.sport;
      const baseScore = scoreText(trimmedQuery, tokens, [
        author.name,
        author.focus,
        author.badge,
        author.streak,
        author.winRate,
        author.monthlyRoi,
        author.followers,
        ...relatedPlans.flatMap((plan) => [plan.title, plan.league, ...plan.tags]),
      ]);
      const score = baseScore < 0 ? -1 : baseScore + relatedPlans.length;

      return {
        score,
        item: {
          id: author.id,
          title: author.name,
          href: primarySport ? `/plans?sport=${primarySport}` : "/plans",
          sport: primarySport,
          badge: author.badge,
          focus: author.focus,
          summary: `${author.streak} · ${author.winRate} · ${author.monthlyRoi}`,
        } satisfies SearchAuthorResult,
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.item);

  return {
    query: trimmedQuery,
    matches,
    leagues,
    plans: planResults,
    authors: authorResults,
    total: matches.length + leagues.length + planResults.length + authorResults.length,
  };
}
