import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookieForUser } from "@/lib/session";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "Demo User");
  const email = String(formData.get("email") || "demo@signalnine.local");
  const role = String(formData.get("role") || "member") as UserRole;
  const returnTo = String(formData.get("returnTo") || "/member");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      role,
    },
    create: {
      displayName,
      email,
      role,
    },
  });

  await setSessionCookieForUser(user.id);

  return NextResponse.redirect(new URL(returnTo, request.url));
}
