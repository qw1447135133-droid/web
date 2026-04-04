import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/session";
import { normalizeDisplayLocale } from "@/lib/i18n-config";
import {
  assistantCookieName,
  getAssistantCookieConfig,
  requestAssistantHandoff,
  resolveAssistantSessionKey,
} from "@/lib/site-assistant-service";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    locale?: string;
    conversationId?: string;
    contactName?: string;
    contactMethod?: string;
    note?: string;
  };
  const locale = normalizeDisplayLocale(body.locale);
  const { sessionKey, shouldSetCookie } = resolveAssistantSessionKey(
    request.cookies.get(assistantCookieName)?.value,
  );
  const user = await getCurrentUserRecord();

  try {
    const payload = await requestAssistantHandoff({
      sessionKey,
      locale,
      conversationId: body.conversationId,
      user,
      contactName: body.contactName,
      contactMethod: body.contactMethod,
      note: body.note,
    });
    const response = NextResponse.json(
      {
        ok: true,
        requestId: payload.id,
        conversationId: payload.conversationId,
        conversations: payload.conversations,
        message: payload.message,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

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
            : "Assistant handoff request failed.",
      },
      { status: 400 },
    );

    if (shouldSetCookie) {
      response.cookies.set(assistantCookieName, sessionKey, getAssistantCookieConfig());
    }

    return response;
  }
}
