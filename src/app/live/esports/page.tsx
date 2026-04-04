import Link from "next/link";
import { ScoreboardTable } from "@/components/scoreboard-table";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type EsportsGame = "all" | "lol" | "dota2" | "cs2";

function pickValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function resolveEsportsGame(leagueSlug: string): Exclude<EsportsGame, "all"> {
  if (leagueSlug === "lpl") {
    return "lol";
  }

  if (leagueSlug === "dreamleague") {
    return "dota2";
  }

  return "cs2";
}

function getEsportsPageCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      gameFilter: "Game",
      gameOptions: {
        all: "All circuits",
        lol: "LoL",
        dota2: "Dota 2",
        cs2: "CS2",
      },
      liveSeries: "Live series",
      coveredLeagues: "Leagues covered",
      featuredTitle: "Priority matches",
      featuredDescription: "Keep the highest-attention series close to the top so users can jump from the board into the match detail flow faster.",
      noPriority: "No esports matches are available for priority display right now.",
      circuitTitle: "Circuit split",
      circuitDescription: "Break the board into LoL, Dota 2, and CS2 so the esports entry feels like a real multi-title command surface.",
      mapsLabel: "Map / series state",
      viewMatch: "Open match",
    };
  }

  if (locale === "zh-TW") {
    return {
      gameFilter: "項目",
      gameOptions: {
        all: "全部賽道",
        lol: "LoL",
        dota2: "Dota 2",
        cs2: "CS2",
      },
      liveSeries: "進行中系列賽",
      coveredLeagues: "已覆蓋聯賽",
      featuredTitle: "重點場次",
      featuredDescription: "把最值得先看的系列賽維持在版面前列，讓使用者可以從比分面板快速進入詳情頁。",
      noPriority: "目前沒有可優先展示的電競比賽。",
      circuitTitle: "賽道分佈",
      circuitDescription: "把 LoL、Dota 2、CS2 三條賽道拆開展示，讓電競入口更像真正的多項目指揮面板。",
      mapsLabel: "地圖 / 系列賽狀態",
      viewMatch: "查看比賽",
    };
  }

  if (locale === "th") {
    return {
      gameFilter: "เกม",
      gameOptions: {
        all: "ทุกสาย",
        lol: "LoL",
        dota2: "Dota 2",
        cs2: "CS2",
      },
      liveSeries: "ซีรีส์กำลังแข่ง",
      coveredLeagues: "ลีกที่รองรับ",
      featuredTitle: "แมตช์สำคัญ",
      featuredDescription: "ดันซีรีส์ที่ต้องดูไว้ด้านบน เพื่อให้ผู้ใช้เข้าจากบอร์ดไปยังหน้ารายละเอียดได้เร็วขึ้น",
      noPriority: "ตอนนี้ยังไม่มีแมตช์อีสปอร์ตสำหรับ priority display",
      circuitTitle: "ภาพรวมแต่ละเกม",
      circuitDescription: "แยก LoL, Dota 2 และ CS2 ออกจากกัน เพื่อให้ทางเข้าอีสปอร์ตเป็นพื้นผิวหลายเกมจริง",
      mapsLabel: "สถานะแผนที่ / ซีรีส์",
      viewMatch: "ดูแมตช์",
    };
  }

  if (locale === "vi") {
    return {
      gameFilter: "Game",
      gameOptions: {
        all: "Tat ca nhanh",
        lol: "LoL",
        dota2: "Dota 2",
        cs2: "CS2",
      },
      liveSeries: "Series dang live",
      coveredLeagues: "Giai da phu",
      featuredTitle: "Tran uu tien",
      featuredDescription: "Giu cac series duoc chu y nhieu nhat o dau trang de nguoi dung vao detail nhanh hon.",
      noPriority: "Hien chua co tran esports nao duoc uu tien hien thi.",
      circuitTitle: "Phan lop game",
      circuitDescription: "Tach LoL, Dota 2 va CS2 de kenh esports thuc su giong mot be mat da tua game.",
      mapsLabel: "Trang thai map / series",
      viewMatch: "Mo tran",
    };
  }

  if (locale === "hi") {
    return {
      gameFilter: "Game",
      gameOptions: {
        all: "Sabhi circuits",
        lol: "LoL",
        dota2: "Dota 2",
        cs2: "CS2",
      },
      liveSeries: "Live series",
      coveredLeagues: "Covered leagues",
      featuredTitle: "Priority matches",
      featuredDescription: "High-attention series ko top ke paas rakhein taaki users board se match detail tak jaldi pahunch sakein.",
      noPriority: "Abhi priority display ke liye koi esports match nahin hai.",
      circuitTitle: "Circuit split",
      circuitDescription: "LoL, Dota 2, aur CS2 ko alag dikhaiye taaki esports entry ek real multi-title command surface lage.",
      mapsLabel: "Map / series state",
      viewMatch: "Open match",
    };
  }

  return {
    gameFilter: "项目",
    gameOptions: {
      all: "全部赛道",
      lol: "LoL",
      dota2: "Dota 2",
      cs2: "CS2",
    },
    liveSeries: "进行中系列赛",
    coveredLeagues: "已覆盖联赛",
    featuredTitle: "重点场次",
    featuredDescription: "把最值得先看的系列赛保持在版面前列，让用户可以从比分面板快速进入详情页。",
    noPriority: "当前没有可优先展示的电竞比赛。",
    circuitTitle: "赛道分布",
    circuitDescription: "把 LoL、Dota 2、CS2 三条赛道拆开展示，让电竞入口更像真正的多项目指挥面板。",
    mapsLabel: "地图 / 系列赛状态",
    viewMatch: "查看比赛",
  };
}

export default async function EsportsLivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { livePageCopy, matchStatusLabels, uiCopy } = getSiteCopy(displayLocale);
  const esportsPageCopy = getEsportsPageCopy(displayLocale);
  const resolved = await searchParams;
  const league = pickValue(resolved.league, "all");
  const status = pickValue(resolved.status, "all");
  const sort = pickValue(resolved.sort, "time");
  const game = pickValue(resolved.game, "all") as EsportsGame;

  const [allLeagues, allMatches] = await Promise.all([
    getTrackedLeagues("esports", locale),
    getMatchesBySport("esports", locale),
  ]);

  let items = allMatches;

  if (game !== "all") {
    items = items.filter((item) => resolveEsportsGame(item.leagueSlug) === game);
  }

  if (league !== "all") {
    items = items.filter((item) => item.leagueSlug === league);
  }

  if (status !== "all") {
    items = items.filter((item) => item.status === status);
  }

  items = [...items].sort((left, right) => {
    if (sort === "league") {
      return left.leagueSlug.localeCompare(right.leagueSlug, displayLocale);
    }

    return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
  });

  const featuredMatches = items.slice(0, 3);
  const liveSeriesCount = items.filter((item) => item.status === "live").length;
  const circuitCards = (["lol", "dota2", "cs2"] as const).map((key) => {
    const matches = allMatches.filter((item) => resolveEsportsGame(item.leagueSlug) === key);
    const liveCount = matches.filter((item) => item.status === "live").length;

    return {
      key,
      label: esportsPageCopy.gameOptions[key],
      total: matches.length,
      live: liveCount,
      leadLeague: allLeagues.find((item) => resolveEsportsGame(item.slug) === key)?.name ?? esportsPageCopy.gameOptions[key],
    };
  });
  const featuredEyebrow =
    displayLocale === "zh-TW"
      ? "重點隊列"
      : displayLocale === "th"
        ? "คิวสำคัญ"
        : displayLocale === "vi"
          ? "Hang doi uu tien"
          : displayLocale === "hi"
            ? "प्राथमिक कतार"
            : displayLocale === "en"
              ? "Priority Queue"
              : "重点队列";
  const circuitEyebrow =
    displayLocale === "zh-TW"
      ? "賽道層"
      : displayLocale === "th"
        ? "เลเยอร์เกม"
        : displayLocale === "vi"
          ? "Lop game"
          : displayLocale === "hi"
            ? "गेम लेयर"
            : displayLocale === "en"
              ? "Circuit Layer"
              : "赛道层";
  const circuitCardDescription =
    displayLocale === "zh-TW"
      ? "目前已作為此頁的獨立賽道，承接即時系列賽、賽程狀態與詳情入口。"
      : displayLocale === "th"
        ? "กำลังป้อนเส้นทางนี้ด้วยซีรีส์สด สถานะตารางแข่ง และทางเข้าหน้ารายละเอียดแมตช์"
        : displayLocale === "vi"
          ? "dang cap du lieu cho route nay voi series live, trang thai lich thi dau va loi vao match detail."
          : displayLocale === "hi"
            ? "यह रूट अभी लाइव सीरीज़, शेड्यूल स्थिति और मैच डिटेल एंट्री को फीड कर रहा है।"
            : displayLocale === "en"
              ? "currently feeds this route with live series, schedule state, and match detail entry points."
              : "目前已作为此页的独立赛道，承接即时系列赛、赛程状态与详情入口。";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={livePageCopy.esports.eyebrow}
          title={livePageCopy.esports.title}
          description={livePageCopy.esports.description}
        />

        <form className="mt-6 grid gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 lg:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{esportsPageCopy.gameFilter}</span>
            <select
              name="game"
              defaultValue={game}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{esportsPageCopy.gameOptions.all}</option>
              <option value="lol">{esportsPageCopy.gameOptions.lol}</option>
              <option value="dota2">{esportsPageCopy.gameOptions.dota2}</option>
              <option value="cs2">{esportsPageCopy.gameOptions.cs2}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.filterLeague}</span>
            <select
              name="league"
              defaultValue={league}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{uiCopy.allLeagues}</option>
              {allLeagues
                .filter((item) => game === "all" || resolveEsportsGame(item.slug) === game)
                .map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.filterStatus}</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{uiCopy.allStatuses}</option>
              <option value="upcoming">{matchStatusLabels.upcoming}</option>
              <option value="live">{matchStatusLabels.live}</option>
              <option value="finished">{matchStatusLabels.finished}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.sortMode}</span>
            <div className="flex gap-3">
              <select
                name="sort"
                defaultValue={sort}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              >
                <option value="time">{uiCopy.sortByTime}</option>
                <option value="league">{uiCopy.sortByLeague}</option>
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {uiCopy.refresh}
              </button>
            </div>
          </label>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">{esportsPageCopy.liveSeries}</p>
            <p className="mt-3 text-4xl font-semibold text-orange-200">{liveSeriesCount}</p>
          </div>
          <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">{esportsPageCopy.coveredLeagues}</p>
            <p className="mt-3 text-4xl font-semibold text-lime-100">{allLeagues.length}</p>
          </div>
          {circuitCards.slice(0, 2).map((card) => (
            <div key={card.key} className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{card.total}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                {card.leadLeague} | {card.live} {matchStatusLabels.live}
              </p>
            </div>
          ))}
        </div>
      </section>

      <ScoreboardTable matches={items} sportLabel={livePageCopy.esports.sportLabel} locale={displayLocale} />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={featuredEyebrow}
            title={esportsPageCopy.featuredTitle}
            description={esportsPageCopy.featuredDescription}
          />
          {featuredMatches.length === 0 ? (
            <p className="mt-6 rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
              {esportsPageCopy.noPriority}
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {featuredMatches.map((match) => (
                <div key={match.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="section-label">{match.leagueName ?? match.leagueSlug}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {matchStatusLabels[match.status]}
                      {match.clock ? ` | ${match.clock}` : ""}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span>{formatDateTime(match.kickoff, displayLocale)}</span>
                    <span>{esportsPageCopy.mapsLabel}</span>
                    <span>{match.score}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{match.statLine}</p>
                  <div className="mt-4">
                    <Link
                      href={`/matches/${match.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                    >
                      {esportsPageCopy.viewMatch}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={circuitEyebrow}
            title={esportsPageCopy.circuitTitle}
            description={esportsPageCopy.circuitDescription}
          />
          <div className="mt-6 grid gap-4">
            {circuitCards.map((card) => (
              <div key={card.key} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-label">{card.leadLeague}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{card.label}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {card.total} / {card.live}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {card.label} {circuitCardDescription}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
