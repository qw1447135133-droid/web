import { NextRequest, NextResponse } from "next/server";
import {
  deleteHomepageFeaturedMatchSlot,
  moveHomepageFeaturedMatchSlot,
  saveHomepageFeaturedMatchSlot,
  toggleHomepageFeaturedMatchSlotStatus,
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
    if (intent === "delete") {
      await deleteHomepageFeaturedMatchSlot(id);
      return redirectToAdminContent(request, {
        formData,
        fallbackSection: "homepage",
        suffix: "&saved=featured-slot-deleted",
      });
    } else if (intent === "toggle-status") {
      await toggleHomepageFeaturedMatchSlotStatus(id);
    } else if (intent === "move-up") {
      await moveHomepageFeaturedMatchSlot(id, "up");
    } else if (intent === "move-down") {
      await moveHomepageFeaturedMatchSlot(id, "down");
    } else {
      await saveHomepageFeaturedMatchSlot(formData);
    }
  } catch {
    return redirectToAdminContent(request, {
      formData,
      fallbackSection: "homepage",
      suffix: "&error=featured-slot",
    });
  }

  return redirectToAdminContent(request, {
    formData,
    fallbackSection: "homepage",
    suffix: "&saved=featured-slot",
  });
}
