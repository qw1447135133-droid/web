import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { saveMemberRechargeProof } from "@/lib/coin-wallet";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxProofBytes = 5 * 1024 * 1024;

function buildReturnUrl(base: string, state: "proof-saved" | "proof-error") {
  const url = new URL(base, "http://signalnine.local");
  url.searchParams.set("recharge", state);
  return `${url.pathname}${url.search}`;
}

function normalizeExtension(filename: string, mimeType: string) {
  const ext = path.extname(filename || "").toLowerCase();
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
    return ext === ".jpeg" ? ".jpg" : ext;
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const orderId = String(formData.get("orderId") || "").trim();
  const memberNote = String(formData.get("memberNote") || "").trim();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  const proofFile = formData.get("proofFile");
  let proofUrl: string | undefined;
  let absolutePath: string | undefined;

  try {
    if (proofFile instanceof File && proofFile.size > 0) {
      if (!allowedMimeTypes.has(proofFile.type) || proofFile.size > maxProofBytes) {
        throw new Error("COIN_RECHARGE_PROOF_INVALID_FILE");
      }

      const ext = normalizeExtension(proofFile.name, proofFile.type);
      const fileName = `${orderId}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "recharge-vouchers");
      absolutePath = path.join(uploadDir, fileName);
      await mkdir(uploadDir, { recursive: true });
      const bytes = Buffer.from(await proofFile.arrayBuffer());
      await writeFile(absolutePath, bytes);
      proofUrl = `/uploads/recharge-vouchers/${fileName}`;
    }

    await saveMemberRechargeProof({
      userId: current.id,
      orderId,
      memberNote,
      proofUrl,
    });

    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "proof-saved"), request.url));
  } catch {
    if (absolutePath) {
      await rm(absolutePath, { force: true }).catch(() => undefined);
    }
    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "proof-error"), request.url));
  }
}
