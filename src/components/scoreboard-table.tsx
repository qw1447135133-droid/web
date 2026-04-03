import Link from "next/link";
import { formatDateTime, formatOdd } from "@/lib/format";
import type { Locale } from "@/lib/i18n-config";
import type { Match } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

const statusStyles = {
  live: "bg-orange-400/12 text-orange-200 border-orange-400/20",
  upcoming: "bg-sky-400/12 text-sky-200 border-sky-400/20",
  finished: "bg-white/8 text-slate-200 border-white/12",
};

export function ScoreboardTable({
  matches,
  sportLabel,
  locale,
}: {
  matches: Match[];
  sportLabel: string;
  locale: Locale;
}) {
  const { matchStatusLabels, uiCopy } = getSiteCopy(locale);
  const spreadLabel = locale === "en" ? "Spread" : locale === "zh-TW" ? "讓分" : "让分";
  const totalLabel = locale === "en" ? "Total" : locale === "zh-TW" ? "總分" : "总分";

  return (
    <div className="glass-panel overflow-hidden rounded-[2rem]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="section-label">Live Board</p>
          <h3 className="display-title text-2xl font-semibold text-white">
            {sportLabel} {uiCopy.instantBoard}
          </h3>
        </div>
        <p className="text-sm text-slate-400">{uiCopy.matchesLoaded(matches.length)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="table-scanlines min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-slate-300">
            <tr>
              <th className="px-5 py-3 font-medium">{uiCopy.fixtureKickoff}</th>
              <th className="px-5 py-3 font-medium">{uiCopy.matchup}</th>
              <th className="px-5 py-3 font-medium">{uiCopy.status}</th>
              <th className="px-5 py-3 font-medium">{uiCopy.oddsSummary}</th>
              <th className="px-5 py-3 font-medium">{uiCopy.dataSlice}</th>
              <th className="px-5 py-3 font-medium">{uiCopy.details}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-t border-white/6 align-top">
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">{match.leagueName ?? match.leagueSlug}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {formatDateTime(match.kickoff, locale)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-white">
                    {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{match.score}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusStyles[match.status]}`}>
                    {matchStatusLabels[match.status]}
                    {match.clock ? ` | ${match.clock}` : ""}
                  </span>
                  <p className="mt-3 max-w-xs text-xs leading-6 text-slate-400">{match.insight}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-white">
                    {formatOdd(match.odds.home)}
                    {match.odds.draw != null ? ` / ${formatOdd(match.odds.draw)}` : ""} / {formatOdd(match.odds.away)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {spreadLabel} {match.odds.spread} | {totalLabel} {match.odds.total}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="max-w-xs text-xs leading-6 text-slate-300">{match.statLine}</p>
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/matches/${match.id}`}
                    className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-xs text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                  >
                    {uiCopy.viewMatch}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
