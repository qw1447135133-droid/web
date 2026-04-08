"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resolveRenderLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";
import type { HomepageBanner } from "@/lib/types";

const themeStyles: Record<
  HomepageBanner["theme"],
  { glow: string; chip: string; card: string; primaryPosition: string; secondaryPosition: string }
> = {
  sunrise: {
    glow: "from-orange-400/35 via-orange-500/10 to-amber-200/5",
    chip: "border-orange-300/30 bg-orange-300/10 text-orange-100",
    card: "hover:border-orange-300/35 hover:bg-orange-300/10",
    primaryPosition: "center 30%",
    secondaryPosition: "center 24%",
  },
  field: {
    glow: "from-lime-300/30 via-emerald-400/8 to-cyan-300/5",
    chip: "border-lime-300/30 bg-lime-300/10 text-lime-100",
    card: "hover:border-lime-300/35 hover:bg-lime-300/10",
    primaryPosition: "center 24%",
    secondaryPosition: "center 20%",
  },
  midnight: {
    glow: "from-sky-300/30 via-indigo-400/10 to-fuchsia-300/5",
    chip: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    card: "hover:border-sky-300/35 hover:bg-sky-300/10",
    primaryPosition: "center 22%",
    secondaryPosition: "center 18%",
  },
};

const localeCopy = {
  "zh-CN": {
    deckLabel: "首页焦点 Banner",
    slideLabel: (current: number, total: number) => `${current} / ${total}`,
    jumpTo: (index: number) => `切换到第 ${index} 条 Banner`,
    nextUp: "候补焦点",
  },
  "zh-TW": {
    deckLabel: "首頁焦點 Banner",
    slideLabel: (current: number, total: number) => `${current} / ${total}`,
    jumpTo: (index: number) => `切換到第 ${index} 條 Banner`,
    nextUp: "候補焦點",
  },
  en: {
    deckLabel: "Hero banner deck",
    slideLabel: (current: number, total: number) => `${current} / ${total}`,
    jumpTo: (index: number) => `Show banner ${index}`,
    nextUp: "Up next",
  },
} as const;

export function HomepageBannerShowcase({
  initialBanners,
  locale,
}: {
  initialBanners: HomepageBanner[];
  locale: Locale | DisplayLocale;
}) {
  const renderLocale = resolveRenderLocale(locale as DisplayLocale);
  const [banners, setBanners] = useState(initialBanners);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const showcaseRef = useRef<HTMLDivElement | null>(null);
  const copy = localeCopy[renderLocale];
  const primaryBanner = banners[activeIndex] ?? banners[0];
  const secondaryBanners = banners
    .map((banner, index) => ({ banner, index }))
    .filter((item) => item.index !== activeIndex)
    .slice(0, 2);

  function trackBannerEvent(
    bannerId: string,
    type: "impression" | "click",
    placement: "primary" | "secondary",
  ) {
    void fetch("/api/site/banners/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bannerId,
        type,
        placement,
      }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {
      // Analytics failures should never block browsing.
    });
  }

  useEffect(() => {
    let disposed = false;

    async function syncBanners() {
      try {
        const response = await fetch(`/api/site/banners?locale=${locale}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { banners?: HomepageBanner[] };

        if (!disposed && payload.banners?.length) {
          const nextBanners = payload.banners;
          setBanners(nextBanners);
          setActiveIndex((current) => Math.min(current, Math.max(nextBanners.length - 1, 0)));
        }
      } catch {
        // Keep server-rendered banners when refresh fails.
      }
    }

    void syncBanners();

    return () => {
      disposed = true;
    };
  }, [locale]);

  useEffect(() => {
    trackedImpressions.current.clear();
  }, [initialBanners]);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (banners.length <= 1) {
          return 0;
        }

        return (current + 1) % banners.length;
      });
    }, 7000);

    return () => {
      window.clearInterval(timer);
    };
  }, [banners.length, isPaused]);

  useEffect(() => {
    const root = showcaseRef.current;

    if (!root) {
      return;
    }

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-banner-id]"),
    );

    if (typeof IntersectionObserver === "undefined") {
      for (const element of elements) {
        const bannerId = element.dataset.bannerId;
        const placement = element.dataset.bannerPlacement;
        const trackingKey = bannerId && placement ? `${bannerId}:${placement}` : "";

        if (!bannerId || placement !== "primary" && placement !== "secondary" || trackedImpressions.current.has(trackingKey)) {
          continue;
        }

        trackedImpressions.current.add(trackingKey);
        trackBannerEvent(bannerId, "impression", placement);
      }

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) {
            continue;
          }

          const bannerId = (entry.target as HTMLElement).dataset.bannerId;
          const placement = (entry.target as HTMLElement).dataset.bannerPlacement;
          const trackingKey = bannerId && placement ? `${bannerId}:${placement}` : "";

          if (
            !bannerId ||
            (placement !== "primary" && placement !== "secondary") ||
            trackedImpressions.current.has(trackingKey)
          ) {
            continue;
          }

          trackedImpressions.current.add(trackingKey);
          trackBannerEvent(bannerId, "impression", placement);
        }
      },
      {
        threshold: [0.55],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [primaryBanner?.id, secondaryBanners]);

  if (!primaryBanner) {
    return null;
  }

  const primaryTheme = themeStyles[primaryBanner.theme];

  return (
    <div ref={showcaseRef} className="space-y-5">
      <div
        data-banner-id={primaryBanner.id}
        data-banner-placement="primary"
        className="relative aspect-[6/5] min-h-[26rem] overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:aspect-[16/10] sm:min-h-[28rem] sm:p-8 lg:aspect-[16/8.6] lg:min-h-[30rem]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          backgroundImage: `linear-gradient(108deg, rgba(2, 8, 18, 0.96) 0%, rgba(5, 16, 26, 0.88) 48%, rgba(6, 17, 27, 0.66) 100%), url(${primaryBanner.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: primaryTheme.primaryPosition,
        }}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${primaryTheme.glow}`} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,12,20,0.32)_0%,rgba(5,12,20,0.18)_42%,rgba(5,12,20,0.04)_100%)]" />
        <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-orange-300/10 blur-3xl" />

        <div className="relative flex h-full max-w-3xl flex-col">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.28em] ${primaryTheme.chip}`}>
            {primaryBanner.subtitle}
          </span>
          <h1 className="display-title mt-5 max-w-4xl text-5xl leading-none font-semibold text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
            {primaryBanner.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-50/95 drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)] sm:text-lg">
            {primaryBanner.description}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={primaryBanner.href}
              onClick={() => trackBannerEvent(primaryBanner.id, "click", "primary")}
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/96 px-5 py-3 text-sm font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:border-orange-100 hover:bg-orange-100"
              style={{ color: "#08131f" }}
            >
              {primaryBanner.ctaLabel}
            </Link>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">{copy.deckLabel}</p>
              <p className="mt-2 text-sm font-medium text-white">
                {copy.slideLabel(activeIndex + 1, banners.length)}
              </p>
            </div>
            {banners.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={copy.jumpTo(index + 1)}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition ${
                      index === activeIndex ? "w-10 bg-white shadow-[0_0_14px_rgba(255,255,255,0.22)]" : "w-2.5 bg-white/40 hover:bg-white/68"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {secondaryBanners.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {secondaryBanners.map(({ banner, index }) => {
            const style = themeStyles[banner.theme];

            return (
              <Link
                key={banner.id}
                data-banner-id={banner.id}
                data-banner-placement="secondary"
                href={banner.href}
                onClick={() => trackBannerEvent(banner.id, "click", "secondary")}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => {
                  setIsPaused(true);
                  setActiveIndex(index);
                }}
                onBlur={() => setIsPaused(false)}
                className={`group relative flex min-h-[17rem] overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 transition md:h-full ${style.card}`}
                style={{
                  backgroundImage: `linear-gradient(128deg, rgba(2, 8, 18, 0.95) 0%, rgba(6, 17, 27, 0.86) 62%, rgba(6, 17, 27, 0.72) 100%), url(${banner.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: style.secondaryPosition,
                }}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.glow}`} />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,20,0.08)_0%,rgba(5,12,20,0.22)_100%)]" />
                <div className="relative flex h-full flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-200">
                      {copy.nextUp}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${style.chip}`}>
                      {banner.subtitle}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]">{banner.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-100/92">{banner.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <p className="text-sm font-semibold text-white transition group-hover:text-white">
                      {banner.ctaLabel}
                    </p>
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-300">
                      {copy.slideLabel(index + 1, banners.length)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
