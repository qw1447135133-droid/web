import { NextResponse } from "next/server";
import { getAppVersionInfo } from "@/lib/app-version";

export async function GET() {
  return NextResponse.json(await getAppVersionInfo());
}
