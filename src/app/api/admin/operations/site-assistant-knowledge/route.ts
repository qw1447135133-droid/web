import { NextRequest, NextResponse } from "next/server";
import { redirectToAdminContent } from "@/lib/admin-content-redirect";
import {
  bootstrapSupportKnowledgeBase,
} from "@/lib/site-assistant-service";
import {
  moveSupportKnowledgeItem,
  saveSupportKnowledgeItem,
  toggleSupportKnowledgeItemStatus,
} from "@/lib/admin-operations";
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
  const id = String(formData.get("id") || "").trim();

  try {
    if (intent === "seed") {
      await bootstrapSupportKnowledgeBase();
      return redirectToAdminContent(request, {
        formData,
        fallbackSection: "assistant",
        suffix: "&saved=assistant-knowledge-seeded",
      });
    }

    if (intent === "toggle-status") {
      await toggleSupportKnowledgeItemStatus(id);
    } else if (intent === "move-up") {
      await moveSupportKnowledgeItem(id, "up");
    } else if (intent === "move-down") {
      await moveSupportKnowledgeItem(id, "down");
    } else {
      const saved = await saveSupportKnowledgeItem(formData);
      return redirectToAdminContent(request, {
        formData,
        fallbackSection: "assistant",
        suffix: `&saved=assistant-knowledge&editKnowledge=${saved.id}`,
      });
    }
  } catch {
    return redirectToAdminContent(request, {
      formData,
      fallbackSection: "assistant",
      suffix: "&error=assistant-knowledge",
    });
  }

  return redirectToAdminContent(request, {
    formData,
    fallbackSection: "assistant",
    suffix: "&saved=assistant-knowledge",
  });
}
