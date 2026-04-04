import { NextRequest, NextResponse } from "next/server";
import { applyAgentWithdrawalPayoutCallback } from "@/lib/admin-agents";
import { getAgentPayoutCallbackToken } from "@/lib/agent-payout-provider";
import { recordAdminAuditLog } from "@/lib/admin-system";

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function isAuthorized(request: NextRequest) {
  const token = getAgentPayoutCallbackToken();

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-agent-payout-token")?.trim();

  return bearer === token || headerToken === token;
}

async function parseRequestPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return await request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("text/plain")) {
    const rawBody = await request.text();
    const trimmed = rawBody.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }

    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  return Object.fromEntries((await request.formData()).entries());
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized agent payout callback.",
      },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    const parsed = await parseRequestPayload(request);
    payload =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid agent payout callback payload.",
      },
      { status: 400 },
    );
  }

  const withdrawalId = String(payload.withdrawalId || payload.id || "").trim();

  if (!withdrawalId) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing withdrawalId.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await applyAgentWithdrawalPayoutCallback({
      withdrawalId,
      status: typeof payload.status === "string" ? payload.status : undefined,
      payoutAccount: typeof payload.payoutAccount === "string" ? payload.payoutAccount : undefined,
      payoutChannel: typeof payload.payoutChannel === "string" ? payload.payoutChannel : undefined,
      payoutBatchNo: typeof payload.payoutBatchNo === "string" ? payload.payoutBatchNo : undefined,
      payoutReference: typeof payload.payoutReference === "string" ? payload.payoutReference : undefined,
      payoutOperator: typeof payload.payoutOperator === "string" ? payload.payoutOperator : undefined,
      payoutRequestedAt:
        typeof payload.payoutRequestedAt === "string" || payload.payoutRequestedAt instanceof Date
          ? payload.payoutRequestedAt
          : undefined,
      callbackStatus: typeof payload.callbackStatus === "string" ? payload.callbackStatus : undefined,
      callbackPayload: payload.callbackPayload ?? payload,
      callbackReceivedAt:
        typeof payload.callbackReceivedAt === "string" || payload.callbackReceivedAt instanceof Date
          ? payload.callbackReceivedAt
          : undefined,
      note: typeof payload.note === "string" ? payload.note : undefined,
      proofUrl: typeof payload.proofUrl === "string" ? payload.proofUrl : undefined,
      rejectionReason: typeof payload.rejectionReason === "string" ? payload.rejectionReason : undefined,
    });

    await recordAdminAuditLog({
      actorDisplayName: "system:payout-callback",
      actorRole: "system",
      action: "agent-payout-callback",
      scope: "agents.withdrawal.callback",
      targetType: "agent-withdrawal",
      targetId: result.withdrawalId,
      detail: `status: ${result.status} | callbackStatus: ${String(payload.callbackStatus || "").trim() || "--"} | payoutBatchNo: ${String(payload.payoutBatchNo || "").trim() || "--"} | payoutReference: ${String(payload.payoutReference || "").trim() || "--"} | lockedToSettled: ${result.lockedToSettled ? "yes" : "no"}`,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({
      ok: true,
      withdrawalId: result.withdrawalId,
      previousStatus: result.previousStatus,
      status: result.status,
      callbackReceivedAt: result.callbackReceivedAt,
      lockedToSettled: result.lockedToSettled,
      payoutBatchNo: String(payload.payoutBatchNo || "").trim() || undefined,
      payoutReference: String(payload.payoutReference || "").trim() || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent payout callback failed.";

    try {
      await recordAdminAuditLog({
        actorDisplayName: "system:payout-callback",
        actorRole: "system",
        action: "agent-payout-callback",
        scope: "agents.withdrawal.callback",
        targetType: "agent-withdrawal",
        targetId: withdrawalId,
        status: "failed",
        detail: message,
        ipAddress: getRequestIp(request),
      });
    } catch {
      // Ignore secondary logging errors for callback handling.
    }

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status:
          message === "AGENT_WITHDRAWAL_NOT_FOUND"
            ? 404
            : message === "AGENT_WITHDRAWAL_INVALID" || message === "AGENT_WITHDRAWAL_CALLBACK_INVALID"
              ? 400
              : message === "AGENT_WITHDRAWAL_INSUFFICIENT_COMMISSION" || message === "AGENT_WITHDRAWAL_LOCKED"
                ? 409
                : 500,
      },
    );
  }
}
