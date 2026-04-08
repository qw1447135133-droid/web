import { NextRequest, NextResponse } from "next/server";
import { registerUser, sendEmailVerification, AuthServiceError } from "@/lib/auth-service";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { setSessionCookieForUser } from "@/lib/session";

function buildRegisterRedirect(request: NextRequest, params: { next?: string; error?: string; registered?: string }) {
  const url = new URL("/register", request.url);

  if (params.next) {
    url.searchParams.set("next", params.next);
  }

  if (params.error) {
    url.searchParams.set("error", params.error);
  }

  if (params.registered) {
    url.searchParams.set("registered", params.registered);
  }

  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const inviteCode = String(formData.get("inviteCode") || "").trim();
  const preferredLocale = String(formData.get("preferredLocale") || "").trim();
  const countryCode = String(formData.get("countryCode") || "").trim();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");

  try {
    const user = await registerUser({
      displayName,
      email,
      password,
      inviteCode,
      preferredLocale,
      countryCode,
      headers: request.headers,
    });

    await setSessionCookieForUser(user.id);
    await sendEmailVerification({
      userId: user.id,
    });

    const url = new URL(returnTo, request.url);
    url.searchParams.set("registered", "1");
    return NextResponse.redirect(url);
  } catch (error) {
    const errorCode = error instanceof AuthServiceError ? error.code.toLowerCase() : "register_failed";
    return NextResponse.redirect(
      buildRegisterRedirect(request, {
        next: returnTo,
        error: errorCode,
      }),
    );
  }
}
