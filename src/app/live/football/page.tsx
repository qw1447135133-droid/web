import { ScoreboardTable } from "@/components/scoreboard-table";
import { SectionHeading } from "@/components/section-heading";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function FootballLivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { livePageCopy, matchStatusLabels, uiCopy } = getSiteCopy(displayLocale);
  const resolved = await searchParams;
  const league = pickValue(resolved.league, "all");
  const status = pickValue(resolved.status, "all");
  const sort = pickValue(resolved.sort, "time");
  const [allLeagues, allMatches] = await Promise.all([
    getTrackedLeagues("football", locale),
    getMatchesBySport("football", locale),
  ]);

  let items = allMatches;

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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={livePageCopy.football.eyebrow}
          title={livePageCopy.football.title}
          description={livePageCopy.football.description}
        />

        <form className="mt-6 grid gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{uiCopy.filterLeague}</span>
            <select
              name="league"
              defaultValue={league}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="all">{uiCopy.allLeagues}</option>
              {allLeagues.map((item) => (
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
      </section>

      <ScoreboardTable matches={items} sportLabel={livePageCopy.football.sportLabel} locale={displayLocale} />
    </div>
  );
}
