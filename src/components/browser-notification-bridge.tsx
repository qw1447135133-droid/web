"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DisplayLocale } from "@/lib/i18n-config";
import type { UserNotification } from "@/lib/types";

const deviceKeyStorageKey = "signal-nine-browser-device-key";
const permissionPromptStorageKey = "signal-nine-browser-push-prompted";
const shownNotificationPrefix = "signal-nine-browser-shown:";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getDeviceKey() {
  const existing = window.localStorage.getItem(deviceKeyStorageKey);
  if (existing) {
    return existing;
  }

  const nextKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(deviceKeyStorageKey, nextKey);
  return nextKey;
}

function getPermissionValue() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

function notificationTitle(item: UserNotification, locale: DisplayLocale) {
  return item.title || (locale === "en" ? "Site update" : locale === "zh-TW" ? "站內通知" : "站内通知");
}

export function BrowserNotificationBridge({
  enabled,
  locale,
}: {
  enabled: boolean;
  locale: DisplayLocale;
}) {
  const shownIdsRef = useRef<Set<string>>(new Set());
  const notificationSupported = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    [],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let disposed = false;

    const syncDevice = async (permission: string, subscription?: PushSubscription | null) => {
      try {
        await fetch("/api/account/push-devices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deviceKey: getDeviceKey(),
            permission,
            locale,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            subscription: subscription ? JSON.parse(JSON.stringify(subscription)) : null,
          }),
          cache: "no-store",
          keepalive: true,
        });
      } catch {
        // Device sync is best-effort only.
      }
    };

    const boot = async () => {
      const currentPermission = getPermissionValue();
      let subscription: PushSubscription | null = null;

      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const versionResponse = await fetch("/api/app/version", { cache: "no-store" });
          const versionPayload = versionResponse.ok
            ? ((await versionResponse.json()) as { webPushPublicKey?: string })
            : {};
          const publicKey = versionPayload.webPushPublicKey?.trim();
          const registration = await navigator.serviceWorker.getRegistration();
          subscription = registration ? await registration.pushManager.getSubscription() : null;

          if (
            currentPermission === "granted" &&
            publicKey &&
            registration &&
            !subscription
          ) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
          }
        }
      } catch {
        subscription = null;
      }

      await syncDevice(currentPermission, subscription);

      if (
        !notificationSupported ||
        currentPermission !== "default" ||
        window.localStorage.getItem(permissionPromptStorageKey)
      ) {
        return;
      }

      window.localStorage.setItem(permissionPromptStorageKey, "1");

      try {
        const permission = await window.Notification.requestPermission();
        if (!disposed) {
          let subscription: PushSubscription | null = null;

          try {
            if (permission === "granted" && "serviceWorker" in navigator && "PushManager" in window) {
              const versionResponse = await fetch("/api/app/version", { cache: "no-store" });
              const versionPayload = versionResponse.ok
                ? ((await versionResponse.json()) as { webPushPublicKey?: string })
                : {};
              const publicKey = versionPayload.webPushPublicKey?.trim();

              if (publicKey) {
                const registration = await navigator.serviceWorker.getRegistration();
                subscription = registration ? await registration.pushManager.getSubscription() : null;
                if (!registration) {
                  await syncDevice(permission, null);
                  return;
                }
                if (!subscription) {
                  subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                  });
                }
              }
            }
          } catch {
            subscription = null;
          }

          await syncDevice(permission, subscription);
        }
      } catch {
        // Ignore browser permission request failures.
      }
    };

    void boot();

    return () => {
      disposed = true;
    };
  }, [enabled, locale, notificationSupported]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let disposed = false;

    const showUnreadNotifications = async () => {
      if (!notificationSupported || window.Notification.permission !== "granted") {
        return;
      }

      try {
        const response = await fetch(`/api/account/notifications?limit=12&locale=${locale}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          items?: UserNotification[];
          notifications?: UserNotification[];
        };
        const notifications = payload.items ?? payload.notifications ?? [];

        for (const item of notifications) {
          if (disposed || item.readAt || item.type === "push_campaign") {
            continue;
          }

          const storageKey = `${shownNotificationPrefix}${item.id}`;
          if (shownIdsRef.current.has(item.id) || window.localStorage.getItem(storageKey) === "1") {
            continue;
          }

          shownIdsRef.current.add(item.id);
          window.localStorage.setItem(storageKey, "1");

          const browserNotification = new window.Notification(notificationTitle(item, locale), {
            body: item.message,
            tag: `site-notification-${item.id}`,
          });

          browserNotification.onclick = () => {
            window.focus();
            if (item.actionHref) {
              window.location.href = item.actionHref;
            } else {
              window.location.href = "/account/notifications";
            }
            browserNotification.close();
          };

          window.setTimeout(() => browserNotification.close(), 5000);
        }
      } catch {
        // Keep the bridge silent when polling fails.
      }
    };

    void showUnreadNotifications();
    const timer = window.setInterval(() => {
      void showUnreadNotifications();
    }, 30000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [enabled, locale, notificationSupported]);

  return null;
}
