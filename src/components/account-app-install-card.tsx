"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppVersionInfo } from "@/lib/app-version";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type AppInstallCardLabels = {
  eyebrow: string;
  title: string;
  description: string;
  install: string;
  installUnavailable: string;
  download: string;
  manifest: string;
  version: string;
  hotUpdate: string;
  minimum: string;
  channel: string;
  fullscreen: string;
  installEnabled: string;
};

export function AccountAppInstallCard({
  info,
  labels,
}: {
  info: AppVersionInfo;
  labels: AppInstallCardLabels;
}) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const canPromptInstall = useMemo(
    () => Boolean(info.installPromptEnabled && installEvent),
    [info.installPromptEnabled, installEvent],
  );

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice?.catch(() => undefined);
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="section-label">{labels.eyebrow}</p>
          <h2 className="text-2xl font-semibold text-white">{labels.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">{labels.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleInstall}
            disabled={!canPromptInstall || installing}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              canPromptInstall && !installing
                ? "bg-orange-400 text-slate-950 hover:bg-orange-300"
                : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500"
            }`}
          >
            {labels.install}
          </button>
          {info.downloadUrl ? (
            <a
              href={info.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              {labels.download}
            </a>
          ) : null}
          <a
            href={info.manifestPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            {labels.manifest}
          </a>
        </div>
      </div>

      {!canPromptInstall ? (
        <p className="mt-4 text-sm text-slate-500">{labels.installUnavailable}</p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.version}</p>
          <p className="mt-2 text-xl font-semibold text-white">v{info.currentVersion}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.hotUpdate}</p>
          <p className="mt-2 text-xl font-semibold text-sky-100">v{info.hotUpdateVersion}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.minimum}</p>
          <p className="mt-2 text-xl font-semibold text-white">v{info.minimumSupportedVersion}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.channel}</p>
          <p className="mt-2 text-base font-semibold text-white">{info.releaseChannel}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.fullscreen}</p>
          <p className="mt-2 text-base font-semibold text-white">{info.fullscreenEnabled ? "On" : "Off"}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{labels.installEnabled}</p>
          <p className="mt-2 text-base font-semibold text-white">{info.installPromptEnabled ? "On" : "Off"}</p>
        </div>
      </div>
    </section>
  );
}
