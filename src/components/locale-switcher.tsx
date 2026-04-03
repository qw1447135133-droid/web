"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n-config";
import { getSiteCopy } from "@/lib/ui-copy";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { localeSwitcherCopy } = getSiteCopy(locale);

  async function updateLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }

    await fetch("/api/locale", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2" aria-label={localeSwitcherCopy.label}>
      {locales.map((item) => {
        const option = localeSwitcherCopy.options[item];
        const active = item === locale;

        return (
          <button
            key={item}
            type="button"
            title={option.label}
            onClick={() => {
              void updateLocale(item);
            }}
            disabled={isPending && !active}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-lime-300/30 bg-lime-300/12 text-lime-100"
                : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
            }`}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
