import { NextResponse } from "next/server";
import { getAppVersionInfo } from "@/lib/app-version";

function parseFingerprints() {
  return (process.env.ANDROID_APP_SHA256_FINGERPRINTS?.trim() || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET() {
  const appVersion = await getAppVersionInfo();
  const fingerprints = parseFingerprints();

  if (!appVersion.androidPackageId || fingerprints.length === 0) {
    return NextResponse.json([]);
  }

  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: appVersion.androidPackageId,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
