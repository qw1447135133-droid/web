import type { ArticlePlan, Match } from "@/lib/types";

function normalizeValue(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function includesValue(source: string, candidate: string) {
  if (!source || !candidate) {
    return false;
  }

  return normalizeValue(source).includes(normalizeValue(candidate));
}

function getHourDistance(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(leftTime - rightTime) / (1000 * 60 * 60);
}

function scorePlanMatch(plan: ArticlePlan, match: Match) {
  if (plan.sport !== match.sport) {
    return Number.NEGATIVE_INFINITY;
  }

  if (plan.matchId && plan.matchId === match.id) {
    return Number.POSITIVE_INFINITY;
  }

  let score = 0;
  const searchText = `${plan.title} ${plan.teaser} ${plan.marketSummary}`;
  const leagueName = match.leagueName ?? match.leagueSlug;

  if (normalizeValue(plan.league) === normalizeValue(leagueName)) {
    score += 6;
  }

  if (includesValue(searchText, match.homeTeam)) {
    score += 4;
  }

  if (includesValue(searchText, match.awayTeam)) {
    score += 4;
  }

  const hourDistance = getHourDistance(plan.kickoff, match.kickoff);

  if (hourDistance <= 6) {
    score += 3;
  } else if (hourDistance <= 24) {
    score += 1;
  }

  return score;
}

export function findRelatedMatch(plan: ArticlePlan, matches: Match[]) {
  if (plan.matchId) {
    const exactMatch = matches.find((match) => match.id === plan.matchId);

    if (exactMatch) {
      return exactMatch;
    }
  }

  return [...matches]
    .map((match) => ({
      match,
      score: scorePlanMatch(plan, match),
      hourDistance: getHourDistance(plan.kickoff, match.kickoff),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.hourDistance - right.hourDistance;
    })[0]?.match;
}

export function findSiblingPlans(plan: ArticlePlan, plans: ArticlePlan[], limit = 2) {
  return plans
    .filter((item) => item.id !== plan.id && item.sport === plan.sport)
    .sort((left, right) => {
      const sameLeagueDiff =
        Number(normalizeValue(right.league) === normalizeValue(plan.league)) -
        Number(normalizeValue(left.league) === normalizeValue(plan.league));

      if (sameLeagueDiff !== 0) {
        return sameLeagueDiff;
      }

      return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
    })
    .slice(0, limit);
}

export function isPlanLinkedToMatch(plan: ArticlePlan, match: Match, matches: Match[]) {
  if (plan.matchId) {
    return plan.matchId === match.id;
  }

  return findRelatedMatch(plan, matches)?.id === match.id;
}

export function findLinkedPlansForMatch(match: Match, plans: ArticlePlan[], matches: Match[], limit = 2) {
  const sameSportPlans = plans.filter((plan) => plan.sport === match.sport);
  return sameSportPlans
    .filter((plan) => isPlanLinkedToMatch(plan, match, matches))
    .sort((left, right) => {
      const leftExact = Number(left.matchId === match.id);
      const rightExact = Number(right.matchId === match.id);

      if (leftExact !== rightExact) {
        return rightExact - leftExact;
      }

      return getHourDistance(left.kickoff, match.kickoff) - getHourDistance(right.kickoff, match.kickoff);
    })
    .slice(0, limit);
}

export function findPlansForMatch(match: Match, plans: ArticlePlan[], matches: Match[], limit = 2) {
  const sameSportPlans = plans.filter((plan) => plan.sport === match.sport);
  const linkedPlans = findLinkedPlansForMatch(match, plans, matches, limit);

  if (linkedPlans.length > 0) {
    return linkedPlans;
  }

  return sameSportPlans
    .sort((left, right) => {
      const leftSameLeague = Number(normalizeValue(left.league) === normalizeValue(match.leagueName ?? match.leagueSlug));
      const rightSameLeague = Number(normalizeValue(right.league) === normalizeValue(match.leagueName ?? match.leagueSlug));

      if (leftSameLeague !== rightSameLeague) {
        return rightSameLeague - leftSameLeague;
      }

      return getHourDistance(left.kickoff, match.kickoff) - getHourDistance(right.kickoff, match.kickoff);
    })
    .slice(0, limit);
}
