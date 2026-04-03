import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getCurrentLocale } from "@/lib/i18n";
import { getPredictions } from "@/lib/content-data";
import { getMatchById } from "@/lib/sports-data";
import { getSiteCopy } from "@/lib/ui-copy";

export default async function AiPredictionsPage() {
  const locale = await getCurrentLocale();
  const { aiPredictionsPageCopy } = getSiteCopy(locale);
  const predictions = await getPredictions(undefined, locale);
  const matches = await Promise.all(predictions.map((prediction) => getMatchById(prediction.matchId, locale)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={aiPredictionsPageCopy.heroEyebrow}
          title={aiPredictionsPageCopy.heroTitle}
          description={aiPredictionsPageCopy.heroDescription}
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{aiPredictionsPageCopy.hitRate30d}</p>
            <p className="mt-2 text-3xl font-semibold text-lime-100">62.8%</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{aiPredictionsPageCopy.avgEdge}</p>
            <p className="mt-2 text-3xl font-semibold text-orange-200">+4.8%</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{aiPredictionsPageCopy.explainableFactors}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiPredictionsPageCopy.explainableFactorCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {predictions.map((prediction, index) => {
          const match = matches[index];

          return (
            <article key={prediction.id} className="glass-panel rounded-[1.8rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-label">{prediction.market}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{prediction.pick}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {match?.homeTeam} vs {match?.awayTeam}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-lime-300/20 bg-lime-300/8 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-lime-100">{aiPredictionsPageCopy.confidence}</p>
                  <p className="mt-1 text-2xl font-semibold text-lime-100">{prediction.confidence}</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-300">{prediction.explanation}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {prediction.factors.map((factor) => (
                  <span key={factor} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {factor}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{aiPredictionsPageCopy.expectedEdge}</p>
                  <p className="mt-1 text-lg font-semibold text-orange-200">{prediction.expectedEdge}</p>
                </div>
                {match ? (
                  <Link
                    href={`/matches/${match.id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                  >
                    {aiPredictionsPageCopy.viewMatch}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
