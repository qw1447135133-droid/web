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

export default async function BasketballLivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { livePageCopy, uiCopy } = getSiteCopy(displayLocale);
  const resolved = await searchParams;
  const league = pickValue(resolved.league, "all");
  const [allLeagues, allMatches] = await Promise.all([
    getTrackedLeagues("basketball", locale),
    getMatchesBySport("basketball", locale),
  ]);

  let items = allMatches;

  if (league !== "all") {
    items = items.filter((item) => item.leagueSlug === league);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={livePageCopy.basketball.eyebrow}
          title={livePageCopy.basketball.title}
          description={livePageCopy.basketball.description}
        />

        <form className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-end">
          <label className="flex-1 space-y-2 text-sm">
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
          <button
            type="submit"
            className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
          >
            {uiCopy.refresh}
          </button>
        </form>
      </section>

      <ScoreboardTable matches={items} sportLabel={livePageCopy.basketball.sportLabel} locale={displayLocale} />
    </div>
  );
}
