import packageJson from "../../package.json";
import { prisma } from "@/lib/prisma";

export type AppVersionInfo = {
  currentVersion: string;
  minimumSupportedVersion: string;
  hotUpdateVersion: string;
  forceUpdate: boolean;
  updateStrategy: string;
  releaseChannel: string;
  assetVersion: string;
  updateNotes: string;
  downloadUrl?: string;
  manifestPath: string;
  installPromptEnabled: boolean;
  fullscreenEnabled: boolean;
  androidShellEnabled: boolean;
  androidPackageId?: string;
  androidVersionCode?: string;
  splashBackground: string;
  pushDeliveryMode: string;
  cdnAssetPrefix?: string;
  publicAssetHost?: string;
  webPushEnabled: boolean;
  webPushPublicKey?: string;
  timezonePolicy: string;
  timezoneLabel: string;
  generatedAt: string;
};

const defaultVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || packageJson.version;

function joinAssetUrl(base: string, assetPath: string) {
  const normalizedBase = base.trim().replace(/\/+$/, "");
  const normalizedAssetPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;

  if (/^https?:\/\//i.test(normalizedBase)) {
    return new URL(normalizedAssetPath, `${normalizedBase}/`).toString();
  }

  return `${normalizedBase}${normalizedAssetPath}`;
}

export function resolveAppAssetUrl(
  assetPath: string,
  version: Pick<AppVersionInfo, "publicAssetHost" | "cdnAssetPrefix">,
) {
  const base = version.publicAssetHost?.trim() || version.cdnAssetPrefix?.trim();

  if (!base) {
    return assetPath;
  }

  return joinAssetUrl(base, assetPath);
}

export async function getAppVersionInfo(): Promise<AppVersionInfo> {
  const keys = [
    "app.version.current",
    "app.version.minimum_supported",
    "app.version.hot_update",
    "app.version.force_update",
    "app.version.update_strategy",
    "app.version.channel",
    "app.version.notes",
    "app.version.download_url",
    "app.web.install_enabled",
    "app.web.fullscreen_enabled",
    "app.web.asset_version",
    "app.apk.package_id",
    "app.apk.splash_background",
    "app.push.delivery_mode",
    "app.push.webpush_enabled",
    "app.push.webpush_public_key",
    "app.android.package_id",
    "app.android.version_code",
    "app.cdn.asset_prefix",
    "app.cdn.public_asset_host",
    "site.timezone_policy",
    "site.timezone_label",
  ];
  const rows = await prisma.systemParameter.findMany({
    where: {
      key: {
        in: keys,
      },
    },
    select: {
      key: true,
      value: true,
    },
  });
  const map = new Map(rows.map((item) => [item.key, item.value.trim()]));

  const currentVersion = map.get("app.version.current") || defaultVersion;
  const minimumSupportedVersion = map.get("app.version.minimum_supported") || currentVersion;
  const hotUpdateVersion = map.get("app.version.hot_update") || map.get("app.web.asset_version") || currentVersion;
  const forceUpdate = (map.get("app.version.force_update") || "false").toLowerCase() === "true";
  const updateStrategy = map.get("app.version.update_strategy") || "web-cache-refresh";
  const releaseChannel = map.get("app.version.channel") || process.env.NEXT_PUBLIC_APP_CHANNEL?.trim() || "web-stable";
  const assetVersion = map.get("app.web.asset_version") || currentVersion;
  const updateNotes =
    map.get("app.version.notes") ||
    process.env.NEXT_PUBLIC_APP_UPDATE_NOTES?.trim() ||
    "Web commercial build with account workspace, notifications, and coin recharge support.";
  const downloadUrl = map.get("app.version.download_url") || process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL?.trim() || undefined;
  const installPromptEnabled = (map.get("app.web.install_enabled") || "true").toLowerCase() !== "false";
  const fullscreenEnabled = (map.get("app.web.fullscreen_enabled") || "true").toLowerCase() !== "false";
  const androidPackageId =
    map.get("app.apk.package_id") ||
    map.get("app.android.package_id") ||
    process.env.APP_APK_PACKAGE_ID?.trim() ||
    process.env.ANDROID_APP_PACKAGE_ID?.trim() ||
    undefined;
  const androidVersionCode = map.get("app.android.version_code") || process.env.ANDROID_APP_VERSION_CODE?.trim() || undefined;
  const splashBackground = map.get("app.apk.splash_background") || process.env.APP_APK_SPLASH_BACKGROUND?.trim() || "#07111f";
  const pushDeliveryMode = map.get("app.push.delivery_mode") || process.env.APP_PUSH_DELIVERY_MODE?.trim() || "in-site+browser";
  const cdnAssetPrefix = map.get("app.cdn.asset_prefix") || process.env.NEXT_PUBLIC_CDN_ASSET_PREFIX?.trim() || undefined;
  const publicAssetHost = map.get("app.cdn.public_asset_host") || process.env.NEXT_PUBLIC_CDN_PUBLIC_HOST?.trim() || undefined;
  const webPushPublicKey = map.get("app.push.webpush_public_key") || process.env.WEB_PUSH_PUBLIC_KEY?.trim() || undefined;
  const webPushEnabled = (map.get("app.push.webpush_enabled") || (webPushPublicKey ? "true" : "false")).toLowerCase() !== "false";
  const timezonePolicy = map.get("site.timezone_policy") || "UTC";
  const timezoneLabel = map.get("site.timezone_label") || "UTC+0";

  return {
    currentVersion,
    minimumSupportedVersion,
    hotUpdateVersion,
    forceUpdate,
    updateStrategy,
    releaseChannel,
    assetVersion,
    updateNotes,
    downloadUrl,
    manifestPath: "/manifest.webmanifest",
    installPromptEnabled,
    fullscreenEnabled,
    androidShellEnabled: Boolean(androidPackageId || downloadUrl),
    androidPackageId,
    androidVersionCode,
    splashBackground,
    pushDeliveryMode,
    cdnAssetPrefix,
    publicAssetHost,
    webPushEnabled,
    webPushPublicKey,
    timezonePolicy,
    timezoneLabel,
    generatedAt: new Date().toISOString(),
  };
}
