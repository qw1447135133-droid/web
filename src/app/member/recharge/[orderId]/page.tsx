import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getPaymentProviderLabel } from "@/lib/payment-provider";
import { getCurrentUserRecord } from "@/lib/session";
import { getMemberCoinRechargeDetail } from "@/lib/coin-wallet";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function tRecharge(
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

function formatCoinAmount(amount: number, locale: DisplayLocale) {
  const formatted = new Intl.NumberFormat(locale).format(amount);

  if (locale === "en") {
    return `${formatted} coins`;
  }

  if (locale === "zh-TW") {
    return `${formatted} 球幣`;
  }

  if (locale === "th") {
    return `${formatted} เหรียญ`;
  }

  if (locale === "vi") {
    return `${formatted} coin`;
  }

  if (locale === "hi") {
    return `${formatted} coins`;
  }

  return `${formatted} 球币`;
}

function getRechargeStatusMeta(
  status: "pending" | "paid" | "failed" | "closed" | "refunded",
  locale: DisplayLocale,
) {
  switch (status) {
    case "paid":
      return {
        label: tRecharge(locale, "已入账", "已入帳", "Credited", "เข้ายอดแล้ว", "Da ghi co", "Credited"),
        className: "border border-lime-300/20 bg-lime-300/10 text-lime-100",
      };
    case "failed":
      return {
        label: tRecharge(locale, "处理失败", "處理失敗", "Failed", "ล้มเหลว", "That bai", "Failed"),
        className: "border border-rose-300/20 bg-rose-400/10 text-rose-100",
      };
    case "closed":
      return {
        label: tRecharge(locale, "已关闭", "已關閉", "Closed", "ปิดแล้ว", "Da dong", "Closed"),
        className: "border border-slate-300/20 bg-slate-400/10 text-slate-100",
      };
    case "refunded":
      return {
        label: tRecharge(locale, "已退款", "已退款", "Refunded", "คืนเงินแล้ว", "Da hoan tien", "Refunded"),
        className: "border border-violet-300/20 bg-violet-400/10 text-violet-100",
      };
    default:
      return {
        label: tRecharge(locale, "待审核", "待審核", "Pending", "รอตรวจสอบ", "Dang cho duyet", "Pending"),
        className: "border border-amber-300/20 bg-amber-300/10 text-amber-100",
      };
  }
}

function getRechargeMessage(recharge: string, locale: DisplayLocale) {
  if (recharge === "cancelled") {
    return {
      className: "rounded-[1.25rem] border border-slate-300/20 bg-slate-400/10 px-5 py-4 text-sm text-slate-100",
      message: tRecharge(
        locale,
        "充值申请已撤销，不会继续入账。",
        "充值申請已撤銷，不會繼續入帳。",
        "The recharge request has been cancelled and will not be credited.",
        "ยกเลิกคำขอเติมเงินแล้ว และจะไม่เข้ายอด",
        "Da huy yeu cau nap coin va se khong duoc ghi co.",
        "Recharge request cancel ho gayi hai aur credit nahi hoga.",
      ),
    };
  }

  if (recharge === "error" || recharge === "cancel-error") {
    return {
      className: "rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message: tRecharge(
        locale,
        recharge === "cancel-error" ? "这笔充值申请当前无法撤销。" : "操作失败，请稍后重试。",
        recharge === "cancel-error" ? "這筆充值申請目前無法撤銷。" : "操作失敗，請稍後重試。",
        recharge === "cancel-error" ? "This recharge request could not be cancelled." : "The action failed. Please try again.",
        recharge === "cancel-error" ? "คำขอนี้ยังไม่สามารถยกเลิกได้" : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
        recharge === "cancel-error" ? "Yeu cau nap coin nay hien khong the huy." : "Thao tac that bai, vui long thu lai.",
        recharge === "cancel-error" ? "Yeh recharge request abhi cancel nahi ho sakti." : "Action fail ho gaya. Kripya dobara koshish karein.",
      ),
    };
  }

  return null;
}

function renderReasonBlock(
  label: string,
  value: string | undefined,
  tone: "danger" | "info" = "danger",
) {
  if (!value) {
    return null;
  }

  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
        tone === "info"
          ? "border-sky-300/20 bg-sky-400/10 text-sky-100"
          : "border-rose-300/20 bg-rose-400/10 text-rose-100"
      }`}
    >
      <p className="font-medium">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm/6">{value}</p>
    </div>
  );
}

export default async function MemberRechargeDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ orderId }, resolved, displayLocale] = await Promise.all([params, searchParams, getCurrentDisplayLocale()]);
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent(`/member/recharge/${orderId}`)}`);
  }

  const recharge = readValue(resolved.recharge);
  const order = await getMemberCoinRechargeDetail(currentUser.id, orderId, displayLocale);

  if (!order) {
    notFound();
  }

  const statusMeta = getRechargeStatusMeta(order.status, displayLocale);
  const feedback = getRechargeMessage(recharge, displayLocale);
  const providerLabel = order.provider ? getPaymentProviderLabel(order.provider, displayLocale) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            eyebrow={tRecharge(displayLocale, "充值详情", "充值詳情", "Recharge detail", "รายละเอียดการเติมเงิน", "Chi tiet nap coin", "Recharge detail")}
            title={order.packageTitle}
            description={tRecharge(
              displayLocale,
              "查看订单状态、入账时间、人工核对流水和处理结果。",
              "查看訂單狀態、入帳時間、人工核對流水和處理結果。",
              "Review the order state, credit timing, verification reference, and handling result.",
              "ดูสถานะออเดอร์ เวลาเข้ายอด และผลการตรวจสอบ",
              "Xem trang thai don, thoi gian ghi co va ket qua xu ly.",
              "Order state, credit timing aur handling result dekhein.",
            )}
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/member"
              className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300/30 hover:text-white"
            >
              {tRecharge(displayLocale, "返回会员中心", "返回會員中心", "Back to member center", "กลับศูนย์สมาชิก", "Quay lai trung tam hoi vien", "Member center par wapas")}
            </Link>
            {order.status === "pending" ? (
              <form action="/api/member/recharge-coins/cancel" method="post">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={`/member/recharge/${order.id}`} />
                <button
                  type="submit"
                  className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
                >
                  {tRecharge(displayLocale, "撤销申请", "撤銷申請", "Cancel request", "ยกเลิกคำขอ", "Huy yeu cau", "Request cancel karein")}
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {feedback ? <div className="mt-6"><div className={feedback.className}>{feedback.message}</div></div> : null}

        <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">
                {tRecharge(displayLocale, "订单号", "訂單號", "Order number", "เลขออเดอร์", "Ma don", "Order number")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{order.orderNo}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {tRecharge(displayLocale, "总球币", "總球幣", "Total coins", "เหรียญรวม", "Tong coin", "Total coins")}
              </p>
              <p className="mt-2 text-xl font-semibold text-sky-100">{formatCoinAmount(order.totalCoins, displayLocale)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {tRecharge(displayLocale, "基础球币", "基礎球幣", "Base coins", "เหรียญพื้นฐาน", "Coin co ban", "Base coins")}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCoinAmount(order.coinAmount, displayLocale)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {tRecharge(displayLocale, "赠送球币", "贈送球幣", "Bonus coins", "เหรียญโบนัส", "Coin tang them", "Bonus coins")}
              </p>
              <p className="mt-2 text-xl font-semibold text-orange-100">{formatCoinAmount(order.bonusAmount, displayLocale)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {tRecharge(displayLocale, "应付金额", "應付金額", "Amount due", "ยอดชำระ", "So tien can thanh toan", "Amount due")}
              </p>
              <p className="mt-2 text-xl font-semibold text-lime-100">{formatPrice(order.amount, displayLocale)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={tRecharge(displayLocale, "处理时间线", "處理時間線", "Timeline", "ไทม์ไลน์", "Moc thoi gian", "Timeline")}
            title={tRecharge(displayLocale, "订单处理节点", "訂單處理節點", "Order lifecycle", "สถานะการดำเนินการ", "Tien trinh don", "Order lifecycle")}
          />
          <div className="mt-6 space-y-3">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{tRecharge(displayLocale, "创建时间", "建立時間", "Created", "สร้างเมื่อ", "Tao luc", "Created")}</p>
              <p className="mt-2 text-white">{formatDateTime(order.createdAt, displayLocale)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{tRecharge(displayLocale, "更新时间", "更新時間", "Updated", "อัปเดตเมื่อ", "Cap nhat luc", "Updated")}</p>
              <p className="mt-2 text-white">{formatDateTime(order.updatedAt, displayLocale)}</p>
            </div>
            {order.paidAt ? (
              <div className="rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 p-4">
                <p className="text-sm text-lime-100/80">{tRecharge(displayLocale, "财务确认", "財務確認", "Confirmed", "ยืนยันแล้ว", "Da xac nhan", "Confirmed")}</p>
                <p className="mt-2 text-lime-50">{formatDateTime(order.paidAt, displayLocale)}</p>
              </div>
            ) : null}
            {order.creditedAt ? (
              <div className="rounded-[1.25rem] border border-sky-300/20 bg-sky-400/10 p-4">
                <p className="text-sm text-sky-100/80">{tRecharge(displayLocale, "入账时间", "入帳時間", "Credited at", "เข้ายอดเมื่อ", "Ghi co luc", "Credited at")}</p>
                <p className="mt-2 text-sky-50">{formatDateTime(order.creditedAt, displayLocale)}</p>
              </div>
            ) : null}
            {order.failedAt ? (
              <div className="rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 p-4">
                <p className="text-sm text-rose-100/80">{tRecharge(displayLocale, "失败时间", "失敗時間", "Failed at", "ล้มเหลวเมื่อ", "That bai luc", "Failed at")}</p>
                <p className="mt-2 text-rose-50">{formatDateTime(order.failedAt, displayLocale)}</p>
              </div>
            ) : null}
            {order.closedAt ? (
              <div className="rounded-[1.25rem] border border-slate-300/20 bg-slate-400/10 p-4">
                <p className="text-sm text-slate-100/80">{tRecharge(displayLocale, "关闭时间", "關閉時間", "Closed at", "ปิดเมื่อ", "Dong luc", "Closed at")}</p>
                <p className="mt-2 text-slate-50">{formatDateTime(order.closedAt, displayLocale)}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={tRecharge(displayLocale, "流水信息", "流水資訊", "Reference data", "ข้อมูลอ้างอิง", "Thong tin doi chieu", "Reference data")}
              title={tRecharge(displayLocale, "核对字段", "核對欄位", "Verification fields", "ข้อมูลสำหรับตรวจสอบ", "Truong doi chieu", "Verification fields")}
            />
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-slate-500">{tRecharge(displayLocale, "支付流水", "支付流水", "Payment reference", "เลขอ้างอิงการชำระ", "Ma tham chieu thanh toan", "Payment reference")}</p>
                <p className="mt-2 break-all text-white">{order.paymentReference ?? "-"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-slate-500">{tRecharge(displayLocale, "通道类型", "通道類型", "Provider", "ผู้ให้บริการ", "Kenh thanh toan", "Provider")}</p>
                <p className="mt-2 text-white">{providerLabel ?? "-"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-slate-500">{tRecharge(displayLocale, "通道单号", "通道單號", "Provider order ID", "เลขออเดอร์ช่องทาง", "Ma don kenh", "Provider order ID")}</p>
                <p className="mt-2 break-all text-white">{order.providerOrderId ?? "-"}</p>
              </div>
            </div>
          </div>

          {renderReasonBlock(
            tRecharge(displayLocale, "失败原因", "失敗原因", "Failure reason", "สาเหตุที่ล้มเหลว", "Ly do that bai", "Failure reason"),
            order.failureReason,
          )}
          {renderReasonBlock(
            tRecharge(displayLocale, "退款原因", "退款原因", "Refund reason", "เหตุผลการคืนเงิน", "Ly do hoan tien", "Refund reason"),
            order.refundReason,
            "info",
          )}
          {renderReasonBlock(
            tRecharge(displayLocale, "回调内容", "回調內容", "Callback payload", "ข้อมูล callback", "Noi dung callback", "Callback payload"),
            order.callbackPayload,
            "info",
          )}
        </div>
      </section>
    </div>
  );
}
