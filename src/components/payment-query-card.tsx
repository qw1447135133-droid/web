"use client";

import { useEffect, useState } from "react";
import type { DisplayLocale } from "@/lib/i18n-config";

type PaymentQueryOrderType = "coin-recharge" | "membership" | "content";

type PaymentQueryEvent = {
  id: string;
  provider: string;
  state: string;
  processingStatus: string;
  processingMessage?: string | null;
  duplicateCount: number;
  paymentReference?: string | null;
  providerOrderId?: string | null;
  lastSeenAt: string;
};

type PaymentQueryPayload = {
  providerQuery: {
    supported: boolean;
    mode?: string;
    message?: string | null;
    callbackEventCount: number;
    conflictCount: number;
    duplicateNotificationCount: number;
    lastCallbackAt?: string | null;
    events: PaymentQueryEvent[];
  };
};

function t(
  locale: DisplayLocale,
  zhCn: string,
  zhTw: string,
  en: string,
  th?: string,
  vi?: string,
  hi?: string,
) {
  if (locale === "zh-TW") {
    return zhTw;
  }

  if (locale === "en") {
    return en;
  }

  if (locale === "th") {
    return th ?? en;
  }

  if (locale === "vi") {
    return vi ?? en;
  }

  if (locale === "hi") {
    return hi ?? en;
  }

  return zhCn;
}

function formatDateTime(value: string, locale: DisplayLocale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProcessingTone(processingStatus: string) {
  if (processingStatus === "processed") {
    return "border-lime-300/20 bg-lime-300/10 text-lime-100";
  }

  if (processingStatus === "conflict" || processingStatus === "error") {
    return "border-rose-300/20 bg-rose-400/10 text-rose-100";
  }

  return "border-white/10 bg-white/[0.03] text-slate-200";
}

function getProcessingStatusLabel(status: string, locale: DisplayLocale) {
  if (status === "processed") {
    return t(locale, "已处理", "已處理", "Processed", "ประมวลผลแล้ว", "Da xu ly", "Processed");
  }

  if (status === "duplicate") {
    return t(locale, "重复通知", "重複通知", "Duplicate", "ซ้ำ", "Trung lap", "Duplicate");
  }

  if (status === "conflict") {
    return t(locale, "状态冲突", "狀態衝突", "Conflict", "ข้อมูลขัดแย้ง", "Xung dot trang thai", "Conflict");
  }

  if (status === "ignored") {
    return t(locale, "已忽略", "已忽略", "Ignored", "ละเว้นแล้ว", "Da bo qua", "Ignored");
  }

  return t(locale, "待处理", "待處理", "Pending", "รอดำเนินการ", "Dang cho xu ly", "Pending");
}

export function PaymentQueryCard({
  locale,
  orderId,
  orderType,
}: {
  locale: DisplayLocale;
  orderId: string;
  orderType: PaymentQueryOrderType;
}) {
  const [payload, setPayload] = useState<PaymentQueryPayload["providerQuery"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/payments/query?type=${encodeURIComponent(orderType)}&orderId=${encodeURIComponent(orderId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`QUERY_FAILED_${response.status}`);
        }

        const next = (await response.json()) as PaymentQueryPayload;
        setPayload(next.providerQuery);
      } catch (nextError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "QUERY_FAILED");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [orderId, orderType]);

  async function refresh() {
    try {
      setRefreshing(true);
      setError(null);

      const response = await fetch(
        `/api/payments/query?type=${encodeURIComponent(orderType)}&orderId=${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`QUERY_FAILED_${response.status}`);
      }

      const next = (await response.json()) as PaymentQueryPayload;
      setPayload(next.providerQuery);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "QUERY_FAILED");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">
            {t(locale, "支付跟踪", "支付追蹤", "Payment tracking", "ติดตามการชำระ", "Theo doi thanh toan", "Payment tracking")}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            {t(
              locale,
              "查单与回调记录",
              "查單與回調記錄",
              "Query and callback log",
              "บันทึกการตรวจสอบและ callback",
              "Tra cuu va nhat ky callback",
              "Query aur callback log",
            )}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            {t(
              locale,
              "这里会展示最近一次回调、重复通知次数和异常冲突，方便确认订单为何仍在处理中。",
              "這裡會展示最近一次回調、重複通知次數和異常衝突，方便確認訂單為何仍在處理中。",
              "Shows the latest callback, duplicate notifications, and conflicts so you can see why an order is still pending.",
              "แสดง callback ล่าสุด จำนวนแจ้งซ้ำ และความขัดแย้ง เพื่อช่วยตรวจสอบว่าทำไมออเดอร์ยังค้างอยู่",
              "Hien thi callback moi nhat, so lan thong bao trung va xung dot de biet vi sao don van dang xu ly.",
              "Latest callback, duplicate notifications aur conflicts yahan dikhte hain taaki pending reason samajh aaye.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing
            ? t(locale, "刷新中", "刷新中", "Refreshing", "กำลังรีเฟรช", "Dang lam moi", "Refreshing")
            : t(locale, "刷新查询", "刷新查詢", "Refresh query", "รีเฟรช", "Lam moi truy van", "Refresh query")}
        </button>
      </div>

      {loading ? (
        <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
          {t(locale, "正在加载支付跟踪结果…", "正在載入支付追蹤結果…", "Loading payment tracking…", "กำลังโหลดข้อมูลการชำระ…", "Dang tai du lieu thanh toan…", "Payment tracking load ho raha hai…")}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-4 py-5 text-sm text-rose-100">
          {t(locale, "支付查询暂时失败，请稍后再试。", "支付查詢暫時失敗，請稍後再試。", "Payment query is temporarily unavailable. Please try again.", "ดึงข้อมูลการชำระไม่สำเร็จ กรุณาลองใหม่", "Truy van thanh toan tam thoi that bai. Vui long thu lai.", "Payment query filhal fail hai. Kripya dobara try karein.")}
        </div>
      ) : null}

      {!loading && !error && payload ? (
        <>
          {!payload.supported ? (
            <div className="mt-6 rounded-[1.25rem] border border-sky-300/20 bg-sky-400/10 px-4 py-5 text-sm text-sky-100">
              <p className="font-medium text-white">
                {t(
                  locale,
                  "当前环境只展示站内回调与对账日志",
                  "當前環境只展示站內回調與對賬日誌",
                  "This environment shows local callback and reconciliation logs only",
                  "สภาพแวดล้อมนี้แสดงเฉพาะ callback และ log การกระทบยอดภายใน",
                  "Moi truong nay chi hien thi callback va nhat ky doi soat noi bo",
                  "Is environment mein sirf local callback aur reconciliation logs dikhaye ja rahe hain",
                )}
              </p>
              <p className="mt-2 leading-7 text-sky-50/90">
                {payload.message ??
                  t(
                    locale,
                    "第三方支付查单适配器尚未在当前环境启用，因此这里不会向外部通道发起实时查单。",
                    "第三方支付查單適配器尚未在當前環境啟用，因此這裡不會向外部通道發起即時查單。",
                    "External payment query adapters are not enabled here, so this card does not make live requests to third-party gateways.",
                    "ยังไม่ได้เปิดใช้งานตัวเชื่อม query กับผู้ให้บริการภายนอก จึงไม่มีการยิง query แบบเรียลไทม์ออกไป",
                    "Bo ket noi truy van thanh toan ben ngoai chua duoc bat o moi truong nay nen the nay khong goi query realtime ra ngoai.",
                    "External payment query adapters abhi enabled nahin hain, isliye yeh card third-party gateway ko live query nahin bhejta.",
                  )}
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "最近回调", "最近回調", "Last callback", "callback ล่าสุด", "Callback gan nhat", "Last callback")}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {payload.lastCallbackAt
                  ? formatDateTime(payload.lastCallbackAt, locale)
                  : t(locale, "暂无", "暫無", "No callback yet", "ยังไม่มี", "Chua co", "No callback yet")}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "通知统计", "通知統計", "Notifications", "สถิติแจ้งเตือน", "Thong bao", "Notifications")}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {payload.callbackEventCount} / {payload.duplicateNotificationCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t(locale, "总回调 / 重复通知", "總回調 / 重複通知", "Callbacks / duplicates", "callback / ซ้ำ", "Callback / trung lap", "Callbacks / duplicates")}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "冲突数量", "衝突數量", "Conflicts", "จำนวนความขัดแย้ง", "So xung dot", "Conflicts")}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{payload.conflictCount}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {payload.events.length > 0 ? (
              payload.events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className={`rounded-[1.2rem] border px-4 py-4 text-sm ${getProcessingTone(event.processingStatus)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{event.provider}</p>
                        <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] font-semibold">
                          {getProcessingStatusLabel(event.processingStatus, locale)}
                        </span>
                        <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px]">
                          {event.state}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{formatDateTime(event.lastSeenAt, locale)}</p>
                    </div>
                    {event.duplicateCount > 0 ? (
                      <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px]">
                        {t(locale, "重复", "重複", "Duplicate", "ซ้ำ", "Trung lap", "Duplicate")} x{event.duplicateCount}
                      </span>
                    ) : null}
                  </div>
                  {event.processingMessage ? (
                    <p className="mt-3 whitespace-pre-wrap break-words leading-6">{event.processingMessage}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    {event.paymentReference ? <span>Ref: {event.paymentReference}</span> : null}
                    {event.providerOrderId ? <span>ID: {event.providerOrderId}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                {t(locale, "当前还没有收到任何支付回调记录。", "目前還沒有收到任何支付回調記錄。", "No payment callbacks have been recorded yet.", "ยังไม่มีบันทึก callback", "Chua co callback thanh toan nao.", "Abhi tak koi callback record nahin mila.")}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
