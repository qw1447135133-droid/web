import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  return NextResponse.json({
    ok: true,
    title: String(formData.get("title") || ""),
    notes: String(formData.get("notes") || ""),
    receivedAt: new Date().toISOString(),
  });
}
