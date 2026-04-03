import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";

export async function GET() {
  const { session, entitlements } = await getSessionContext();

  return NextResponse.json({
    ...session,
    entitlements,
    activeMembership: entitlements.activeMembership,
  });
}
