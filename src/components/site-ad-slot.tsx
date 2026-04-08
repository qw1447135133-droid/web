"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { DisplayLocale } from "@/lib/i18n-config";
import type { SiteAd } from "@/lib/types";

const themeClassMap: Record<NonNullable<SiteAd["theme"]>, string> = {
  neutral: "border-white/10 bg-white/[0.03]",
  highlight: "border-orange-300/20 bg-orange-300/10",
  premium: "border-sky-300/20 bg-sky-300/10",
};

function trackAdEvent(adId: string, type: "impression" | "click") {
  void fetch("/api/site/ads/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adId,
      type,
    }),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Ad analytics should never interrupt browsing.
  });
}

function getSectionCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      eyebrow: "Sponsored entry",
      open: "Open",
    };
  }

  if (locale === "zh-TW") {
    return {
      eyebrow: "推薦入口",
      open: "查看",
    };
  }

  if (locale === "th") {
    return {
      eyebrow: "ทางเข้าแนะนำ",
      open: "เปิด",
    };
  }

  if (locale === "vi") {
    return {
      eyebrow: "Loi vao de xuat",
      open: "Mo",
    };
  }

  if (locale === "hi") {
    return {
      eyebrow: "推荐入口",
      open: "Open",
    };
  }

  return {
    eyebrow: "推荐入口",
    open: "查看",
  };
}

function SiteAdCard({
  ad,
  locale,
}: {
  ad: SiteAd;
  locale: DisplayLocale;
}) {
  const surfaceClass = themeClassMap[ad.theme ?? "neutral"];

  const content = (
    <div className={`overflow-hidden rounded-[1.5rem] border p-5 transition hover:border-white/20 ${surfaceClass}`}>
      {ad.imageUrl ? (
        <div
          className="h-32 rounded-[1.1rem] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(135deg, rgba(2,6,23,0.12), rgba(2,6,23,0.7)), url(${ad.imageUrl})` }}
        />
      ) : null}
      <div className={ad.imageUrl ? "mt-4" : ""}>
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{getSectionCopy(locale).eyebrow}</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{ad.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{ad.description}</p>
        {ad.format === "html-snippet" && ad.htmlSnippet ? (
          <div
            className="mt-4 rounded-[1rem] border border-white/8 bg-slate-950/35 p-3 text-sm text-slate-200"
            dangerouslySetInnerHTML={{ __html: ad.htmlSnippet }}
          />
        ) : null}
        {ad.ctaLabel || ad.href ? (
          <div className="mt-4 inline-flex rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100">
            {ad.ctaLabel || getSectionCopy(locale).open}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!ad.href) {
    return content;
  }

  return (
    <Link
      href={ad.href}
      onClick={() => trackAdEvent(ad.id, "click")}
      className="block"
    >
      {content}
    </Link>
  );
}

export function SiteAdSlot({
  ads,
  locale,
  title,
}: {
  ads: SiteAd[];
  locale: DisplayLocale;
  title?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackedImpressionsRef = useRef<Set<string>>(new Set());
  const visibleAds = useMemo(() => ads.filter((item) => item.title && item.description), [ads]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || visibleAds.length === 0) {
      return;
    }

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-site-ad-id]"));

    if (typeof IntersectionObserver === "undefined") {
      for (const card of cards) {
        const adId = card.dataset.siteAdId;
        if (!adId || trackedImpressionsRef.current.has(adId)) {
          continue;
        }

        trackedImpressionsRef.current.add(adId);
        trackAdEvent(adId, "impression");
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.45) {
            continue;
          }

          const adId = (entry.target as HTMLElement).dataset.siteAdId;
          if (!adId || trackedImpressionsRef.current.has(adId)) {
            continue;
          }

          trackedImpressionsRef.current.add(adId);
          trackAdEvent(adId, "impression");
        }
      },
      {
        threshold: [0.45],
      },
    );

    for (const card of cards) {
      observer.observe(card);
    }

    return () => observer.disconnect();
  }, [visibleAds]);

  if (visibleAds.length === 0) {
    return null;
  }

  return (
    <section ref={rootRef} className="glass-panel rounded-[2rem] p-6">
      {title ? <p className="section-label">{title}</p> : null}
      <div className={`${title ? "mt-4" : ""} grid gap-4 ${visibleAds.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {visibleAds.map((ad) => (
          <div key={ad.id} data-site-ad-id={ad.id}>
            <SiteAdCard ad={ad} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
