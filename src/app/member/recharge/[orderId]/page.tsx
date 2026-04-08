import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentQueryCard } from "@/components/payment-query-card";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import {
  getPaymentCheckoutActionTargets,
  getPaymentCheckoutFlow,
  getPaymentLaunchRedirectPath,
} from "@/lib/payment-gateway";
import { getPaymentProviderLabel } from "@/lib/payment-provider";
import { parsePaymentRouteSnapshot } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";
import { getMemberCoinRechargeDetail, getMemberRechargeCollectionGuide } from "@/lib/coin-wallet";

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

function getManualCollectionCopy(locale: DisplayLocale) {
  return {
    title: tRecharge(locale, "付款指引", "付款指引", "Payment guide", "คู่มือการชำระ", "Huong dan thanh toan", "Payment guide"),
    description: tRecharge(
      locale,
      "请按收款信息完成转账，并保留支付流水供财务核对。",
      "請依收款資訊完成轉帳，並保留支付流水供財務核對。",
      "Please transfer using the collection details below and keep the payment reference for finance review.",
      "กรุณาโอนตามข้อมูลด้านล่างและเก็บเลขอ้างอิงไว้เพื่อตรวจสอบ",
      "Hay chuyen khoan theo thong tin ben duoi va giu lai ma tham chieu de doi chieu.",
      "Neeche diye gaye details par transfer karein aur payment reference sambhal kar rakhein.",
    ),
    channel: tRecharge(locale, "收款通道", "收款通道", "Collection channel", "ช่องทางรับเงิน", "Kenh thu tien", "Collection channel"),
    accountName: tRecharge(locale, "收款户名", "收款戶名", "Account name", "ชื่อบัญชี", "Ten tai khoan", "Account name"),
    accountNo: tRecharge(locale, "收款账号", "收款帳號", "Account / wallet", "เลขบัญชี / วอลเล็ท", "Tai khoan / vi", "Account / wallet"),
    qrCode: tRecharge(locale, "收款二维码", "收款二維碼", "QR code", "คิวอาร์โค้ด", "Ma QR", "QR code"),
    qrOpen: tRecharge(locale, "打开图片", "打開圖片", "Open image", "เปิดรูปภาพ", "Mo anh", "Open image"),
    note: tRecharge(locale, "付款备注", "付款備註", "Payment note", "หมายเหตุการชำระเงิน", "Ghi chu thanh toan", "Payment note"),
    missing: tRecharge(
      locale,
      "当前还未配置人工收款信息，请保留订单号和支付流水联系运营。",
      "當前還未配置人工收款資訊，請保留訂單號和支付流水聯繫運營。",
      "Manual collection details are not configured yet. Save the order and payment reference, then contact operations.",
      "ยังไม่ได้ตั้งค่าข้อมูลรับชำระ กรุณาเก็บเลขออเดอร์และเลขอ้างอิงไว้แล้วติดต่อทีมงาน",
      "Thong tin thu tien thu cong chua duoc cau hinh. Hay luu ma don va ma tham chieu roi lien he van hanh.",
      "Manual collection details abhi configured nahin hain. Order aur payment reference save karke operations se sampark karein.",
    ),
  };
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

  if (recharge === "proof-saved") {
    return {
      className: "rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 px-5 py-4 text-sm text-lime-100",
      message: tRecharge(
        locale,
        "付款凭证已提交，财务核对后会继续处理。",
        "付款憑證已提交，財務核對後會繼續處理。",
        "Payment proof submitted. Finance will continue after verification.",
        "ส่งหลักฐานการชำระแล้ว ทีมการเงินจะตรวจสอบต่อ",
        "Da gui chung tu thanh toan. Bo phan tai chinh se tiep tuc doi chieu.",
        "Payment proof submit ho gaya hai. Finance verify karke aage process karegi.",
      ),
    };
  }

  if (recharge === "error" || recharge === "cancel-error" || recharge === "proof-error") {
    return {
      className: "rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message: tRecharge(
        locale,
        recharge === "cancel-error" ? "这笔充值申请当前无法撤销." : recharge === "proof-error" ? "付款凭证提交失败，请检查图片格式或稍后重试." : "操作失败，请稍后重试.",
        recharge === "cancel-error" ? "這筆充值申請目前無法撤銷." : recharge === "proof-error" ? "付款憑證提交失敗，請檢查圖片格式或稍後重試." : "操作失敗，請稍後重試.",
        recharge === "cancel-error" ? "This recharge request could not be cancelled." : recharge === "proof-error" ? "Payment proof upload failed. Check the image format and try again." : "The action failed. Please try again.",
        recharge === "cancel-error" ? "คำขอนี้ยังไม่สามารถยกเลิกได้" : recharge === "proof-error" ? "อัปโหลดหลักฐานการชำระไม่สำเร็จ กรุณาตรวจสอบไฟล์ภาพแล้วลองใหม่" : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
        recharge === "cancel-error" ? "Yeu cau nap coin nay hien khong the huy." : recharge === "proof-error" ? "Tai len chung tu thanh toan that bai. Hay kiem tra dinh dang anh roi thu lai." : "Thao tac that bai, vui long thu lai.",
        recharge === "cancel-error" ? "Yeh recharge request abhi cancel nahi ho sakti." : recharge === "proof-error" ? "Payment proof upload fail ho gaya. Image format check karke phir try karein." : "Action fail ho gaya. Kripya dobara koshish karein."
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

  const routeSnapshot = parsePaymentRouteSnapshot(order.callbackPayload);
  const rechargeCollectionGuide = await getMemberRechargeCollectionGuide(currentUser.countryCode, routeSnapshot);

  const statusMeta = getRechargeStatusMeta(order.status, displayLocale);
  const feedback = getRechargeMessage(recharge, displayLocale);
  const providerLabel = order.provider ? getPaymentProviderLabel(order.provider, displayLocale) : undefined;
  const checkoutFlow = getPaymentCheckoutFlow(order.provider ?? "manual");
  const paymentActions = getPaymentCheckoutActionTargets({
    type: "coin-recharge",
    orderId: order.id,
    returnTo: `/member/recharge/${order.id}`,
  });
  const hostedLaunchPath = getPaymentLaunchRedirectPath({
    provider: order.provider ?? "manual",
    type: "coin-recharge",
    orderId: order.id,
    returnTo: `/member/recharge/${order.id}`,
  });
  const manualCollectionCopy = getManualCollectionCopy(displayLocale);

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
            {order.status === "pending" && checkoutFlow.mode === "hosted-redirect" ? (
              <Link
                href={hostedLaunchPath}
                className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                {tRecharge(displayLocale, "前往支付通道", "前往支付通道", "Open payment gateway", "ไปยังหน้าชำระเงิน", "Mo cong thanh toan", "Payment gateway kholen")}
              </Link>
            ) : null}
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
            {order.expiresAt ? (
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{tRecharge(displayLocale, "支付时效", "支付時效", "Payment window", "ระยะเวลาชำระ", "Han thanh toan", "Payment window")}</p>
                <p className="mt-2 text-white">{formatDateTime(order.expiresAt, displayLocale)}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <PaymentQueryCard locale={displayLocale} orderId={order.id} orderType="coin-recharge" />

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
              {rechargeCollectionGuide.countryLabel ? (
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-slate-500">{tRecharge(displayLocale, "国家/地区路由", "國家 / 地區路由", "Country route", "เส้นทางประเทศ", "Tuyen quoc gia", "Country route")}</p>
                  <p className="mt-2 text-white">
                    {rechargeCollectionGuide.countryLabel}
                    {rechargeCollectionGuide.currency ? ` · ${rechargeCollectionGuide.currency}` : ""}
                  </p>
                </div>
              ) : null}
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-slate-500">{tRecharge(displayLocale, "通道单号", "通道單號", "Provider order ID", "เลขออเดอร์ช่องทาง", "Ma don kenh", "Provider order ID")}</p>
                <p className="mt-2 break-all text-white">{order.providerOrderId ?? "-"}</p>
              </div>
            </div>
          </div>

          {order.status === "pending" && checkoutFlow.mode === "mock-actions" ? (
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={tRecharge(displayLocale, "模拟支付", "模擬支付", "Mock payment", "ชำระเงินจำลอง", "Thanh toan mo phong", "Mock payment")}
                title={tRecharge(displayLocale, "开发环境支付动作", "開發環境支付動作", "Development actions", "คำสั่ง dev", "Thao tac dev", "Development actions")}
                description={tRecharge(
                  displayLocale,
                  "当前充值单走 mock 通道，可直接触发成功、失败或关闭，方便联调支付流程。",
                  "當前充值單走 mock 通道，可直接觸發成功、失敗或關閉，方便聯調支付流程。",
                  "This recharge order uses the mock provider. You can trigger paid, failed, or closed states directly.",
                  "ออเดอร์นี้ใช้ mock provider และสามารถจำลองผลลัพธ์ได้ทันที",
                  "Don nap coin nay dang dung mock provider va co the gia lap ket qua truc tiep.",
                  "Yeh recharge order mock provider use kar raha hai. Aap direct paid, failed ya closed state trigger kar sakte hain."
                )}
              />
              <div className="mt-6 flex flex-wrap gap-3">
                <form action={paymentActions.confirm.action} method="post">
                  <input type="hidden" name="type" value={paymentActions.confirm.type} />
                  <input type="hidden" name="orderId" value={paymentActions.confirm.orderId} />
                  <input type="hidden" name="returnTo" value={paymentActions.confirm.returnTo} />
                  <button type="submit" className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-200">
                    {tRecharge(displayLocale, "模拟成功", "模擬成功", "Mark paid", "จำลองสำเร็จ", "Gia lap thanh cong", "Mark paid")}
                  </button>
                </form>
                <form action={paymentActions.fail.action} method="post">
                  <input type="hidden" name="type" value={paymentActions.fail.type} />
                  <input type="hidden" name="orderId" value={paymentActions.fail.orderId} />
                  <input type="hidden" name="returnTo" value={paymentActions.fail.returnTo} />
                  <button type="submit" className="rounded-full bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-300">
                    {tRecharge(displayLocale, "模拟失败", "模擬失敗", "Mark failed", "จำลองล้มเหลว", "Gia lap that bai", "Mark failed")}
                  </button>
                </form>
                <form action={paymentActions.cancel.action} method="post">
                  <input type="hidden" name="type" value={paymentActions.cancel.type} />
                  <input type="hidden" name="orderId" value={paymentActions.cancel.orderId} />
                  <input type="hidden" name="returnTo" value={paymentActions.cancel.returnTo} />
                  <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]">
                    {tRecharge(displayLocale, "模拟关闭", "模擬關閉", "Close order", "ปิดออเดอร์", "Dong don", "Close order")}
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {order.status === "pending" && checkoutFlow.mode !== "mock-actions" ? (
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={manualCollectionCopy.title}
                title={
                  checkoutFlow.mode === "hosted-redirect"
                    ? tRecharge(displayLocale, "支付路由信息", "支付路由資訊", "Payment route details", "ข้อมูลเส้นทางการชำระ", "Thong tin dieu huong thanh toan", "Payment route details")
                    : tRecharge(displayLocale, "待支付收款信息", "待支付收款資訊", "Collection details", "ข้อมูลรับชำระ", "Thong tin thu tien", "Collection details")
                }
                description={
                  rechargeCollectionGuide.memberGuide ??
                  (checkoutFlow.mode === "hosted-redirect"
                    ? tRecharge(
                        displayLocale,
                        "这笔订单会跳转到托管支付页完成支付。下方展示当前国家路由和可用方式。",
                        "這筆訂單會跳轉到託管支付頁完成支付。下方展示當前國家路由和可用方式。",
                        "This order continues on a hosted payment page. The route information and methods are shown below.",
                        "ออเดอร์นี้จะไปที่หน้าชำระเงินของผู้ให้บริการ โดยด้านล่างจะแสดงข้อมูลเส้นทางและวิธีชำระ",
                        "Don nay se chuyen sang trang thanh toan hosted. Thong tin dieu huong va phuong thuc hien o ben duoi.",
                        "Yeh order hosted payment page par continue karega. Neeche route aur methods dikh rahe hain."
                      )
                    : manualCollectionCopy.description)
                }
              />
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                {checkoutFlow.mode === "manual-review" ? (
                  <div className="rounded-[1.25rem] border border-orange-300/20 bg-orange-400/10 p-4 text-orange-100">
                    <p className="font-medium text-white">{tRecharge(displayLocale, "请转账后保留以下支付流水", "請轉帳後保留以下支付流水", "Keep this payment reference after transfer", "เก็บเลขอ้างอิงนี้ไว้หลังโอน", "Hay giu ma tham chieu nay sau khi chuyen khoan", "Transfer ke baad is payment reference ko sambhal kar rakhein")}</p>
                    <p className="mt-2 break-all text-sm/6">{order.paymentReference ?? order.orderNo}</p>
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/10 p-4 text-cyan-50">
                    <p className="font-medium text-white">{tRecharge(displayLocale, "支付通道", "支付通道", "Gateway", "ช่องทาง", "Cong thanh toan", "Gateway")}</p>
                    <p className="mt-2">{rechargeCollectionGuide.hostedGatewayName ?? providerLabel ?? "-"}</p>
                  </div>
                )}
                {rechargeCollectionGuide.configured ? (
                  <div className="grid gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-2">
                    {rechargeCollectionGuide.walletMethods?.length ? (
                      <p className="md:col-span-2">
                        <span className="text-slate-500">{tRecharge(displayLocale, "本地支付方式", "本地支付方式", "Local methods", "วิธีชำระเงินในพื้นที่", "Phuong thuc dia phuong", "Local methods")}</span>{" "}
                        {rechargeCollectionGuide.walletMethods.join(" / ")}
                      </p>
                    ) : null}
                    {rechargeCollectionGuide.countryLabel ? (
                      <p>
                        <span className="text-slate-500">{tRecharge(displayLocale, "国家/地区", "國家 / 地區", "Country / region", "ประเทศ / ภูมิภาค", "Quoc gia / khu vuc", "Country / region")}</span> {rechargeCollectionGuide.countryLabel}
                      </p>
                    ) : null}
                    {rechargeCollectionGuide.currency ? (
                      <p>
                        <span className="text-slate-500">{tRecharge(displayLocale, "币种", "幣種", "Currency", "สกุลเงิน", "Tien te", "Currency")}</span> {rechargeCollectionGuide.currency}
                      </p>
                    ) : null}
                    {rechargeCollectionGuide.channelLabel ? <p><span className="text-slate-500">{manualCollectionCopy.channel}</span> {rechargeCollectionGuide.channelLabel}</p> : null}
                    {rechargeCollectionGuide.accountName ? <p><span className="text-slate-500">{manualCollectionCopy.accountName}</span> {rechargeCollectionGuide.accountName}</p> : null}
                    {rechargeCollectionGuide.accountNo ? <p className="break-all md:col-span-2"><span className="text-slate-500">{manualCollectionCopy.accountNo}</span> {rechargeCollectionGuide.accountNo}</p> : null}
                    {rechargeCollectionGuide.note ? <p className="md:col-span-2"><span className="text-slate-500">{manualCollectionCopy.note}</span> {rechargeCollectionGuide.note}</p> : null}
                    {rechargeCollectionGuide.qrCodeUrl ? (
                      <p className="md:col-span-2">
                        <span className="text-slate-500">{manualCollectionCopy.qrCode}</span>{" "}
                        <a href={rechargeCollectionGuide.qrCodeUrl} target="_blank" rel="noreferrer" className="text-sky-100 underline underline-offset-4 transition hover:text-white">{manualCollectionCopy.qrOpen}</a>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-slate-400">{manualCollectionCopy.missing}</p>
                )}
                {rechargeCollectionGuide.routeFallbackReason ? (
                  <p className="rounded-[1.25rem] border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">
                    {tRecharge(
                      displayLocale,
                      "当前订单使用的是下单时冻结的回退路由，后续后台变更支付配置不会影响这笔单的核对方式。",
                      "當前訂單使用的是下單時凍結的回退路由，後續後台變更支付配置不會影響這筆單的核對方式。",
                      "This order is using the frozen fallback route captured at checkout, so later admin changes will not alter how this order should be reconciled.",
                      "ออเดอร์นี้ใช้เส้นทางสำรองที่ถูกล็อกไว้ตอนสร้างออเดอร์ ดังนั้นการเปลี่ยนค่าภายหลังจะไม่กระทบวิธีตรวจสอบออเดอร์นี้",
                      "Don hang nay dang dung tuyen fallback da duoc dong bang khi tao don, nen thay doi cau hinh sau nay se khong anh huong cach doi chieu don nay.",
                      "Yeh order checkout ke waqt freeze ki gayi fallback route use kar raha hai, isliye baad ke admin changes is order ke reconciliation tareeqe ko nahi badlenge.",
                    )}
                  </p>
                ) : null}
                {checkoutFlow.mode === "hosted-redirect" ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={hostedLaunchPath}
                      className="inline-flex items-center justify-center rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                    >
                      {tRecharge(displayLocale, "打开支付页", "打開支付頁", "Open payment page", "เปิดหน้าชำระเงิน", "Mo trang thanh toan", "Open payment page")}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {renderReasonBlock(
            tRecharge(displayLocale, "失败原因", "失敗原因", "Failure reason", "สาเหตุที่ล้มเหลว", "Ly do that bai", "Failure reason"),
            order.failureReason,
          )}
          {renderReasonBlock(
            tRecharge(displayLocale, "退款原因", "退款原因", "Refund reason", "เหตุผลการคืนเงิน", "Ly do hoan tien", "Refund reason"),
            order.refundReason,
            "info",
          )}
          {order.proofUrl ? (
            <div className="rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              <p className="font-medium">{tRecharge(displayLocale, "付款凭证", "付款憑證", "Payment proof", "หลักฐานการชำระ", "Chung tu thanh toan", "Payment proof")}</p>
              <p className="mt-2 break-all">
                <a href={order.proofUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 transition hover:text-white">
                  {tRecharge(displayLocale, "打开凭证图片", "打開憑證圖片", "Open proof image", "เปิดรูปหลักฐาน", "Mo anh chung tu", "Open proof image")}
                </a>
                {order.proofUploadedAt ? <span className="ml-2 text-xs text-cyan-50/80">{formatDateTime(order.proofUploadedAt, displayLocale)}</span> : null}
              </p>
            </div>
          ) : null}
          {order.memberNote ? (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              <p className="font-medium text-white">{tRecharge(displayLocale, "会员备注", "會員備註", "Member note", "หมายเหตุจากสมาชิก", "Ghi chu hoi vien", "Member note")}</p>
              <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-300">{order.memberNote}</p>
            </div>
          ) : null}
          {!routeSnapshot
            ? renderReasonBlock(
                tRecharge(
                  displayLocale,
                  "回调内容",
                  "回調內容",
                  "Callback payload",
                  "ข้อมูล callback",
                  "Noi dung callback",
                  "Callback payload",
                ),
                order.callbackPayload,
                "info",
              )
            : null}
          {order.status === "pending" ? (
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="font-medium text-white">{tRecharge(displayLocale, "上传付款凭证", "上傳付款憑證", "Upload payment proof", "อัปโหลดหลักฐานการชำระ", "Tai len chung tu thanh toan", "Upload payment proof")}</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">{tRecharge(displayLocale, "支持补充转账备注和图片凭证，财务审核时会直接看到。", "支援補充轉帳備註和圖片憑證，財務審核時會直接看到。", "You can add a transfer note and an image proof for finance review.", "สามารถเพิ่มหมายเหตุการโอนและรูปหลักฐานได้ ทีมการเงินจะเห็นโดยตรง", "Ban co the them ghi chu chuyen khoan va anh chung tu de tai chinh xem truc tiep.", "Transfer note aur image proof yahan se submit kar sakte hain. Finance seedha dekhegi.")}</p>
              <form action="/api/member/recharge-coins/proof" method="post" encType="multipart/form-data" className="mt-4 grid gap-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={`/member/recharge/${order.id}`} />
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{tRecharge(displayLocale, "转账备注", "轉帳備註", "Transfer note", "หมายเหตุการโอน", "Ghi chu chuyen khoan", "Transfer note")}</span>
                  <textarea name="memberNote" rows={3} defaultValue={order.memberNote ?? ""} placeholder={tRecharge(displayLocale, "例如：已通过银行卡转账，户名尾号 3281。", "例如：已透過銀行卡轉帳，戶名尾號 3281。", "Example: transferred via bank card, account ending 3281.", "ตัวอย่าง: โอนผ่านบัญชีธนาคาร เลขท้าย 3281", "Vi du: da chuyen khoan qua ngan hang, tai khoan cuoi 3281.", "Example: bank card se transfer kiya, account ending 3281.")} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{tRecharge(displayLocale, "凭证图片", "憑證圖片", "Proof image", "รูปหลักฐาน", "Anh chung tu", "Proof image")}</span>
                  <input type="file" name="proofFile" accept="image/png,image/jpeg,image/webp" className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-sky-400 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-950" />
                </label>
                <button type="submit" className="w-fit rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">{tRecharge(displayLocale, "提交凭证", "提交憑證", "Submit proof", "ส่งหลักฐาน", "Gui chung tu", "Submit proof")}</button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
