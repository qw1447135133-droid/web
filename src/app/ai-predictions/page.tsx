import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getPredictions } from "@/lib/content-data";
import { getMatchById } from "@/lib/sports-data";
import type { Sport } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PredictionSportFilter = Sport | "all";

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getPredictionFilterCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      filterLabel: "Sport lane",
      all: "All",
      football: "Football",
      basketball: "Basketball",
      cricket: "Cricket",
      esports: "Esports",
      totalCards: "Predictions loaded",
      channelHint: "Use the sport channel to focus the AI board on a single content lane.",
      empty: "No AI predictions are available in this channel yet.",
    };
  }

  if (locale === "zh-TW") {
    return {
      filterLabel: "賽道",
      all: "全部",
      football: "足球",
      basketball: "籃球",
      cricket: "板球",
      esports: "電競",
      totalCards: "已載入預測",
      channelHint: "可按賽道切換 AI 預測面板，集中查看單一內容線。",
      empty: "目前這條賽道還沒有可顯示的 AI 預測。",
    };
  }

  if (locale === "th") {
    return {
      filterLabel: "ประเภทกีฬา",
      all: "ทั้งหมด",
      football: "ฟุตบอล",
      basketball: "บาสเกตบอล",
      cricket: "คริกเก็ต",
      esports: "อีสปอร์ต",
      totalCards: "จำนวนการคาดการณ์",
      channelHint: "เลือกกีฬาเพื่อโฟกัสกระดาน AI ในหมวดเดียว",
      empty: "ยังไม่มี AI prediction ในหมวดนี้",
    };
  }

  if (locale === "vi") {
    return {
      filterLabel: "Nhanh mon",
      all: "Tat ca",
      football: "Bong da",
      basketball: "Bong ro",
      cricket: "Cricket",
      esports: "Esports",
      totalCards: "So du doan",
      channelHint: "Dung bo loc mon de tap trung bang AI vao mot nhanh noi dung.",
      empty: "Chua co du doan AI nao trong kenh nay.",
    };
  }

  if (locale === "hi") {
    return {
      filterLabel: "Sport lane",
      all: "Sabhi",
      football: "Football",
      basketball: "Basketball",
      cricket: "Cricket",
      esports: "Esports",
      totalCards: "Loaded predictions",
      channelHint: "AI board ko ek content lane par focus karne ke liye sport filter use karein.",
      empty: "Is channel mein abhi koi AI prediction nahin hai.",
    };
  }

  return {
    filterLabel: "赛道",
    all: "全部",
    football: "足球",
    basketball: "篮球",
    cricket: "板球",
    esports: "电竞",
    totalCards: "已载入预测",
    channelHint: "可按赛道切换 AI 预测面板，集中查看单一内容线。",
    empty: "当前这条赛道还没有可显示的 AI 预测。",
  };
}

function buildFilterHref(sport: PredictionSportFilter) {
  return sport === "all" ? "/ai-predictions" : `/ai-predictions?sport=${sport}`;
}

export default async function AiPredictionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { aiPredictionsPageCopy } = getSiteCopy(displayLocale);
  const filterCopy = getPredictionFilterCopy(displayLocale);
  const resolved = await searchParams;
  const selectedSport = readValue(resolved.sport, "all") as PredictionSportFilter;
  const sport = selectedSport === "all" ? undefined : selectedSport;
  const predictions = await getPredictions(sport, locale);
  const matches = await Promise.all(predictions.map((prediction) => getMatchById(prediction.matchId, locale)));
  const sportOptions: PredictionSportFilter[] = ["all", "football", "basketball", "cricket", "esports"];
  const loadedPredictionCount = predictions.length.toString().padStart(2, "0");

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
            <p className="text-sm text-slate-500">{filterCopy.totalCards}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{loadedPredictionCount}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-400">{filterCopy.filterLabel}</p>
            {sportOptions.map((option) => {
              const label = filterCopy[option];
              const active = selectedSport === option;

              return (
                <Link
                  key={option}
                  href={buildFilterHref(option)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-orange-300/40 bg-orange-300/12 text-orange-100"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-slate-400">{filterCopy.channelHint}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {predictions.length === 0 ? (
          <div className="glass-panel rounded-[1.8rem] border border-dashed border-white/12 p-6 text-sm text-slate-400 lg:col-span-2">
            {filterCopy.empty}
          </div>
        ) : (
          predictions.map((prediction, index) => {
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
          })
        )}
      </section>
    </div>
  );
}
