import { NextRequest, NextResponse } from "next/server";
import {
  deleteHomepageFeaturedMatchSlot,
  moveHomepageFeaturedMatchSlot,
  saveHomepageFeaturedMatchSlot,
  toggleHomepageFeaturedMatchSlotStatus,
} from "@/lib/admin-operations";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=content${suffix}`, request.url));
}

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
      return redirectToAdmin(request, "&saved=featured-slot-deleted");
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
    return redirectToAdmin(request, "&error=featured-slot");
  }

  return redirectToAdmin(request, "&saved=featured-slot");
}
