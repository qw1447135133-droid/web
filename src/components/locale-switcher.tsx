"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { displayLocales, type DisplayLocale } from "@/lib/i18n-config";
import { getSiteCopy } from "@/lib/ui-copy";

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.8 9h16.4" />
      <path d="M3.8 15h16.4" />
      <path d="M12 3c2.4 2.5 3.8 5.7 3.8 9s-1.4 6.5-3.8 9c-2.4-2.5-3.8-5.7-3.8-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 7.5" />
    </svg>
  );
}

export function LocaleSwitcher({
  displayLocale,
}: {
  displayLocale: DisplayLocale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { localeSwitcherCopy } = getSiteCopy(displayLocale);
  const activeOption = localeSwitcherCopy.options[displayLocale];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function updateLocale(nextLocale: DisplayLocale) {
    if (nextLocale === displayLocale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);

    await fetch("/api/locale", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ displayLocale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative" aria-label={localeSwitcherCopy.label}>
      <button
        type="button"
        title={`${localeSwitcherCopy.label}: ${activeOption.label}`}
        aria-label={localeSwitcherCopy.label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`group flex h-10 w-10 items-center justify-center rounded-full border transition ${
          isOpen
            ? "border-orange-300/45 bg-orange-300/12 text-orange-100"
            : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-white/22 hover:text-white"
        }`}
      >
        <span className="sr-only">{localeSwitcherCopy.label}</span>
        <GlobeIcon className="h-[18px] w-[18px]" />
        <ChevronIcon
          className={`pointer-events-none absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border border-white/10 bg-slate-950/90 p-[1px] text-slate-300 transition ${
            isOpen ? "rotate-180 text-orange-200" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-48 rounded-[1.15rem] border border-white/12 bg-[#08131ef2] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl"
        >
          {displayLocales.map((item) => {
            const option = localeSwitcherCopy.options[item];
            const active = item === displayLocale;

            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                title={option.label}
                onClick={() => {
                  void updateLocale(item);
                }}
                disabled={isPending && !active}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-orange-300/12 text-white"
                    : "text-slate-200 hover:bg-white/6 hover:text-white"
                } ${isPending && !active ? "opacity-60" : ""}`}
              >
                <span className="font-medium">{option.label}</span>
                <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  {option.shortLabel}
                  {active ? <CheckIcon className="h-3.5 w-3.5 text-orange-200" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
