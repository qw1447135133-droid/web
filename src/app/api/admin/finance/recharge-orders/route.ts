import { NextRequest, NextResponse } from "next/server";
import {
  adjustCoinAccountByAdmin,
  batchAdjustCoinAccountsByAdmin,
  batchUpdateCoinRechargeOrdersByAdmin,
  closeExpiredCoinRechargeOrders,
  closePendingCoinRechargeOrder,
  createFinanceReconciliationIssue,
  createManualCoinRechargeOrder,
  markCoinRechargeOrderFailedByAdmin,
  markCoinRechargeOrderPaidByAdmin,
  refundCoinRechargeOrderByAdmin,
  scanFinanceReconciliationIssues,
  updateFinanceReconciliationIssue,
} from "@/lib/admin-finance";
import { recordAdminAuditLog } from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=finance${suffix}`, request.url));
}

function redirectWithBatchResult(
  request: NextRequest,
  key: "batch-coin-adjustment" | "batch-coin-recharge-order" | "finance-reconciliation-scan",
  processedCount: number,
  totalCount: number,
  skippedCount = 0,
) {
  const failedCount = Math.max(0, totalCount - processedCount - skippedCount);
  return redirectToAdmin(
    request,
    `&saved=${key}&financeProcessed=${processedCount}&financeSkipped=${skippedCount}&financeFailed=${failedCount}&financeTotal=${totalCount}`,
  );
}

function parseBatchRefs(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function summarizeBatchRefs(refs: string[]) {
  if (refs.length === 0) {
    return "none";
  }

  if (refs.length <= 6) {
    return refs.join(", ");
  }

  return `${refs.slice(0, 6).join(", ")} ... (+${refs.length - 6})`;
}

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dfinance", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");
  const ipAddress = getRequestIp(request);
  const orderId = String(formData.get("orderId") || "").trim();
  const userId = String(formData.get("userId") || "").trim();
  const packageId = String(formData.get("packageId") || "").trim();
  const paymentReference = String(formData.get("paymentReference") || "").trim();
  const orderRef = String(formData.get("orderRef") || "").trim();
  const issueId = String(formData.get("issueId") || "").trim();
  const issueType = String(formData.get("issueType") || "").trim();
  const severity = String(formData.get("severity") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const assignedToDisplayName = String(formData.get("assignedToDisplayName") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const amount = Number.parseInt(String(formData.get("amount") || "0").trim(), 10);
  const selectedOrderIds = formData.getAll("orderIds").map((value) => String(value).trim()).filter(Boolean);
  const selectedUserIds = formData.getAll("userIds").map((value) => String(value).trim()).filter(Boolean);
  const batchRefs =
    selectedOrderIds.length > 0 || selectedUserIds.length > 0
      ? intent.startsWith("batch-manual-")
        ? selectedUserIds
        : selectedOrderIds
      : parseBatchRefs(formData.get("batchRefs"));

  try {
    if (intent === "create") {
      await createManualCoinRechargeOrder({
        userId,
        packageId,
        paymentReference,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "create-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "user",
        targetId: userId,
        detail: `packageId: ${packageId} | paymentReference: ${paymentReference || "--"}`,
        ipAddress,
      });
    } else if (intent === "mark-paid") {
      await markCoinRechargeOrderPaidByAdmin({
        orderId,
        paymentReference,
        allowRecoverFromTerminal: true,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "mark-coin-recharge-paid",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `paymentReference: ${paymentReference || "--"}`,
        ipAddress,
      });
    } else if (intent === "mark-failed") {
      await markCoinRechargeOrderFailedByAdmin({
        orderId,
        paymentReference,
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "mark-coin-recharge-failed",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `paymentReference: ${paymentReference || "--"} | reason: ${reason || "--"}`,
        ipAddress,
      });
    } else if (intent === "close") {
      await closePendingCoinRechargeOrder({
        orderId,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "close-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        ipAddress,
      });
    } else if (intent === "refund") {
      await refundCoinRechargeOrderByAdmin({
        orderId,
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "refund-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `reason: ${reason || "--"}`,
        ipAddress,
      });
    } else if (intent === "flag-reconciliation-issue") {
      const result = await createFinanceReconciliationIssue({
        orderRef: orderRef || orderId,
        paymentReference,
        issueType,
        severity,
        summary,
        detail: detail || reason,
        reasonCode: reason,
        createdByUserId: currentUser?.id,
        createdByDisplayName: session.displayName,
        assignedToDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "flag-finance-reconciliation-issue",
        scope: "finance.reconciliation-issue",
        targetType: "finance-reconciliation-issue",
        targetId: result.issue.id,
        detail: `orderRef: ${orderRef || orderId || "--"} | severity: ${severity || "--"} | issueType: ${issueType || "--"} | created: ${result.created ? "yes" : "no"}`,
        ipAddress,
      });
    } else if (
      intent === "assign-reconciliation-issue" ||
      intent === "review-reconciliation-issue" ||
      intent === "resolve-reconciliation-issue" ||
      intent === "ignore-reconciliation-issue" ||
      intent === "reopen-reconciliation-issue"
    ) {
      const nextStatus =
        intent === "assign-reconciliation-issue"
          ? undefined
          : intent === "review-reconciliation-issue"
          ? "reviewing"
          : intent === "resolve-reconciliation-issue"
            ? "resolved"
            : intent === "ignore-reconciliation-issue"
              ? "ignored"
              : "open";
      const issue = await updateFinanceReconciliationIssue({
        issueId,
        status: nextStatus,
        resolutionNote: reason || detail,
        assignedToDisplayName: assignedToDisplayName || session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: `${intent}`,
        scope: "finance.reconciliation-issue",
        targetType: "finance-reconciliation-issue",
        targetId: issue.id,
        detail: `status: ${issue.status} | note: ${reason || detail || "--"}`,
        ipAddress,
      });
    } else if (intent === "scan-reconciliation-issues") {
      const result = await scanFinanceReconciliationIssues({
        createdByUserId: currentUser?.id,
        createdByDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "scan-finance-reconciliation-issues",
        scope: "finance.reconciliation-issue",
        targetType: "scan",
        targetId: "coin-recharge",
        detail: `created: ${result.createdCount} | skipped: ${result.skippedCount} | total: ${result.totalCount}`,
        ipAddress,
      });
      return redirectWithBatchResult(
        request,
        "finance-reconciliation-scan",
        result.createdCount,
        result.totalCount,
        result.skippedCount,
      );
    } else if (intent === "manual-credit") {
      await adjustCoinAccountByAdmin({
        userId,
        direction: "credit",
        amount,
        note: reason,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "manual-credit-coins",
        scope: "finance.coin-account",
        targetType: "user",
        targetId: userId,
        detail: `amount: ${amount} | note: ${reason || "--"}`,
        ipAddress,
      });
    } else if (intent === "manual-debit") {
      await adjustCoinAccountByAdmin({
        userId,
        direction: "debit",
        amount,
        note: reason,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "manual-debit-coins",
        scope: "finance.coin-account",
        targetType: "user",
        targetId: userId,
        detail: `amount: ${amount} | note: ${reason || "--"}`,
        ipAddress,
      });
    } else if (intent === "batch-manual-credit") {
      const result = await batchAdjustCoinAccountsByAdmin({
        userRefs: batchRefs,
        direction: "credit",
        amount,
        note: reason,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-manual-credit-coins",
        scope: "finance.coin-account.batch",
        targetType: "batch-user",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount} | amount: ${amount} | note: ${reason || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-adjustment", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "batch-manual-debit") {
      const result = await batchAdjustCoinAccountsByAdmin({
        userRefs: batchRefs,
        direction: "debit",
        amount,
        note: reason,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-manual-debit-coins",
        scope: "finance.coin-account.batch",
        targetType: "batch-user",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount} | amount: ${amount} | note: ${reason || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-adjustment", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "batch-mark-paid") {
      const result = await batchUpdateCoinRechargeOrdersByAdmin({
        orderRefs: batchRefs,
        action: "mark-paid",
        paymentReference,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-mark-coin-recharge-paid",
        scope: "finance.coin-recharge-order.batch",
        targetType: "batch-order",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount} | paymentReference: ${paymentReference || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-recharge-order", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "batch-mark-failed") {
      const result = await batchUpdateCoinRechargeOrdersByAdmin({
        orderRefs: batchRefs,
        action: "mark-failed",
        paymentReference,
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-mark-coin-recharge-failed",
        scope: "finance.coin-recharge-order.batch",
        targetType: "batch-order",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount} | paymentReference: ${paymentReference || "--"} | reason: ${reason || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-recharge-order", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "batch-close") {
      const result = await batchUpdateCoinRechargeOrdersByAdmin({
        orderRefs: batchRefs,
        action: "close",
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-close-coin-recharge-order",
        scope: "finance.coin-recharge-order.batch",
        targetType: "batch-order",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-recharge-order", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "batch-refund") {
      const result = await batchUpdateCoinRechargeOrdersByAdmin({
        orderRefs: batchRefs,
        action: "refund",
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-refund-coin-recharge-order",
        scope: "finance.coin-recharge-order.batch",
        targetType: "batch-order",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `processedCount: ${result.processedCount} | reason: ${reason || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(request, "batch-coin-recharge-order", result.processedCount, batchRefs.length, result.skippedCount);
    } else if (intent === "close-expired") {
      await closeExpiredCoinRechargeOrders();
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "close-expired-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "cron-cleanup",
        targetId: "expired-pending-recharges",
        ipAddress,
      });
    } else {
      return redirectToAdmin(request, "&error=coin-recharge-order");
    }
  } catch (error) {
    try {
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: intent || "unknown-finance-action",
        scope: intent.startsWith("batch-") ? "finance.batch" : "finance",
        targetType: intent.startsWith("batch-") ? "batch" : "single",
        targetId: orderId || userId || summarizeBatchRefs(batchRefs) || packageId || "unknown-target",
        status: "failed",
        detail: error instanceof Error ? error.message : "unknown finance error",
        ipAddress,
      });
    } catch {
      // Ignore audit write failures so the finance action redirect still returns.
    }

    if (error instanceof Error && error.message === "COIN_ACCOUNT_INSUFFICIENT_BALANCE") {
      return redirectToAdmin(
        request,
        intent === "manual-debit" || intent === "batch-manual-debit"
        ? "&error=coin-adjustment-balance"
        : "&error=coin-recharge-order-balance",
      );
    }

    return redirectToAdmin(
      request,
      intent === "manual-credit" || intent === "manual-debit"
        ? "&error=coin-adjustment"
        : intent === "flag-reconciliation-issue" ||
            intent === "assign-reconciliation-issue" ||
            intent === "review-reconciliation-issue" ||
            intent === "resolve-reconciliation-issue" ||
            intent === "ignore-reconciliation-issue" ||
            intent === "reopen-reconciliation-issue" ||
            intent === "scan-reconciliation-issues"
          ? "&error=finance-reconciliation-issue"
          : intent === "batch-manual-credit" || intent === "batch-manual-debit"
            ? "&error=batch-coin-adjustment"
            : intent === "close-expired"
            ? "&error=coin-expiry"
            : intent.startsWith("batch-")
              ? "&error=batch-coin-recharge-order"
              : "&error=coin-recharge-order",
    );
  }

  return redirectToAdmin(
    request,
    intent === "manual-credit" || intent === "manual-debit"
      ? "&saved=coin-adjustment"
      : intent === "flag-reconciliation-issue" ||
          intent === "assign-reconciliation-issue" ||
          intent === "review-reconciliation-issue" ||
          intent === "resolve-reconciliation-issue" ||
          intent === "ignore-reconciliation-issue" ||
          intent === "reopen-reconciliation-issue"
        ? "&saved=finance-reconciliation-issue"
      : intent === "close-expired"
        ? "&saved=coin-expiry"
        : "&saved=coin-recharge-order",
  );
}
