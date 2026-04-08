"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import type { Match, MatchStatus } from "@/lib/types";

const LOOP_GAP_PX = 12;
const MIN_SCROLL_RANGE_PX = 24;
const STEP_INTERVAL_MS = 2600;
const RESET_DELAY_MS = 520;

function getLoopGroupCount(matchCount: number) {
  if (matchCount <= 0) {
    return 0;
  }

  if (matchCount === 1) {
    return 6;
  }

  if (matchCount === 2) {
    return 5;
  }

  if (matchCount === 3) {
    return 4;
  }

  return 3;
}

export function HomepageCommandFeed({
  title,
  matches,
  matchStatusLabels,
  locale,
}: {
  title: string;
  matches: Match[];
  matchStatusLabels: Record<MatchStatus, string>;
  locale: DisplayLocale;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const firstGroupRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const loopGroupCount = getLoopGroupCount(matches.length);
  const loopGroups = Array.from({ length: loopGroupCount }, (_, index) => index);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const sibling = root.previousElementSibling;

    if (!(sibling instanceof HTMLElement)) {
      return;
    }

    const syncHeight = () => {
      if (!desktopQuery.matches) {
        setPanelHeight(null);
        return;
      }

      const firstChild = sibling.firstElementChild;
      const lastChild = sibling.lastElementChild;

      if (firstChild instanceof HTMLElement && lastChild instanceof HTMLElement) {
        const firstRect = firstChild.getBoundingClientRect();
        const lastRect = lastChild.getBoundingClientRect();
        setPanelHeight(Math.round(lastRect.bottom - firstRect.top));
        return;
      }

      setPanelHeight(Math.round(sibling.getBoundingClientRect().height));
    };

    syncHeight();

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncHeight);

    resizeObserver?.observe(sibling);
    window.addEventListener("resize", syncHeight);
    desktopQuery.addEventListener?.("change", syncHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncHeight);
      desktopQuery.removeEventListener?.("change", syncHeight);
    };
  }, [matches.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const firstGroup = firstGroupRef.current;

    if (!scroller || !firstGroup || matches.length === 0) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) {
      return;
    }

    let timerId = 0;
    let resetTimerId = 0;
    let currentIndex = 0;

    const getLoopHeight = () => {
      if (!firstGroupRef.current) {
        return 0;
      }

      return firstGroupRef.current.getBoundingClientRect().height + LOOP_GAP_PX;
    };

    const advance = () => {
      const currentScroller = scrollerRef.current;
      const currentGroup = firstGroupRef.current;

      if (!currentScroller || !currentGroup) {
        return;
      }

      const loopHeight = getLoopHeight();
      const maxScroll = Math.max(currentScroller.scrollHeight - currentScroller.clientHeight, 0);

      if (maxScroll > MIN_SCROLL_RANGE_PX && !pausedRef.current) {
        const offsets = Array.from(currentGroup.children)
          .map((child) => (child instanceof HTMLElement ? child.offsetTop : 0));

        if (offsets.length > 0) {
          if (currentIndex >= offsets.length - 1) {
            currentScroller.scrollTo({ top: loopHeight, behavior: "smooth" });
            resetTimerId = window.setTimeout(() => {
              const activeScroller = scrollerRef.current;

              if (!activeScroller) {
                return;
              }

              activeScroller.scrollTo({ top: 0, behavior: "auto" });
              currentIndex = 0;
            }, RESET_DELAY_MS);
          } else {
            currentIndex += 1;
            currentScroller.scrollTo({ top: offsets[currentIndex], behavior: "smooth" });
          }
        }
      } else if (maxScroll <= MIN_SCROLL_RANGE_PX && currentScroller.scrollTop !== 0) {
        currentScroller.scrollTop = 0;
        currentIndex = 0;
      }

      timerId = window.setTimeout(advance, STEP_INTERVAL_MS);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const currentScroller = scrollerRef.current;
            const loopHeight = getLoopHeight();

            if (!currentScroller || loopHeight <= 0) {
              return;
            }

            if (currentScroller.scrollTop >= loopHeight) {
              currentScroller.scrollTop %= loopHeight;
            }
          });

    resizeObserver?.observe(scroller);
    resizeObserver?.observe(firstGroup);
    timerId = window.setTimeout(advance, STEP_INTERVAL_MS);

    return () => {
      window.clearTimeout(timerId);
      window.clearTimeout(resetTimerId);
      resizeObserver?.disconnect();
    };
  }, [matches, loopGroupCount]);

  const renderMatchCard = (match: Match, key: string) => (
    <Link
      key={key}
      href={`/matches/${encodeURIComponent(match.id)}`}
      className="block rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-3.5 py-3 transition hover:border-orange-300/25 hover:bg-white/[0.07] lg:px-4 lg:py-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label">{match.leagueName ?? match.leagueSlug}</p>
          <div className="mt-2.5 space-y-1.5">
            <p className="break-keep text-[15px] leading-6 font-semibold text-white">
              {match.homeTeam}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">vs</p>
            <p className="break-keep text-[15px] leading-6 font-semibold text-slate-100">
              {match.awayTeam}
            </p>
          </div>
        </div>
        <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full border border-white/12 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
          {matchStatusLabels[match.status]}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="whitespace-nowrap text-[2.15rem] leading-none font-semibold tracking-[-0.04em] text-orange-200">
          {match.score}
        </p>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-[11px] leading-5 text-slate-500">
            {match.clock ? match.clock : formatDateTime(match.kickoff, locale)}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-300 lg:overflow-hidden lg:[display:-webkit-box] lg:[-webkit-box-orient:vertical] lg:[-webkit-line-clamp:2]">
        {match.statLine}
      </p>
    </Link>
  );

  return (
    <div
      ref={rootRef}
      className="relative glass-panel rounded-[1.9rem] p-5 lg:flex lg:flex-col lg:overflow-hidden"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <p className="section-label">{title}</p>
      <div className="relative mt-4 lg:min-h-0 lg:flex-1">
        <div
          ref={scrollerRef}
          className="no-scrollbar relative lg:h-full lg:overflow-y-auto lg:pr-1"
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              pausedRef.current = false;
            }
          }}
        >
          {loopGroups.length > 0 ? (
            loopGroups.map((groupIndex) => (
              <div
                key={`homepage-command-cycle-${groupIndex}`}
                ref={groupIndex === 0 ? firstGroupRef : null}
                className={groupIndex === 0 ? "space-y-3" : "mt-3 space-y-3"}
              >
                {matches.map((match, matchIndex) =>
                  renderMatchCard(match, `${groupIndex}-${match.id}-${matchIndex}`),
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
              {locale === "en"
                ? "No featured matches are available right now."
                : locale === "zh-TW"
                  ? "目前沒有可展示的焦點賽事。"
                  : locale === "th"
                    ? "ขณะนี้ยังไม่มีแมตช์เด่น"
                    : locale === "vi"
                      ? "Hiện chưa có trận nổi bật"
                      : locale === "hi"
                        ? "अभी कोई फीचर्ड मैच उपलब्ध नहीं है。"
                        : "当前没有可展示的焦点赛事。"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
