"use client";

import { useEffect } from "react";

type AppVersionPayload = {
  assetVersion?: string;
};

export function AppServiceWorkerBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let disposed = false;

    async function registerServiceWorker() {
      let assetVersion = "shell";

      try {
        const response = await fetch("/api/app/version", {
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as AppVersionPayload;
          if (payload.assetVersion?.trim()) {
            assetVersion = payload.assetVersion.trim();
          }
        }
      } catch {
        // Fall back to a generic cache key if the version endpoint is unavailable.
      }

      if (disposed) {
        return;
      }

      try {
        await navigator.serviceWorker.register(
          `/service-worker.js?asset=${encodeURIComponent(assetVersion)}`,
          { scope: "/", updateViaCache: "none" },
        );
      } catch {
        // Registration is best-effort and should not block the shell.
      }
    }

    void registerServiceWorker();

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
