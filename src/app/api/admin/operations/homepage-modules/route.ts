import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapMockHomepageModules,
  moveHomepageModule,
  saveHomepageModule,
  toggleHomepageModuleStatus,
} from "@/lib/admin-operations";
import { redirectToAdminContent } from "@/lib/admin-content-redirect";
import { getSessionContext } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canManageContent) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");
  const id = String(formData.get("id") || "");

  try {
    if (intent === "bootstrap") {
      await bootstrapMockHomepageModules();
      return redirectToAdminContent(request, {
        formData,
        fallbackSection: "homepage",
        suffix: "&saved=module-seeded",
      });
    } else if (intent === "toggle-status") {
      await toggleHomepageModuleStatus(id);
    } else if (intent === "move-up") {
      await moveHomepageModule(id, "up");
    } else if (intent === "move-down") {
      await moveHomepageModule(id, "down");
    } else {
      await saveHomepageModule(formData);
    }
  } catch {
    return redirectToAdminContent(request, { formData, fallbackSection: "homepage", suffix: "&error=module" });
  }

  return redirectToAdminContent(request, { formData, fallbackSection: "homepage", suffix: "&saved=module" });
}
