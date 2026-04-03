import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/session";
import { normalizeLocale } from "@/lib/i18n-config";
import {
  assistantCookieName,
  getAssistantCookieConfig,
  resolveAssistantSessionKey,
  sendAssistantMessage,
} from "@/lib/site-assistant-service";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    locale?: string;
    message?: string;
    conversationId?: string;
  };
  const locale = normalizeLocale(body.locale);
  const message = String(body.message ?? "");
  const { sessionKey, shouldSetCookie } = resolveAssistantSessionKey(
    request.cookies.get(assistantCookieName)?.value,
  );
  const user = await getCurrentUserRecord();

  try {
    const payload = await sendAssistantMessage({
      sessionKey,
      locale,
      message,
      conversationId: body.conversationId,
      user,
    });
    const response = NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });

    if (shouldSetCookie) {
      response.cookies.set(assistantCookieName, sessionKey, getAssistantCookieConfig());
    }

    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Assistant request failed.",
      },
      { status: 400 },
    );

    if (shouldSetCookie) {
      response.cookies.set(assistantCookieName, sessionKey, getAssistantCookieConfig());
    }

    return response;
  }
}
