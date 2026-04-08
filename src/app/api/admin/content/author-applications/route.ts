import { NextRequest, NextResponse } from "next/server";
import { reviewAuthorApplication } from "@/lib/admin-content";
import { redirectToAdminContent } from "@/lib/admin-content-redirect";
import { getSessionContext } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canManageContent) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  formData.set("reviewedByDisplayName", session.displayName);

  try {
    await reviewAuthorApplication(formData);
  } catch {
    return redirectToAdminContent(request, {
      formData,
      fallbackSection: "library",
      suffix: "&error=author-application",
    });
  }

  return redirectToAdminContent(request, {
    formData,
    fallbackSection: "library",
    suffix: "&saved=author-application",
  });
}
