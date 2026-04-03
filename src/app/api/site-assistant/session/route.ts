import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/session";
import { normalizeLocale } from "@/lib/i18n-config";
import {
  assistantCookieName,
  createAssistantConversation,
  getAssistantConversationSnapshot,
  getAssistantCookieConfig,
  resolveAssistantSessionKey,
} from "@/lib/site-assistant-service";

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  const conversationId = request.nextUrl.searchParams.get("conversationId") ?? undefined;
  const { sessionKey, shouldSetCookie } = resolveAssistantSessionKey(
    request.cookies.get(assistantCookieName)?.value,
  );
  const user = await getCurrentUserRecord();
  const snapshot = await getAssistantConversationSnapshot({
    sessionKey,
    locale,
    conversationId,
    userId: user?.id,
  });
  const response = NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  if (shouldSetCookie) {
    response.cookies.set(assistantCookieName, sessionKey, getAssistantCookieConfig());
  }

  return response;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    locale?: string;
    action?: string;
  };
  const locale = normalizeLocale(body.locale);
  const { sessionKey, shouldSetCookie } = resolveAssistantSessionKey(
    request.cookies.get(assistantCookieName)?.value,
  );
  const user = await getCurrentUserRecord();

  if (body.action !== "new") {
    return NextResponse.json({ error: "Unsupported assistant session action." }, { status: 400 });
  }

  const payload = await createAssistantConversation({
    sessionKey,
    locale,
    userId: user?.id,
  });

  const snapshot = await getAssistantConversationSnapshot({
    sessionKey,
    locale,
    conversationId: payload.conversationId,
    userId: user?.id,
  });

  const response = NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  if (shouldSetCookie) {
    response.cookies.set(assistantCookieName, sessionKey, getAssistantCookieConfig());
  }

  return response;
}
