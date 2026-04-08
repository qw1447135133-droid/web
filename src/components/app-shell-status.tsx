"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisplayLocale } from "@/lib/i18n-config";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type AppVersionPayload = {
  currentVersion: string;
  minimumSupportedVersion: string;
  hotUpdateVersion: string;
  forceUpdate: boolean;
  releaseChannel: string;
  assetVersion: string;
  updateNotes: string;
  downloadUrl?: string;
  installPromptEnabled: boolean;
  generatedAt: string;
};

const versionStorageKey = "signal-nine-app-asset-version";
const dismissStorageKey = "signal-nine-app-update-dismissed";

function t(locale: DisplayLocale, zhCn: string, zhTw: string, en: string, th?: string, vi?: string, hi?: string) {
  if (locale === "zh-TW") {
    return zhTw;
  }

  if (locale === "en") {
    return en;
  }

  if (locale === "th") {
    return th ?? en;
  }

  if (locale === "vi") {
    return vi ?? en;
  }

  if (locale === "hi") {
    return hi ?? en;
  }

  return zhCn;
}

export function AppShellStatus({ locale }: { locale: DisplayLocale }) {
  const [version, setVersion] = useState<AppVersionPayload | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    let disposed = false;

    const loadVersion = async () => {
      try {
        const response = await fetch("/api/app/version", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AppVersionPayload;

        if (disposed) {
          return;
        }

        setVersion(payload);

        const previousAssetVersion = window.localStorage.getItem(versionStorageKey);
        const dismissedAssetVersion = window.localStorage.getItem(dismissStorageKey);

        if (previousAssetVersion && previousAssetVersion !== payload.assetVersion && dismissedAssetVersion !== payload.assetVersion) {
          setUpdateAvailable(true);
        }

        window.localStorage.setItem(versionStorageKey, payload.assetVersion);
      } catch {
        // Shell hints are best-effort only.
      }
    };

    void loadVersion();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setInstallDismissed(false);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setInstallDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const showInstallPrompt = Boolean(version?.installPromptEnabled && installEvent && !installDismissed);
  const showUpdatePrompt = Boolean(version && updateAvailable);

  const copy = useMemo(
    () => ({
      installEyebrow: t(locale, "安装 Web App", "安裝 Web App", "Install Web App", "ติดตั้ง Web App", "Cai dat Web App", "Install Web App"),
      installTitle: t(locale, "将站点加入主屏幕", "將站點加入主畫面", "Add this site to your home screen", "เพิ่มไซต์นี้ไปยังหน้าจอหลัก", "Them trang vao man hinh chinh", "इस साइट को होम स्क्रीन पर जोड़ें"),
      installDescription: t(
        locale,
        "当前 H5 已提供安装壳层入口，后续 APK/原生壳会沿用同一版本配置。",
        "目前 H5 已提供安裝殼層入口，後續 APK/原生殼會沿用同一版本配置。",
        "The H5 shell is ready for install now, and later APK or native shells can reuse the same version controls.",
        "H5 พร้อมติดตั้งแล้ว และ APK/เชลล์เนทีฟจะใช้ชุดเวอร์ชันเดียวกันภายหลัง",
        "H5 hien da san sang cai dat, va APK/native shell se tai su dung cau hinh phien ban nay.",
        "H5 shell अब install के लिए तैयार है, और बाद का APK/native shell यही version config reuse करेगा।",
      ),
      installAction: t(locale, "立即安装", "立即安裝", "Install", "ติดตั้ง", "Cai dat", "Install"),
      later: t(locale, "稍后", "稍後", "Later", "ภายหลัง", "De sau", "Later"),
      updateEyebrow: t(locale, "版本更新", "版本更新", "Version update", "อัปเดตเวอร์ชัน", "Cap nhat phien ban", "Version update"),
      updateTitle: t(locale, "检测到新资源版本", "偵測到新資源版本", "A new asset version is available", "มีเวอร์ชันทรัพยากรใหม่", "Da co phien ban tai nguyen moi", "A new asset version is available"),
      updateDescription: t(
        locale,
        "页面资源已更新。刷新后会加载新的 H5 壳层与静态资源。",
        "頁面資源已更新。重新整理後會載入新的 H5 殼層與靜態資源。",
        "Static assets were updated. Refresh to load the latest H5 shell and resources.",
        "ทรัพยากรแบบสถิตได้รับการอัปเดตแล้ว รีเฟรชเพื่อโหลดเชลล์ H5 ล่าสุด",
        "Tai nguyen tinh da cap nhat. Hay tai lai de nap shell H5 va tai nguyen moi nhat.",
        "Static assets अपडेट हो गए हैं। नवीनतम H5 shell और resources लोड करने के लिए refresh करें।",
      ),
      refresh: t(locale, "立即刷新", "立即重新整理", "Refresh now", "รีเฟรชตอนนี้", "Tai lai ngay", "Refresh now"),
      openDownload: t(locale, "打开下载页", "開啟下載頁", "Open download", "เปิดหน้าดาวน์โหลด", "Mo trang tai xuong", "Open download"),
      channel: t(locale, "通道", "通道", "Channel", "ช่องทาง", "Kenh", "Channel"),
    }),
    [locale],
  );

  if (!showInstallPrompt && !showUpdatePrompt) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-3 sm:left-6 sm:right-auto sm:w-[24rem]">
      {showUpdatePrompt && version ? (
        <section className="pointer-events-auto rounded-[1.6rem] border border-sky-300/20 bg-slate-950/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/80">{copy.updateEyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{copy.updateTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{copy.updateDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-1">{copy.channel}: {version.releaseChannel}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">v{version.currentVersion}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{version.assetVersion}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              {copy.refresh}
            </button>
            {version.downloadUrl ? (
              <a
                href={version.downloadUrl}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                {copy.openDownload}
              </a>
            ) : null}
            {!version.forceUpdate ? (
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(dismissStorageKey, version.assetVersion);
                  setUpdateAvailable(false);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                {copy.later}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showInstallPrompt ? (
        <section className="pointer-events-auto rounded-[1.6rem] border border-white/10 bg-slate-950/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{copy.installEyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{copy.installTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{copy.installDescription}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                if (!installEvent) {
                  return;
                }

                await installEvent.prompt();
                const choice = await installEvent.userChoice.catch(() => null);
                if (choice?.outcome !== "accepted") {
                  setInstallDismissed(true);
                }
                setInstallEvent(null);
              }}
              className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              {copy.installAction}
            </button>
            <button
              type="button"
              onClick={() => {
                setInstallDismissed(true);
                setInstallEvent(null);
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              {copy.later}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
