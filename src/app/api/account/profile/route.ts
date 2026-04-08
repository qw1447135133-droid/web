import { NextRequest, NextResponse } from "next/server";
import { normalizeDisplayLocale } from "@/lib/i18n-config";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRecord } from "@/lib/session";

function parseOptionalText(value: FormDataEntryValue | string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export async function GET() {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      pendingEmail: user.pendingEmail,
      contactMethod: user.contactMethod,
      contactValue: user.contactValue,
      preferredLocale: user.preferredLocale,
      countryCode: user.countryCode,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=%2Faccount%2Fprofile", request.url));
  }

  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") || "/account/profile");
  const displayName = parseOptionalText(formData.get("displayName"));
  const contactMethod = parseOptionalText(formData.get("contactMethod"));
  const contactValue = parseOptionalText(formData.get("contactValue"));
  const preferredLocaleRaw = parseOptionalText(formData.get("preferredLocale"));
  const countryCode = parseOptionalText(formData.get("countryCode"))?.slice(0, 8).toUpperCase();

  if (!displayName) {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", "display_name_required");
    return NextResponse.redirect(url);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName,
      contactMethod: contactMethod ?? null,
      contactValue: contactValue ?? null,
      preferredLocale: preferredLocaleRaw ? normalizeDisplayLocale(preferredLocaleRaw) : null,
      countryCode: countryCode ?? null,
    },
  });

  const url = new URL(returnTo, request.url);
  url.searchParams.set("saved", "1");
  return NextResponse.redirect(url);
}
