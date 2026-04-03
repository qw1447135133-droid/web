import type { Locale } from "@/lib/i18n";

type OpsCopy = {
  checkout: {
    providerLabel: string;
    pendingWindowLabel: string;
    callbackStatusLabel: string;
    callbackStatusReady: string;
    callbackStatusMissing: string;
    callbackEndpointLabel: string;
    manualTitle: string;
    manualDescription: string;
    manualSteps: string[];
    callbackHint: string;
    pendingReviewBadge: string;
    referenceLabel: string;
    adminWillProcess: string;
  };
  adminOrders: {
    statusSaved: string;
    statusFailed: string;
    markPaid: string;
    markFailed: string;
    closePending: string;
    paymentReferenceLabel: string;
    failureReasonLabel: string;
    actionHint: string;
  };
  sync: {
    dashboardTitle: string;
    dashboardDescription: string;
    sourceLabel: string;
    sourceValue: string;
    syncSaved: string;
    syncFailed: string;
    latestRuns: string;
    triggerEndpointLabel: string;
    cronHint: string;
    alreadyRunning: string;
    running: string;
    noRuns: string;
    failures: string;
    counts: string;
    duration: string;
    startedAt: string;
    finishedAt: string;
  };
};

const zhCnCopy: OpsCopy = {
  checkout: {
    providerLabel: "支付模式",
    pendingWindowLabel: "订单保留时长",
    callbackStatusLabel: "回调令牌",
    callbackStatusReady: "已配置",
    callbackStatusMissing: "未配置",
    callbackEndpointLabel: "回调地址",
    manualTitle: "订单已创建，等待人工核销",
    manualDescription: "当前站点已切到人工审核收款模式。用户完成转账、二维码付款或线下收款后，由运营在后台核销订单。",
    manualSteps: [
      "保留当前订单号与支付流水，便于运营核对。",
      "完成实际收款后，后台可将订单改成已支付、失败或已关闭。",
      "会员与内容权益会在后台确认支付后即时生效。",
    ],
    callbackHint: "后续接入微信、支付宝或聚合支付时，可直接复用统一支付回调接口，不需要重做订单状态机。",
    pendingReviewBadge: "待人工审核",
    referenceLabel: "支付流水号",
    adminWillProcess: "如你已完成线下付款，请联系运营处理当前订单。",
  },
  adminOrders: {
    statusSaved: "订单状态已更新。",
    statusFailed: "订单状态更新失败，请检查当前状态是否允许变更。",
    markPaid: "标记已支付",
    markFailed: "标记失败",
    closePending: "关闭待支付订单",
    paymentReferenceLabel: "支付流水",
    failureReasonLabel: "失败原因",
    actionHint: "待支付订单现在支持后台人工核销，适合先接线下转账、代收款或外部支付回调。",
  },
  sync: {
    dashboardTitle: "同步运行状态",
    dashboardDescription: "查看最近同步记录、失败详情与定时触发入口。当前按 API-Sports 免费额度执行稳定轮转同步，而不是每次全量抓取。",
    sourceLabel: "数据源",
    sourceValue: "API-Sports 免费版",
    syncSaved: "同步任务已触发，最新执行记录已经刷新。",
    syncFailed: "同步任务执行失败，请检查最近一次运行记录。",
    latestRuns: "最近运行记录",
    triggerEndpointLabel: "定时触发接口",
    cronHint: "服务器定时任务可调用内部接口并携带 `SYNC_TRIGGER_TOKEN`，无需登录后台。",
    alreadyRunning: "已有同步任务在执行中，系统已阻止重复触发。",
    running: "运行中",
    noRuns: "暂无同步记录。",
    failures: "失败项",
    counts: "同步量",
    duration: "耗时",
    startedAt: "开始时间",
    finishedAt: "结束时间",
  },
};

const zhTwCopy: OpsCopy = {
  checkout: {
    providerLabel: "支付模式",
    pendingWindowLabel: "訂單保留時長",
    callbackStatusLabel: "回調令牌",
    callbackStatusReady: "已配置",
    callbackStatusMissing: "未配置",
    callbackEndpointLabel: "回調位址",
    manualTitle: "訂單已建立，等待人工核銷",
    manualDescription: "目前站點已切到人工審核收款模式。使用者完成轉帳、二維碼付款或線下收款後，由營運在後台核銷訂單。",
    manualSteps: [
      "保留目前訂單號與支付流水，方便營運核對。",
      "完成實際收款後，後台可將訂單改成已支付、失敗或已關閉。",
      "會員與內容權益會在後台確認支付後即時生效。",
    ],
    callbackHint: "後續接入微信、支付寶或聚合支付時，可直接復用統一支付回調介面，不需要重做訂單狀態機。",
    pendingReviewBadge: "待人工審核",
    referenceLabel: "支付流水號",
    adminWillProcess: "如果你已完成線下付款，請聯絡營運處理目前訂單。",
  },
  adminOrders: {
    statusSaved: "訂單狀態已更新。",
    statusFailed: "訂單狀態更新失敗，請檢查目前狀態是否允許變更。",
    markPaid: "標記已支付",
    markFailed: "標記失敗",
    closePending: "關閉待支付訂單",
    paymentReferenceLabel: "支付流水",
    failureReasonLabel: "失敗原因",
    actionHint: "待支付訂單現在支援後台人工核銷，適合先接線下轉帳、代收款或外部支付回調。",
  },
  sync: {
    dashboardTitle: "同步執行狀態",
    dashboardDescription: "查看最近同步紀錄、失敗詳情與定時觸發入口。目前按 API-Sports 免費額度執行穩定輪轉同步，而不是每次全量抓取。",
    sourceLabel: "資料源",
    sourceValue: "API-Sports 免費版",
    syncSaved: "同步任務已觸發，最新執行紀錄已刷新。",
    syncFailed: "同步任務執行失敗，請檢查最近一次執行紀錄。",
    latestRuns: "最近執行紀錄",
    triggerEndpointLabel: "定時觸發介面",
    cronHint: "伺服器定時任務可呼叫內部介面並攜帶 `SYNC_TRIGGER_TOKEN`，不需要登入後台。",
    alreadyRunning: "已有同步任務執行中，系統已阻止重複觸發。",
    running: "執行中",
    noRuns: "暫無同步紀錄。",
    failures: "失敗項",
    counts: "同步量",
    duration: "耗時",
    startedAt: "開始時間",
    finishedAt: "完成時間",
  },
};

const enCopy: OpsCopy = {
  checkout: {
    providerLabel: "Payment mode",
    pendingWindowLabel: "Pending window",
    callbackStatusLabel: "Callback token",
    callbackStatusReady: "Configured",
    callbackStatusMissing: "Missing",
    callbackEndpointLabel: "Callback endpoint",
    manualTitle: "Order created and awaiting manual reconciliation",
    manualDescription: "The site is currently running in manual review mode. After a bank transfer, QR payment, or offline collection is completed, operations can reconcile the order from the admin console.",
    manualSteps: [
      "Keep the order ID and payment reference for reconciliation.",
      "Operations can mark the order as paid, failed, or closed from the admin console.",
      "Membership and content entitlements activate immediately after the order is confirmed as paid.",
    ],
    callbackHint: "When WeChat Pay, Alipay, or an aggregator is connected later, the same callback endpoint and order state machine can be reused.",
    pendingReviewBadge: "Awaiting review",
    referenceLabel: "Payment reference",
    adminWillProcess: "If the payment was completed offline, ask operations to reconcile this order.",
  },
  adminOrders: {
    statusSaved: "Order status updated.",
    statusFailed: "Order status update failed. Check whether the current order state allows that transition.",
    markPaid: "Mark paid",
    markFailed: "Mark failed",
    closePending: "Close pending order",
    paymentReferenceLabel: "Payment reference",
    failureReasonLabel: "Failure reason",
    actionHint: "Pending orders now support manual reconciliation from the admin side, which works well for offline transfers, collected payments, or external callbacks.",
  },
  sync: {
    dashboardTitle: "Sync runtime",
    dashboardDescription: "Review recent sync runs, failures, and the scheduled trigger entry. The pipeline now rotates leagues to stay within the API-Sports free-tier request budget.",
    sourceLabel: "Data source",
    sourceValue: "API-Sports free tier",
    syncSaved: "The sync job was triggered and the latest run history was refreshed.",
    syncFailed: "The sync job failed. Review the latest run history.",
    latestRuns: "Recent runs",
    triggerEndpointLabel: "Scheduled trigger endpoint",
    cronHint: "Server cron jobs can call the internal endpoint with `SYNC_TRIGGER_TOKEN` and do not need an admin login.",
    alreadyRunning: "A sync job is already in progress, so duplicate execution was blocked.",
    running: "Running",
    noRuns: "No sync runs yet.",
    failures: "Failures",
    counts: "Counts",
    duration: "Duration",
    startedAt: "Started",
    finishedAt: "Finished",
  },
};

export function getOpsCopy(locale: Locale): OpsCopy {
  if (locale === "zh-TW") {
    return zhTwCopy;
  }

  if (locale === "en") {
    return enCopy;
  }

  return zhCnCopy;
}
