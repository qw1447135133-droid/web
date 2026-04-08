import type { MetadataRoute } from "next";
import { getAppVersionInfo, resolveAppAssetUrl } from "@/lib/app-version";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const version = await getAppVersionInfo();
  const toAssetUrl = (assetPath: string) => resolveAppAssetUrl(assetPath, version);

  return {
    id: "/",
    name: "NowScore Signal Nine",
    short_name: "NowScore",
    description: version.updateNotes,
    start_url: "/",
    scope: "/",
    display: version.fullscreenEnabled ? "standalone" : "browser",
    display_override: version.fullscreenEnabled ? ["window-controls-overlay", "standalone", "browser"] : ["browser"],
    orientation: "portrait",
    background_color: version.splashBackground,
    theme_color: version.splashBackground,
    lang: "en",
    categories: ["sports", "news", "finance"],
    icons: [
      {
        src: toAssetUrl("/icon"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: toAssetUrl("/icon"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: toAssetUrl("/apple-icon"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: toAssetUrl("/pwa-screenshot-wide.svg"),
        sizes: "1280x720",
        type: "image/svg+xml",
        form_factor: "wide",
      },
      {
        src: toAssetUrl("/pwa-screenshot-mobile.svg"),
        sizes: "750x1334",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Football Live",
        short_name: "Football",
        url: "/live/football",
      },
      {
        name: "Basketball Live",
        short_name: "Basketball",
        url: "/live/basketball",
      },
      {
        name: "Member Center",
        short_name: "Member",
        url: "/member",
      },
    ],
    prefer_related_applications: Boolean(version.androidPackageId && version.downloadUrl),
    related_applications:
      version.androidPackageId && version.downloadUrl
        ? [
            {
              platform: "play",
              id: version.androidPackageId,
              url: version.downloadUrl,
            },
          ]
        : undefined,
  };
}
