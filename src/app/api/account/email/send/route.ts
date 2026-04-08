import { NextRequest, NextResponse } from "next/server";
import { AuthServiceError, sendEmailVerification } from "@/lib/auth-service";
import { getCurrentUserRecord } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=%2Faccount%2Fsecurity%2Femail", request.url));
  }

  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") || "/account/security/email");
  const nextEmail = String(formData.get("nextEmail") || "").trim();

  try {
    await sendEmailVerification({
      userId: user.id,
      nextEmail: nextEmail || undefined,
    });

    const url = new URL(returnTo, request.url);
    url.searchParams.set("status", nextEmail ? "pending-sent" : "sent");
    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", error instanceof AuthServiceError ? error.code.toLowerCase() : "send_failed");
    return NextResponse.redirect(url);
  }
}
