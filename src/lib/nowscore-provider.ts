import { cache } from "react";
import { runInNewContext } from "node:vm";
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

export type NowscoreDatabaseSnapshot = {
  leagues: League[];
  standings: StandingRow[];
  schedule: ScheduleRow[];
  teams: Team[];
  h2h: HeadToHeadRow[];
};

type ManualLeague = {
  id: number;
  slug: string;
  sport: Sport;
  name: string;
  region: string;
  featured: boolean;
  sclassType?: "s" | "c";
};

type FootballLivePayload = {
  leagues: unknown[][];
  matches: unknown[][];
  matchDate: string;
};

type BasketballPayload = {
  matches: unknown[][];
  oddsByMatchId: Map<string, string[]>;
};

type FootballLeaguePayload = {
  arrLeague: unknown[];
  arrTeam: unknown[][];
  rounds: Map<number, unknown[][]>;
  totalScore: unknown[][];
  homeScore: unknown[][];
  guestScore: unknown[][];
};

type BasketballLeaguePayload = {
  arrLeague: unknown[];
  arrTeam: unknown[][];
  rankingRows: unknown[][];
  lastUpdateTime: string;
};

type BasketballSchedulePayload = {
  arrLeague: unknown[];
  arrTeam: unknown[][];
  ymList: [number, number][];
  arrData: unknown[][];
  lastUpdateTime: string;
};

type BasketballTeamInfoPayload = {
  arrLeague: unknown[];
  arrTeam: unknown[][];
  lastUpdateTime: string;
};

const MANUAL_LEAGUES: ManualLeague[] = [
  {
    id: 36,
    slug: "premier-league",
    sport: "football",
    name: "Premier League",
    region: "Europe",
    featured: true,
    sclassType: "s",
  },
  {
    id: 31,
    slug: "la-liga",
    sport: "football",
    name: "La Liga",
    region: "Europe",
    featured: true,
    sclassType: "s",
  },
  {
    id: 25,
    slug: "j1-league",
    sport: "football",
    name: "J1 League",
    region: "Asia",
    featured: true,
    sclassType: "s",
  },
  {
    id: 1,
    slug: "nba",
    sport: "basketball",
    name: "NBA",
    region: "North America",
    featured: true,
  },
  {
    id: 5,
    slug: "cba",
    sport: "basketball",
    name: "CBA",
    region: "Asia",
    featured: true,
  },
  {
    id: 7,
    slug: "euroleague",
    sport: "basketball",
    name: "EuroLeague",
    region: "Europe",
    featured: false,
  },
];

const BASKETBALL_ODD_COMPANY = 3;

const DEFAULT_HEADERS = {
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

const LEAGUES_BY_SPORT = {
  football: MANUAL_LEAGUES.filter((league) => league.sport === "football"),
  basketball: MANUAL_LEAGUES.filter((league) => league.sport === "basketball"),
  cricket: [],
  esports: [],
} satisfies Record<Sport, typeof MANUAL_LEAGUES>;

const LEAGUES_BY_ID = new Map(MANUAL_LEAGUES.map((league) => [league.id, league]));
const LEAGUES_BY_SLUG = new Map(MANUAL_LEAGUES.map((league) => [league.slug, league]));

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function toStringValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function toNumberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPlainText(value: string) {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/^\u9518\u7E31ar/, "var");
}

const MOJIBAKE_CHAR_PATTERN = /[\uFFFD\u00C3\u00C2\u951F\u95BF\u9225\u20AC\u74D2\u7EE1\u941E\u93BA\u74A7\u9357\u93C7\u93CC]/;
const MOJIBAKE_CHAR_PATTERN_GLOBAL = /[\uFFFD\u00C3\u00C2\u951F\u95BF\u9225\u20AC\u74D2\u7EE1\u941E\u93BA\u74A7\u9357\u93C7\u93CC]+/g;
const BRACKETED_MOJIBAKE_PATTERN = /\[[\uFFFD\u00C3\u00C2\u951F\u95BF\u9225\u20AC\u74D2\u7EE1\u941E\u93BA\u74A7\u9357\u93C7\u93CC0-9\s]+\]/g;
const READABLE_TEXT_PATTERN = /[\p{Script=Han}A-Za-z0-9]/u;

function sanitizeDisplayText(value: string) {
  return toPlainText(value)
    .replace(BRACKETED_MOJIBAKE_PATTERN, " ")
    .replace(MOJIBAKE_CHAR_PATTERN_GLOBAL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeMojibake(value: string) {
  return MOJIBAKE_CHAR_PATTERN.test(value);
}

function isReadableDisplayText(value: string) {
  return Boolean(value) && !looksLikeMojibake(value) && READABLE_TEXT_PATTERN.test(value);
}

function pickReadableText(values: string[], fallback = "") {
  const sanitized = values.map((value) => sanitizeDisplayText(value)).filter(Boolean);
  const resolved = sanitized.find((value) => isReadableDisplayText(value)) ?? sanitized.find(Boolean) ?? "";

  if (resolved) {
    return resolved;
  }

  return sanitizeDisplayText(fallback) || fallback;
}

function pickName(values: unknown, preferredIndex = 2, fallback = "") {
  if (Array.isArray(values)) {
    const candidates = [toStringValue(values[preferredIndex]), ...values.map((item) => toStringValue(item))].filter(Boolean);
    return pickReadableText(candidates, fallback);
  }

  return pickReadableText([toStringValue(values)], fallback);
}

function buildShortName(value: string, fallback: string) {
  const cleaned = pickReadableText([value], fallback);

  if (!cleaned) {
    return fallback;
  }

  if (/[\p{Script=Han}]/u.test(cleaned)) {
    return cleaned.slice(0, 2);
  }

  const initialism = cleaned
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 4);

  if (initialism) {
    return initialism;
  }

  return cleaned.slice(0, 4).toUpperCase();
}

function decodeResponseBuffer(buffer: ArrayBuffer) {
  for (const encoding of ["utf-8", "gb18030"] as const) {
    try {
      return stripBom(new TextDecoder(encoding).decode(buffer));
    } catch {
      continue;
    }
  }

  return stripBom(new TextDecoder().decode(buffer));
}

async function fetchRemoteText(url: string, revalidate = 60) {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    next: {
      revalidate,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return decodeResponseBuffer(await response.arrayBuffer());
}

function evaluateLiteral<T>(literal: string): T {
  const sandbox: { value?: T } = {};
  runInNewContext(`value = (${literal});`, sandbox, { timeout: 50 });

  if (typeof sandbox.value === "undefined") {
    throw new Error("Unable to evaluate nowscore literal");
  }

  return sandbox.value;
}

function evaluateScript<T extends Record<string, unknown>>(script: string) {
  const sandbox = {} as T;
  runInNewContext(stripBom(script), sandbox, { timeout: 200 });
  return sandbox;
}

function getCurrentFootballSeasonLabel(date = new Date()) {
  const startYear = date.getMonth() + 1 >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function getCurrentBasketballSeasonLabel(date = new Date()) {
  const startYear = date.getMonth() + 1 >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function getBasketballSeasonScriptSegment(seasonLabel: string) {
  const [startYear, endYear] = seasonLabel.split("-").map((value) => Number(value));

  if (!startYear || !endYear) {
    return "";
  }

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

function buildLeagueList(sport: Sport): League[] {
  return LEAGUES_BY_SPORT[sport].map((league) => ({
    id: String(league.id),
    slug: league.slug,
    sport: league.sport,
    name: league.name,
    region: league.region,
    season:
      sport === "football"
        ? getCurrentFootballSeasonLabel()
        : sport === "basketball"
          ? getCurrentBasketballSeasonLabel()
          : String(new Date().getFullYear()),
    featured: league.featured,
  }));
}

function buildKickoffFromMonthDay(dateText: string, timeText: string) {
  const monthDay = dateText.match(/(\d{1,2}).*?(\d{1,2})/);
  const hourMinute = timeText.match(/(\d{1,2}):(\d{2})/);
  const now = new Date();

  if (!monthDay || !hourMinute) {
    return now.toISOString();
  }

  let year = now.getFullYear();
  const month = Number(monthDay[1]);
  const day = Number(monthDay[2]);
  const hour = Number(hourMinute[1]);
  const minute = Number(hourMinute[2]);

  if (now.getMonth() === 11 && month === 1) {
    year += 1;
  }

  if (now.getMonth() === 0 && month === 12) {
    year -= 1;
  }

  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function buildKickoffFromBasketballTime(matchTime: string) {
  const digits = matchTime.match(/\d+/g) ?? [];
  const now = new Date();

  if (digits.length < 4) {
    return now.toISOString();
  }

  const month = Number(digits[0]);
  const day = Number(digits[1]);
  const hour = Number(digits[2]);
  const minute = Number(digits[3]);

  let year = now.getFullYear();

  if (now.getMonth() === 11 && month === 1) {
    year += 1;
  }

  if (now.getMonth() === 0 && month === 12) {
    year -= 1;
  }

  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function footballStatusFromState(rawState: unknown): MatchStatus {
  const state = Number(rawState);

  if (state === 0) {
    return "upcoming";
  }

  if ([-1, -11, -12, -13, -14].includes(state)) {
    return "finished";
  }

  return "live";
}

function basketballStatusFromState(rawState: unknown): MatchStatus {
  const state = Number(rawState);

  if (state === -1) {
    return "finished";
  }

  if (state === 0) {
    return "upcoming";
  }

  return "live";
}

function buildOddsSnapshot(values: Partial<OddsSnapshot>): OddsSnapshot {
  return {
    home: values.home ?? null,
    draw: values.draw ?? null,
    away: values.away ?? null,
    spread: values.spread ?? "--",
    total: values.total ?? "--",
    movement: values.movement ?? "flat",
  };
}

function isSaneThreeWayOdds(home: number | null, draw: number | null, away: number | null) {
  if (home == null || away == null) {
    return false;
  }

  return home > 1.05 && home < 20 && (draw == null || (draw > 1.5 && draw < 20)) && away > 1.05 && away < 20;
}

function extractTableRows(html: string) {
  return Array.from(html.matchAll(/<TR[^>]*class=['"]datatr['"][^>]*>([\s\S]*?)<\/TR>/gi)).map((match) => match[1]);
}

function extractCellTexts(rowHtml: string) {
  return Array.from(rowHtml.matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)).map((match) =>
    toPlainText(match[1]).replace(/\*+/g, "*"),
  );
}

async function fetchFootballMarketOdds(matchId: string) {
  const html = await fetchRemoteText(`https://live.nowscore.com/odds/match/${matchId}.htm`, 300);
  const preferredCompanies = ["36*", "Crow*", "18*"];
  const rows = extractTableRows(html)
    .map((rowHtml) => extractCellTexts(rowHtml))
    .filter((cells) => cells.length >= 19);

  const selected =
    preferredCompanies
      .map((company) => rows.find((cells) => cells[0]?.includes(company) && toNumberValue(cells[10]) != null))
      .find(Boolean) ?? rows.find((cells) => toNumberValue(cells[10]) != null);

  if (!selected) {
    return buildOddsSnapshot({});
  }

  const openingHome = toNumberValue(selected[7]);
  const openingDraw = toNumberValue(selected[8]);
  const openingAway = toNumberValue(selected[9]);
  const currentHome = toNumberValue(selected[10]);
  const currentDraw = toNumberValue(selected[11]);
  const currentAway = toNumberValue(selected[12]);

  const useCurrent = isSaneThreeWayOdds(currentHome, currentDraw, currentAway);

  return buildOddsSnapshot({
    home: useCurrent ? currentHome : openingHome,
    draw: useCurrent ? currentDraw : openingDraw,
    away: useCurrent ? currentAway : openingAway,
    spread: selected[5] || selected[2] || "--",
    total: selected[17] || selected[14] || "--",
  });
}

const loadFootballLivePayload = cache(async (): Promise<FootballLivePayload> => {
  const text = await fetchRemoteText("https://live.nowscore.com/data/bf.js", 60);
  const matches = Array.from(text.matchAll(/^A\[(\d+)\]=(.+);$/gm)).map((match) => evaluateLiteral<unknown[]>(match[2]));
  const leagues = Array.from(text.matchAll(/^B\[(\d+)\]=(.+);$/gm)).map((match) => evaluateLiteral<unknown[]>(match[2]));
  const matchDate = text.match(/var matchdate="([^"]+)"/)?.[1] ?? "";

  return {
    leagues,
    matches,
    matchDate,
  };
});

const loadBasketballPayload = cache(async (): Promise<BasketballPayload> => {
  const [matchesXml, oddsXml] = await Promise.all([
    fetchRemoteText("https://live.nowscore.com/NBA/nba.xml", 60),
    fetchRemoteText(`https://live.nowscore.com/data/NBA/nbaGoal${BASKETBALL_ODD_COMPANY}.xml`, 60),
  ]);

  const matches = Array.from(matchesXml.matchAll(/<h><!\[CDATA\[([\s\S]*?)\]\]><\/h>/g)).map((match) =>
    match[1].split("^"),
  );
  const oddsByMatchId = new Map<string, string[]>();

  for (const match of oddsXml.matchAll(/<m>(.*?)<\/m>/g)) {
    const values = match[1].split(",");
    const matchId = values[0];

    if (matchId) {
      oddsByMatchId.set(matchId, values);
    }
  }

  return {
    matches,
    oddsByMatchId,
  };
});

const loadFootballLeaguePayload = cache(
  async (leagueId: number, sclassType: "s" | "c"): Promise<FootballLeaguePayload> => {
    const text = await fetchRemoteText(
      `https://info.nowscore.com/AjaxLeague.aspx?SclassID=${leagueId}&SclassType=${sclassType}`,
      300,
    );

    const arrLeagueLiteral = text.match(/var arrLeague = (\[[\s\S]*?\]);/)?.[1];
    const arrTeamLiteral = text.match(/var arrTeam = (\[[\s\S]*?\]);/)?.[1];
    const totalScoreLiteral = text.match(/var totalScore = (\[[\s\S]*?\]);/)?.[1];
    const homeScoreLiteral = text.match(/var homeScore = (\[[\s\S]*?\]);/)?.[1];
    const guestScoreLiteral = text.match(/var guestScore = (\[[\s\S]*?\]);/)?.[1];

    if (!arrLeagueLiteral || !arrTeamLiteral || !totalScoreLiteral || !homeScoreLiteral || !guestScoreLiteral) {
      throw new Error(`Incomplete football league payload for ${leagueId}`);
    }

    const rounds = new Map<number, unknown[][]>();

    for (const match of text.matchAll(/jh\["R_(\d+)"\]\s*=\s*(\[[\s\S]*?\]);/g)) {
      rounds.set(Number(match[1]), evaluateLiteral<unknown[][]>(match[2]));
    }

    return {
      arrLeague: evaluateLiteral<unknown[]>(arrLeagueLiteral),
      arrTeam: evaluateLiteral<unknown[][]>(arrTeamLiteral),
      rounds,
      totalScore: evaluateLiteral<unknown[][]>(totalScoreLiteral),
      homeScore: evaluateLiteral<unknown[][]>(homeScoreLiteral),
      guestScore: evaluateLiteral<unknown[][]>(guestScoreLiteral),
    };
  },
);

const loadBasketballLeaguePayload = cache(async (leagueId: number): Promise<BasketballLeaguePayload> => {
  const landingPage = await fetchRemoteText(`https://nba.nowscore.com/cn/LeagueRank.aspx?SclassID=${leagueId}`, 300);
  const rankScriptPath = landingPage.match(/src="([^"]*\/jsData\/rank\/[^"]*\/s\d+\.js[^"]*)"/i)?.[1];

  if (!rankScriptPath) {
    throw new Error(`Unable to locate basketball rank script for league ${leagueId}`);
  }

  const rankScript = await fetchRemoteText(new URL(rankScriptPath, "https://nba.nowscore.com").toString(), 300);
  const sandbox = evaluateScript<{
    arrLeague?: unknown[];
    arrTeam?: unknown[][];
    eastData?: unknown[][];
    westData?: unknown[][];
    totalData?: unknown[][];
    allData?: unknown[][];
    lastUpdateTime?: string;
  }>(rankScript);

  const rankingRows = [
    ...(Array.isArray(sandbox.eastData) ? sandbox.eastData : []),
    ...(Array.isArray(sandbox.westData) ? sandbox.westData : []),
    ...(Array.isArray(sandbox.totalData) ? sandbox.totalData : []),
    ...(Array.isArray(sandbox.allData) ? sandbox.allData : []),
  ];

  if (!Array.isArray(sandbox.arrTeam) || rankingRows.length === 0) {
    throw new Error(`Incomplete basketball league payload for ${leagueId}`);
  }

  return {
    arrLeague: Array.isArray(sandbox.arrLeague) ? sandbox.arrLeague : [],
    arrTeam: sandbox.arrTeam,
    rankingRows,
    lastUpdateTime: toStringValue(sandbox.lastUpdateTime),
  };
});

const loadBasketballSchedulePayload = cache(async (leagueId: number): Promise<BasketballSchedulePayload> => {
  const normalPage = await fetchRemoteText(
    `https://nba.nowscore.com/cn/Normal.aspx?SclassID=${leagueId}&matchSeason=${getCurrentBasketballSeasonLabel()}`,
    300,
  );
  const currentScriptPath = normalPage.match(
    /src="([^"]*\/jsData\/matchResult\/([^/]+)\/l\d+_1_\d+_\d+\.js[^"]*)"/i,
  )?.[1];
  const seasonSegment = normalPage.match(
    /src="[^"]*\/jsData\/matchResult\/([^/]+)\/l\d+_1_\d+_\d+\.js/i,
  )?.[1];

  if (!currentScriptPath || !seasonSegment) {
    throw new Error(`Unable to locate basketball schedule script for league ${leagueId}`);
  }

  const currentScript = await fetchRemoteText(new URL(currentScriptPath, "https://nba.nowscore.com").toString(), 300);
  const currentSandbox = evaluateScript<{
    arrLeague?: unknown[];
    arrTeam?: unknown[][];
    ymList?: unknown[][];
    arrData?: unknown[][];
    lastUpdateTime?: string;
  }>(currentScript);

  if (!Array.isArray(currentSandbox.arrTeam) || !Array.isArray(currentSandbox.ymList)) {
    throw new Error(`Incomplete basketball schedule payload for league ${leagueId}`);
  }

  const ymList = currentSandbox.ymList
    .map((value) => [Number(value?.[0] ?? 0), Number(value?.[1] ?? 0)] as [number, number])
    .filter(([year, month]) => year > 0 && month > 0);
  const scriptBase = `https://nba.nowscore.com/jsData/matchResult/${seasonSegment}`;
  const currentSeasonSegment = getBasketballSeasonScriptSegment(getCurrentBasketballSeasonLabel());
  const fallbackBase = currentSeasonSegment
    ? `https://nba.nowscore.com/jsData/matchResult/${currentSeasonSegment}`
    : scriptBase;
  const monthScripts = await Promise.all(
    ymList.map(async ([year, month]) => {
      const primaryUrl = `${scriptBase}/l${leagueId}_1_${year}_${month}.js?version=${Date.now()}`;

      try {
        return await fetchRemoteText(primaryUrl, 300);
      } catch {
        return fetchRemoteText(`${fallbackBase}/l${leagueId}_1_${year}_${month}.js?version=${Date.now()}`, 300);
      }
    }),
  );
  const arrData = monthScripts.flatMap((script) => {
    const sandbox = evaluateScript<{
      arrData?: unknown[][];
    }>(script);

    return Array.isArray(sandbox.arrData) ? sandbox.arrData : [];
  });

  return {
    arrLeague: Array.isArray(currentSandbox.arrLeague) ? currentSandbox.arrLeague : [],
    arrTeam: currentSandbox.arrTeam,
    ymList,
    arrData,
    lastUpdateTime: toStringValue(currentSandbox.lastUpdateTime),
  };
});

const loadBasketballTeamInfoPayload = cache(async (leagueId: number): Promise<BasketballTeamInfoPayload> => {
  const teamInfoPage = await fetchRemoteText(`https://nba.nowscore.com/cn/TeamInfo.aspx?SclassID=${leagueId}`, 300);
  const teamInfoScriptPath = teamInfoPage.match(/src="([^"]*\/jsData\/teamInfo\/ti\d+\.js[^"]*)"/i)?.[1];

  if (!teamInfoScriptPath) {
    throw new Error(`Unable to locate basketball team info script for league ${leagueId}`);
  }

  const teamInfoScript = await fetchRemoteText(new URL(teamInfoScriptPath, "https://nba.nowscore.com").toString(), 300);
  const sandbox = evaluateScript<{
    arrLeague?: unknown[];
    arrTeam?: unknown[][];
    lastUpdateTime?: string;
  }>(teamInfoScript);

  if (!Array.isArray(sandbox.arrTeam)) {
    throw new Error(`Incomplete basketball team info payload for league ${leagueId}`);
  }

  return {
    arrLeague: Array.isArray(sandbox.arrLeague) ? sandbox.arrLeague : [],
    arrTeam: sandbox.arrTeam,
    lastUpdateTime: toStringValue(sandbox.lastUpdateTime),
  };
});

function buildFootballClock(rawState: unknown) {
  const state = Number(rawState);

  if (state > 0 && state < 130) {
    return `${state}'`;
  }

  return undefined;
}

function mapFootballLiveMatch(matchDate: string, leagues: unknown[][], row: unknown[]): Match | null {
  const leagueIndex = Number(row[1] ?? -1);
  const leagueEntry = leagues[leagueIndex];

  if (!leagueEntry) {
    return null;
  }

  const leagueId = Number(leagueEntry[0] ?? 0);
  const league = LEAGUES_BY_ID.get(leagueId);

  if (!league || league.sport !== "football") {
    return null;
  }

  const kickoff = buildKickoffFromMonthDay(matchDate, toStringValue(row[10]));
  const homeTeam = pickName([row[4], row[5], row[6]], 2, "Home Team");
  const awayTeam = pickName([row[7], row[8], row[9]], 2, "Away Team");
  const homeScore = toStringValue(row[13]);
  const awayScore = toStringValue(row[14]);
  const spread = toStringValue(row[25]) || "--";
  const total = toStringValue(row[33]) || "--";
  const clockText = buildFootballClock(row[12]);
  const statLineParts = [
    spread !== "--" ? `AH ${spread}` : "",
    total !== "--" ? `O/U ${total}` : "",
  ].filter(Boolean);

  return {
    id: toStringValue(row[0]),
    sport: "football",
    leagueSlug: league.slug,
    leagueName: league.name,
    kickoff,
    status: footballStatusFromState(row[12]),
    clock: clockText,
    venue: "Nowscore Football Feed",
    homeTeam,
    awayTeam,
    score: homeScore && awayScore ? `${homeScore} - ${awayScore}` : "-",
    statLine: statLineParts.join(" | ") || `${homeTeam} vs ${awayTeam}`,
    insight: `${league.name} live scrape`,
    odds: buildOddsSnapshot({
      spread,
      total,
    }),
  };
}

function mapBasketballMatch(row: unknown[], oddsByMatchId: Map<string, string[]>): Match | null {
  const leagueId = Number(row[36] ?? 0);
  const league = LEAGUES_BY_ID.get(leagueId);

  if (!league || league.sport !== "basketball") {
    return null;
  }

  const homeNames = toStringValue(row[8]).split(",");
  const awayNames = toStringValue(row[10]).split(",");
  const oddsEntry = oddsByMatchId.get(toStringValue(row[0]));
  const periodScores = [
    [toStringValue(row[13]), toStringValue(row[14])],
    [toStringValue(row[15]), toStringValue(row[16])],
    [toStringValue(row[17]), toStringValue(row[18])],
    [toStringValue(row[19]), toStringValue(row[20])],
  ]
    .filter(([home, away]) => home || away)
    .map(([home, away], index) => `Q${index + 1} ${home || "0"}-${away || "0"}`);

  return {
    id: toStringValue(row[0]),
    sport: "basketball",
    leagueSlug: league.slug,
    leagueName: pickReadableText(toStringValue(row[1]).split(",")) || league.name,
    kickoff: buildKickoffFromBasketballTime(toStringValue(row[4])),
    status: basketballStatusFromState(row[5]),
    clock: toStringValue(row[6]) || undefined,
    venue: "Nowscore Basketball Feed",
    homeTeam: pickName(homeNames, 0, "Home Team"),
    awayTeam: pickName(awayNames, 0, "Away Team"),
    score:
      toStringValue(row[11]) && toStringValue(row[12]) ? `${toStringValue(row[11])} - ${toStringValue(row[12])}` : "-",
    statLine:
      periodScores.join(" | ") ||
      `${pickName(homeNames, 0, "Home Team")} vs ${pickName(awayNames, 0, "Away Team")}`,
    insight: `${league.name} live scrape`,
    odds: buildOddsSnapshot({
      home: oddsEntry ? toNumberValue(oddsEntry[8]) : toNumberValue(toStringValue(row[35]).split(",")[0]),
      away: oddsEntry ? toNumberValue(oddsEntry[9]) : toNumberValue(toStringValue(row[35]).split(",")[1]),
      spread: oddsEntry?.[1] || "--",
      total: oddsEntry?.[4] || "--",
    }),
  };
}

function sortMatches(items: Match[]) {
  return [...items].sort((left, right) => {
    const order = {
      live: 0,
      upcoming: 1,
      finished: 2,
    } as const;

    const statusDiff = order[left.status] - order[right.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
  });
}

function buildFootballFixtureTeamName(teamId: number, teamsById: Map<number, unknown[]>) {
  const team = teamsById.get(teamId);
  return team ? pickName([team[1], team[2], team[3]], 2, `Team ${teamId}`) : `Team ${teamId}`;
}

function buildFootballForm(home: unknown[] | undefined, away: unknown[] | undefined) {
  const values = [
    home ? `${toStringValue(home[3])}-${toStringValue(home[4])}-${toStringValue(home[5])}` : "",
    away ? `${toStringValue(away[3])}-${toStringValue(away[4])}-${toStringValue(away[5])}` : "",
  ].filter(Boolean);

  return values.join(" / ") || "--";
}

function mapFootballStandings(payload: FootballLeaguePayload, leagueSlug: string) {
  const homeScoreByTeam = new Map(payload.homeScore.map((row) => [Number(row[1]), row]));
  const guestScoreByTeam = new Map(payload.guestScore.map((row) => [Number(row[1]), row]));
  const teamById = new Map(payload.arrTeam.map((row) => [Number(row[0]), row]));

  const standings: StandingRow[] = payload.totalScore.map((row) => ({
    rank: Number(row[1] ?? 0),
    teamId: toStringValue(row[2]),
    team: buildFootballFixtureTeamName(Number(row[2] ?? 0), teamById),
    played: Number(row[4] ?? 0),
    win: Number(row[5] ?? 0),
    draw: Number(row[6] ?? 0),
    loss: Number(row[7] ?? 0),
    points: Number(row[16] ?? 0),
    form: buildFootballForm(homeScoreByTeam.get(Number(row[2])), guestScoreByTeam.get(Number(row[2]))),
    homeRecord: homeScoreByTeam.has(Number(row[2]))
      ? `${toStringValue(homeScoreByTeam.get(Number(row[2]))?.[3])}-${toStringValue(homeScoreByTeam.get(Number(row[2]))?.[4])}-${toStringValue(homeScoreByTeam.get(Number(row[2]))?.[5])}`
      : "--",
    awayRecord: guestScoreByTeam.has(Number(row[2]))
      ? `${toStringValue(guestScoreByTeam.get(Number(row[2]))?.[3])}-${toStringValue(guestScoreByTeam.get(Number(row[2]))?.[4])}-${toStringValue(guestScoreByTeam.get(Number(row[2]))?.[5])}`
      : "--",
  }));

  const teams: Team[] = standings.map((row) => ({
    id: row.teamId ?? row.team,
    leagueSlug,
    sport: "football",
    name: row.team,
    shortName: buildShortName(row.team, `F${row.rank}`),
    ranking: row.rank,
    form: row.form ?? "--",
    homeRecord: row.homeRecord ?? "--",
    awayRecord: row.awayRecord ?? "--",
  }));

  const fixtures = Array.from(payload.rounds.values()).flat();

  return {
    standings,
    teams,
    fixtures,
  };
}

function buildFootballScheduleRows(fixtures: unknown[][], teamsById: Map<number, unknown[]>) {
  const now = Date.now();

  return fixtures
    .map((row) => {
      const kickoff = new Date(toStringValue(row[3]));
      const homeTeam = buildFootballFixtureTeamName(Number(row[4] ?? 0), teamsById);
      const awayTeam = buildFootballFixtureTeamName(Number(row[5] ?? 0), teamsById);
      const result = toStringValue(row[6]) || "-";
      const spread = toStringValue(row[10]);
      const total = toStringValue(row[12]);

      return {
        id: toStringValue(row[0]),
        kickoff,
        schedule: {
          id: toStringValue(row[0]),
          date: `${pad(kickoff.getMonth() + 1)}-${pad(kickoff.getDate())}`,
          fixture: `${homeTeam} vs ${awayTeam}`,
          result,
          note: [spread ? `AH ${spread}` : "", total ? `O/U ${total}` : ""].filter(Boolean).join(" | ") || "League fixture",
        } satisfies ScheduleRow,
      };
    })
    .sort((left, right) => Math.abs(left.kickoff.getTime() - now) - Math.abs(right.kickoff.getTime() - now))
    .slice(0, 12)
    .map((item) => item.schedule);
}

function buildFootballHeadToHead(fixtures: unknown[][], teamsById: Map<number, unknown[]>, standings: StandingRow[]) {
  const topTwo = standings.slice(0, 2).map((row) => Number(row.teamId));
  const filtered = fixtures
    .filter((row) => {
      const home = Number(row[4] ?? 0);
      const away = Number(row[5] ?? 0);
      const score = toStringValue(row[6]);

      return score && topTwo.length === 2 && home && away && topTwo.includes(home) && topTwo.includes(away);
    })
    .sort((left, right) => new Date(toStringValue(right[3])).getTime() - new Date(toStringValue(left[3])).getTime())
    .slice(0, 5);

  if (filtered.length === 0) {
    return fixtures
      .filter((row) => toStringValue(row[6]))
      .sort((left, right) => new Date(toStringValue(right[3])).getTime() - new Date(toStringValue(left[3])).getTime())
      .slice(0, 5)
      .map((row) => ({
        season: toStringValue(row[3]).slice(0, 4),
        fixture: `${buildFootballFixtureTeamName(Number(row[4] ?? 0), teamsById)} ${toStringValue(row[6])} ${buildFootballFixtureTeamName(Number(row[5] ?? 0), teamsById)}`,
        tag: "Recent",
      }));
  }

  return filtered.map((row) => ({
    season: toStringValue(row[3]).slice(0, 4),
    fixture: `${buildFootballFixtureTeamName(Number(row[4] ?? 0), teamsById)} ${toStringValue(row[6])} ${buildFootballFixtureTeamName(Number(row[5] ?? 0), teamsById)}`,
    tag: "H2H",
  }));
}

function buildBasketballTeamName(teamRow: unknown[] | undefined) {
  if (!teamRow) {
    return "Unknown Team";
  }

  return pickName([teamRow[3], teamRow[6], teamRow[4], teamRow[1]], 2, "Unknown Team");
}

function buildBasketballTeamShortName(teamRow: unknown[] | undefined) {
  if (!teamRow) {
    return "TEAM";
  }

  return buildShortName(pickName([teamRow[6], teamRow[4], teamRow[3], teamRow[1]], 0, "TEAM"), "TEAM");
}

function buildBasketballFixtureTeamName(teamId: number, teamsById: Map<number, unknown[]>) {
  const team = teamsById.get(teamId);
  return team ? buildBasketballTeamName(team) : `Team ${teamId}`;
}

function mapBasketballStandings(payload: BasketballLeaguePayload, leagueSlug: string) {
  const teamById = new Map(payload.arrTeam.map((row) => [Number(row[0]), row]));
  const standings = payload.rankingRows
    .map((row) => {
      const teamId = Number(row[0] ?? 0);
      const win = Number(row[1] ?? 0);
      const loss = Number(row[2] ?? 0);
      const homeWin = Number(row[8] ?? 0);
      const homeLoss = Number(row[9] ?? 0);
      const awayWin = Number(row[14] ?? 0);
      const awayLoss = Number(row[15] ?? 0);
      const lastTenWin = Number(row[16] ?? 0);
      const lastTenLoss = Number(row[17] ?? 0);
      const winPct = Number(row[3] ?? 0);

      return {
        rank: 0,
        teamId: String(teamId),
        team: buildBasketballTeamName(teamById.get(teamId)),
        played: win + loss,
        win,
        draw: 0,
        loss,
        points: win,
        form: `L10 ${lastTenWin}-${lastTenLoss}`,
        homeRecord: `${homeWin}-${homeLoss}`,
        awayRecord: `${awayWin}-${awayLoss}`,
        sortWinPct: winPct,
      };
    })
    .sort((left, right) => right.sortWinPct - left.sortWinPct || right.win - left.win)
    .map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      team: row.team,
      played: row.played,
      win: row.win,
      draw: row.draw,
      loss: row.loss,
      points: row.points,
      form: row.form,
      homeRecord: row.homeRecord,
      awayRecord: row.awayRecord,
    } satisfies StandingRow));

  const teams: Team[] = standings.map((row) => ({
    id: row.teamId ?? row.team,
    leagueSlug,
    sport: "basketball",
    name: row.team,
    shortName: buildShortName(row.team, `B${row.rank}`),
    ranking: row.rank,
    form: row.form ?? "--",
    homeRecord: row.homeRecord ?? "--",
    awayRecord: row.awayRecord ?? "--",
  }));

  return {
    standings,
    teams,
  };
}

function buildBasketballTeams(standings: StandingRow[], teamInfoPayload: BasketballTeamInfoPayload, leagueSlug: string) {
  const teamById = new Map(teamInfoPayload.arrTeam.map((row) => [Number(row[0]), row]));

  return standings.map((row) => {
    const teamRow = teamById.get(Number(row.teamId));

    return {
      id: row.teamId ?? row.team,
      leagueSlug,
      sport: "basketball" as const,
      name: buildBasketballTeamName(teamRow) || row.team,
      shortName: buildBasketballTeamShortName(teamRow),
      ranking: row.rank,
      form: row.form ?? "--",
      homeRecord: row.homeRecord ?? "--",
      awayRecord: row.awayRecord ?? "--",
    } satisfies Team;
  });
}

function buildBasketballScheduleRows(fixtures: unknown[][], teamsById: Map<number, unknown[]>) {
  const now = Date.now();

  return fixtures
    .map((row) => {
      const kickoff = new Date(toStringValue(row[2]));
      const homeTeam = buildBasketballFixtureTeamName(Number(row[3] ?? 0), teamsById);
      const awayTeam = buildBasketballFixtureTeamName(Number(row[4] ?? 0), teamsById);
      const homeScore = toStringValue(row[5]);
      const awayScore = toStringValue(row[6]);
      const result = homeScore && awayScore ? `${homeScore} - ${awayScore}` : "-";
      const state = basketballStatusFromState(row[9]);
      const spread = toStringValue(row[10]);
      const total = toStringValue(row[11]);
      const noteParts = [
        state === "live" ? "Live" : "",
        spread ? `Spread ${spread}` : "",
        total ? `O/U ${total}` : "",
      ].filter(Boolean);

      return {
        id: toStringValue(row[0]),
        kickoff,
        schedule: {
          id: toStringValue(row[0]),
          date: `${pad(kickoff.getMonth() + 1)}-${pad(kickoff.getDate())}`,
          fixture: `${homeTeam} vs ${awayTeam}`,
          result,
          note: noteParts.join(" | ") || "League fixture",
        } satisfies ScheduleRow,
      };
    })
    .sort((left, right) => Math.abs(left.kickoff.getTime() - now) - Math.abs(right.kickoff.getTime() - now))
    .slice(0, 12)
    .map((item) => item.schedule);
}

function buildBasketballHeadToHead(
  fixtures: unknown[][],
  teamsById: Map<number, unknown[]>,
  standings: StandingRow[],
) {
  const topTwo = standings.slice(0, 2).map((row) => Number(row.teamId));
  const selected = fixtures
    .filter((row) => {
      const home = Number(row[3] ?? 0);
      const away = Number(row[4] ?? 0);
      const homeScore = toStringValue(row[5]);
      const awayScore = toStringValue(row[6]);

      return topTwo.length === 2 && topTwo.includes(home) && topTwo.includes(away) && homeScore && awayScore;
    })
    .sort((left, right) => new Date(toStringValue(right[2])).getTime() - new Date(toStringValue(left[2])).getTime())
    .slice(0, 5);

  const fallbackRows =
    selected.length > 0
      ? selected
      : fixtures
          .filter((row) => toStringValue(row[5]) && toStringValue(row[6]))
          .sort((left, right) => new Date(toStringValue(right[2])).getTime() - new Date(toStringValue(left[2])).getTime())
          .slice(0, 5);

  return fallbackRows.map((row) => ({
    season: toStringValue(row[2]).slice(0, 4),
    fixture: `${buildBasketballFixtureTeamName(Number(row[3] ?? 0), teamsById)} ${toStringValue(row[5])}-${toStringValue(row[6])} ${buildBasketballFixtureTeamName(Number(row[4] ?? 0), teamsById)}`,
    tag: selected.length > 0 ? "H2H" : "Recent",
  })) satisfies HeadToHeadRow[];
}

async function buildBasketballDatabaseSnapshot(league: ManualLeague): Promise<NowscoreDatabaseSnapshot> {
  const [payload, schedulePayload, teamInfoPayload] = await Promise.all([
    loadBasketballLeaguePayload(league.id),
    loadBasketballSchedulePayload(league.id),
    loadBasketballTeamInfoPayload(league.id),
  ]);
  const { standings } = mapBasketballStandings(payload, league.slug);
  const teams = buildBasketballTeams(standings, teamInfoPayload, league.slug);
  const teamById = new Map(teamInfoPayload.arrTeam.map((row) => [Number(row[0]), row]));
  const schedule = buildBasketballScheduleRows(schedulePayload.arrData, teamById);
  const h2h = buildBasketballHeadToHead(schedulePayload.arrData, teamById, standings);

  return {
    leagues: buildLeagueList("basketball"),
    standings,
    schedule,
    teams,
    h2h,
  };
}

export async function getNowscoreTrackedLeagues(sport: Sport) {
  return buildLeagueList(sport);
}

export async function getNowscoreMatchesBySport(sport: Sport): Promise<Match[]> {
  if (sport === "football") {
    const payload = await loadFootballLivePayload();
    return sortMatches(
      payload.matches
        .map((row) => mapFootballLiveMatch(payload.matchDate, payload.leagues, row))
        .filter((item): item is Match => item !== null),
    );
  }

  if (sport === "cricket" || sport === "esports") {
    return [];
  }

  const payload = await loadBasketballPayload();
  return sortMatches(
    payload.matches
      .map((row) => mapBasketballMatch(row, payload.oddsByMatchId))
      .filter((item): item is Match => item !== null),
  );
}

export async function getNowscoreMatchById(id: string): Promise<Match | undefined> {
  const [footballMatches, basketballMatches] = await Promise.all([
    getNowscoreMatchesBySport("football"),
    getNowscoreMatchesBySport("basketball"),
  ]);

  const footballMatch = footballMatches.find((match) => match.id === id);

  if (footballMatch) {
    try {
      return {
        ...footballMatch,
        odds: await fetchFootballMarketOdds(id),
      };
    } catch {
      return footballMatch;
    }
  }

  return basketballMatches.find((match) => match.id === id);
}

export async function getNowscoreDatabaseSnapshot(
  sport: Sport,
  leagueSlug: string,
): Promise<NowscoreDatabaseSnapshot | null> {
  if (sport === "basketball") {
    const league = LEAGUES_BY_SLUG.get(leagueSlug);

    if (!league || league.sport !== "basketball") {
      return null;
    }

    return buildBasketballDatabaseSnapshot(league);
  }

  if (sport !== "football") {
    return null;
  }

  const league = LEAGUES_BY_SLUG.get(leagueSlug);

  if (!league || league.sport !== "football" || !league.sclassType) {
    return null;
  }

  const payload = await loadFootballLeaguePayload(league.id, league.sclassType);
  const teamById = new Map(payload.arrTeam.map((row) => [Number(row[0]), row]));
  const { standings, teams, fixtures } = mapFootballStandings(payload, leagueSlug);

  return {
    leagues: buildLeagueList("football"),
    standings,
    schedule: buildFootballScheduleRows(fixtures, teamById),
    teams,
    h2h: buildFootballHeadToHead(fixtures, teamById, standings),
  };
}
