import { NextRequest, NextResponse } from "next/server";
import { submitAuthorApplication } from "@/lib/admin-content";
import { getSessionContext } from "@/lib/session";

function redirectToApply(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/authors/apply${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { session } = await getSessionContext();
  const formData = await request.formData();

  try {
    await submitAuthorApplication({
      displayName: String(formData.get("displayName") || ""),
      email: String(formData.get("email") || ""),
      focus: String(formData.get("focus") || ""),
      bio: String(formData.get("bio") || ""),
      badge: String(formData.get("badge") || ""),
      contactMethod: String(formData.get("contactMethod") || ""),
      contactValue: String(formData.get("contactValue") || ""),
      sampleLinks: String(formData.get("sampleLinks") || ""),
      userId: session.id,
      source: "web-author-apply",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "AUTHOR_APPLICATION_INVALID"
        ? "请完整填写显示名称、邮箱、擅长方向和申请说明。"
        : "提交作者申请失败，请稍后重试。";

    return redirectToApply(request, `?error=${encodeURIComponent(message)}`);
  }

  return redirectToApply(request, "?saved=1");
}
