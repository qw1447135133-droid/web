import { NextRequest, NextResponse } from "next/server";
import { AuthServiceError, verifyEmailToken } from "@/lib/auth-service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const returnTo = request.nextUrl.searchParams.get("returnTo")?.trim() || "/account/security/email";
  const url = new URL(returnTo, request.url);

  try {
    await verifyEmailToken(token);
    url.searchParams.set("status", "verified");
  } catch (error) {
    url.searchParams.set("error", error instanceof AuthServiceError ? error.code.toLowerCase() : "verify_failed");
  }

  return NextResponse.redirect(url);
}
