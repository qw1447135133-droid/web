"use client";

import { useEffect, useState } from "react";
import type { DisplayLocale } from "@/lib/i18n-config";

type MatchScore = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoff: string;
  leagueName: string;
  lastSyncedAt: string | null;
};

const statusLabels: Record<string, Record<DisplayLocale, string>> = {
  live: { "zh-CN": "进行中", "zh-TW": "進行中", en: "Live", th: "กำลังแข่ง", vi: "Đang diễn ra", hi: "Live" },
  finished: { "zh-CN": "已结束", "zh-TW": "已結束", en: "FT", th: "จบแล้ว", vi: "Kết thúc", hi: "FT" },
  scheduled: { "zh-CN": "未开始", "zh-TW": "未開始", en: "Upcoming", th: "กำลังจะมา", vi: "Sắp diễn ra", hi: "Upcoming" },
};

export function LiveScoreboard({ locale, initialMatches }: { locale: DisplayLocale; initialMatches: MatchScore[] }) {
  const [matches, setMatches] = useState(initialMatches);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/public/matches/live?locale=${locale}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json() as MatchScore[];
          setMatches(data);
          setStale(false);
        } else {
          setStale(true);
        }
      } catch {
        setStale(true);
      }
    };

    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [locale]);

  if (matches.length === 0) {
    return (
      <p className="text-slate-400">
        {locale === "vi" ? "Không có trận đấu nào." : locale === "th" ? "ไม่มีการแข่งขัน" : "No matches today."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stale && (
        <p className="text-xs text-amber-500">
          {locale === "vi" ? "Dữ liệu có thể bị trễ" : locale === "th" ? "ข้อมูลอาจล่าช้า" : "数据可能有延迟"}
        </p>
      )}
      {matches.map((m) => {
        const statusLabel = statusLabels[m.status]?.[locale] ?? m.status;
        return (
          <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">{m.leagueName}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">{m.homeTeamName}</span>
              <span className="mx-3 text-lg font-bold text-white">
                {m.homeScore != null && m.awayScore != null ? `${m.homeScore} - ${m.awayScore}` : "vs"}
              </span>
              <span className="text-sm font-medium text-white">{m.awayTeamName}</span>
            </div>
            <p className={`mt-1 text-center text-xs ${m.status === "live" ? "text-green-400" : "text-slate-500"}`}>
              {statusLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
