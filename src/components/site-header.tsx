"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import type { SessionEntitlements, SessionUser, SiteAnnouncement } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

const announcementDismissedStorageKey = "signal-nine-announcements-dismissed";
const announcementCloseAnimationMs = 320;

export function SiteHeader({
  announcements,
  displayLocale,
  locale,
  session,
  entitlements,
}: {
  announcements: SiteAnnouncement[];
  displayLocale: DisplayLocale;
  locale: Locale;
  session: SessionUser;
  entitlements: SessionEntitlements;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [announcementItems, setAnnouncementItems] = useState(announcements);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [announcementState, setAnnouncementState] = useState<"hidden" | "visible" | "closing">("hidden");
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const searchKey = searchParams.toString();
  const searchQuery = searchParams.get("q") ?? "";
  const { brandCopy, roleLabels, searchCopy, sessionUiCopy, siteNavItems } = getSiteCopy(displayLocale);
  const visibleNavItems = siteNavItems.filter(
    (item) => item.href !== "/admin" || entitlements.canAccessAdminConsole,
  );
  const activeAnnouncement =
    announcementItems.length > 0
      ? announcementItems[Math.min(activeAnnouncementIndex, announcementItems.length - 1)]
      : undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(announcementDismissedStorageKey) === "true";
    setAnnouncementDismissed(dismissed);
    setAnnouncementState(dismissed || announcements.length === 0 ? "hidden" : "visible");
  }, [announcements.length]);

  useEffect(() => {
    let disposed = false;

    async function syncAnnouncements() {
      try {
        const response = await fetch(`/api/site/announcements?locale=${locale}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { announcements?: SiteAnnouncement[] };

        if (!disposed) {
          setAnnouncementItems(payload.announcements ?? []);
          setActiveAnnouncementIndex(0);
        }
      } catch {
        // Keep server-rendered announcements when client refresh fails.
      }
    }

    void syncAnnouncements();

    return () => {
      disposed = true;
    };
  }, [locale, pathname, searchKey]);

  useEffect(() => {
    if (announcementItems.length === 0) {
      setAnnouncementState("hidden");
      setActiveAnnouncementIndex(0);
      return;
    }

    if (!announcementDismissed && announcementState === "hidden") {
      setAnnouncementState("visible");
    }
  }, [announcementDismissed, announcementItems.length, announcementState]);

  useEffect(() => {
    if (activeAnnouncementIndex < announcementItems.length) {
      return;
    }

    setActiveAnnouncementIndex(0);
  }, [activeAnnouncementIndex, announcementItems.length]);

  useEffect(() => {
    if (announcementState !== "visible") {
      return;
    }

    const timer = window.setTimeout(() => {
      setAnnouncementState("closing");
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [announcementState]);

  useEffect(() => {
    if (announcementState !== "visible" || announcementItems.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveAnnouncementIndex((current) => (current + 1) % announcementItems.length);
    }, 2200);

    return () => {
      window.clearInterval(timer);
    };
  }, [announcementItems.length, announcementState]);

  useEffect(() => {
    if (announcementState !== "closing") {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(announcementDismissedStorageKey, "true");
    }

    setAnnouncementDismissed(true);

    const timer = window.setTimeout(() => {
      setAnnouncementState("hidden");
    }, announcementCloseAnimationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [announcementState]);

  function dismissAnnouncements() {
    setAnnouncementState((current) => (current === "visible" ? "closing" : current));
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#06111be6] backdrop-blur-xl">
      {activeAnnouncement && announcementState !== "hidden" ? (
        <div
          className={`overflow-hidden border-b border-white/8 bg-gradient-to-r from-orange-400/18 via-sky-400/12 to-lime-300/18 transition-all duration-300 ease-out ${
            announcementState === "closing"
              ? "max-h-0 -translate-y-3 opacity-0"
              : "max-h-[12rem] translate-y-0 opacity-100"
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div
              className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:justify-between ${
                activeAnnouncement.tone === "warning"
                  ? "border-orange-300/25 bg-orange-400/8 text-orange-50"
                  : activeAnnouncement.tone === "success"
                    ? "border-lime-300/25 bg-lime-400/8 text-lime-50"
                    : "border-sky-300/25 bg-sky-400/8 text-sky-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-[0.18em] uppercase opacity-80">
                    {activeAnnouncement.title}
                  </p>
                  {announcementItems.length > 1 ? (
                    <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-semibold opacity-80">
                      1 / {announcementItems.length}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-white/90">{activeAnnouncement.message}</p>
                {announcementItems.length > 1 ? (
                  <div className="mt-3 flex items-center gap-2">
                    {announcementItems.map((announcement, index) => (
                      <button
                        key={announcement.id}
                        type="button"
                        onClick={() => setActiveAnnouncementIndex(index)}
                        aria-label={`announcement-${index + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          index === activeAnnouncementIndex
                            ? "w-8 bg-white/90"
                            : "w-3 bg-white/25 hover:bg-white/45"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                {activeAnnouncement.href && activeAnnouncement.ctaLabel ? (
                  <Link
                    href={activeAnnouncement.href}
                    className="inline-flex items-center rounded-full border border-current/25 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                  >
                    {activeAnnouncement.ctaLabel}
                  </Link>
                ) : null}
              <button
                type="button"
                onClick={dismissAnnouncements}
                className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs text-slate-200 transition hover:border-white/25 hover:text-white"
              >
                ×
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="signal-ring flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-400/10">
                <span className="display-title text-2xl font-semibold text-orange-300">S9</span>
              </div>
              <div>
                <p className="display-title text-xl leading-none font-semibold text-white">{brandCopy.title}</p>
                <p className="text-xs uppercase tracking-[0.28em] text-lime-300/80">{brandCopy.subtitle}</p>
              </div>
            </Link>

            <div className="lg:hidden">
              <LocaleSwitcher displayLocale={displayLocale} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden lg:block">
              <LocaleSwitcher displayLocale={displayLocale} />
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {session.role === "visitor"
                ? sessionUiCopy.visitorMode
                : `${session.displayName} | ${roleLabels[session.role]}`}
            </div>
            {session.role === "visitor" ? (
              <Link
                href="/login"
                className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {sessionUiCopy.loginExperience}
              </Link>
            ) : (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-200 transition hover:border-orange-300/40 hover:text-white"
                >
                  {sessionUiCopy.logout}
                </button>
              </form>
            )}
          </div>
        </div>

        <form
          action="/search"
          method="get"
          className="flex flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3 md:flex-row md:items-center"
        >
          <label htmlFor="site-header-search" className="sr-only">
            {searchCopy.inputLabel}
          </label>
          <input
            id="site-header-search"
            name="q"
            type="search"
            defaultValue={pathname === "/search" ? searchQuery : ""}
            placeholder={searchCopy.headerPlaceholder}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
          >
            {searchCopy.headerSubmit}
          </button>
        </form>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {visibleNavItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-orange-300/30 bg-orange-300/12 text-white"
                    : "border-white/8 bg-white/4 text-slate-300 hover:border-white/18 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
