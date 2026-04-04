import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  getPaymentCheckoutActionTargets,
  getPaymentCheckoutFlow,
  getPaymentLaunchRedirectPath,
} from "@/lib/payment-gateway";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getOpsCopy } from "@/lib/ops-copy";
import {
  getCheckoutOrder,
  normalizePaymentOrderType,
  sanitizeReturnTo,
  type CheckoutOrder,
  type PaymentOrderType,
} from "@/lib/payment-orders";
import {
  getOrderActivityMeta,
  getOrderFailureMeta,
  getOrderStatusMeta,
  getPaymentResultMeta,
} from "@/lib/payment-ui";
import {
  getPaymentManualCollectionConfig,
  getPaymentProviderLabel,
  getPaymentRuntimeConfig,
} from "@/lib/payment-provider";
import { getCurrentUserRecord } from "@/lib/session";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getCheckoutHint(type: PaymentOrderType, order: CheckoutOrder, copy: ReturnType<typeof getSiteCopy>["checkoutPageCopy"]) {
  if (order.status === "pending") {
    return type === "membership" ? copy.hint.pendingMembership : copy.hint.pendingContent;
  }

  if (order.status === "paid") {
    return type === "membership" ? copy.hint.paidMembership : copy.hint.paidContent;
  }

  if (order.status === "closed") {
    return copy.hint.closed;
  }

  if (order.status === "failed") {
    return copy.hint.failed;
  }

  return copy.hint.refunded;
}

function getCheckoutDisplayCopy(locale: DisplayLocale, pendingMinutes: number) {
  const paymentPendingLabel =
    locale === "en"
      ? `${pendingMinutes} min`
      : locale === "zh-TW"
        ? `${pendingMinutes} 分鐘`
        : locale === "th"
          ? `${pendingMinutes} นาที`
          : locale === "vi"
            ? `${pendingMinutes} phut`
            : locale === "hi"
              ? `${pendingMinutes} min`
              : `${pendingMinutes} 分钟`;

  const hostedCopy = {
    title:
      locale === "en"
        ? "Continue to gateway"
        : locale === "zh-TW"
          ? "繼續前往支付通道"
          : locale === "th"
            ? "ไปยังช่องทางชำระเงิน"
            : locale === "vi"
              ? "Tiep tuc toi cong thanh toan"
              : locale === "hi"
                ? "Gateway par jari rakhein"
                : "继续前往支付通道",
    description:
      locale === "en"
        ? "This order is configured for a hosted payment page. Continue to the external gateway to complete the payment, then return here to view the final status."
        : locale === "zh-TW"
          ? "這筆訂單會跳轉到第三方託管支付頁完成付款，付款後再返回此頁查看最終狀態。"
          : locale === "th"
            ? "คำสั่งซื้อนี้จะพาไปยังหน้าชำระเงินภายนอก หลังชำระแล้วให้กลับมาหน้านี้เพื่อตรวจสอบสถานะสุดท้าย"
            : locale === "vi"
              ? "Don hang nay su dung trang thanh toan hosted. Hay tiep tuc toi cong thanh toan ben ngoai roi quay lai day de xem trang thai cuoi cung."
              : locale === "hi"
                ? "Yeh order hosted payment page par configured hai. Payment complete karke yahan wapas aakar final status dekhein."
                : "这笔订单会跳转到第三方托管支付页完成付款，付款后再返回此页查看最终状态。",
    button:
      locale === "en"
        ? "Open payment page"
        : locale === "zh-TW"
          ? "打開支付頁"
          : locale === "th"
            ? "เปิดหน้าชำระเงิน"
            : locale === "vi"
              ? "Mo trang thanh toan"
              : locale === "hi"
                ? "Payment page kholen"
                : "打开支付页",
  } as const;

  const manualCollectionCopy = {
    channel:
      locale === "en"
        ? "Collection channel"
        : locale === "zh-TW"
          ? "收款通道"
          : locale === "th"
            ? "ช่องทางรับเงิน"
            : locale === "vi"
              ? "Kenh thu tien"
              : locale === "hi"
                ? "Collection channel"
                : "收款通道",
    accountName:
      locale === "en"
        ? "Account name"
        : locale === "zh-TW"
          ? "收款戶名"
          : locale === "th"
            ? "ชื่อบัญชี"
            : locale === "vi"
              ? "Ten tai khoan"
              : locale === "hi"
                ? "Account name"
                : "收款户名",
    accountNo:
      locale === "en"
        ? "Account / wallet"
        : locale === "zh-TW"
          ? "收款帳號"
          : locale === "th"
            ? "เลขบัญชี / วอลเล็ท"
            : locale === "vi"
              ? "Tai khoan / vi"
              : locale === "hi"
                ? "Account / wallet"
                : "收款账号",
    qrCode:
      locale === "en"
        ? "QR code"
        : locale === "zh-TW"
          ? "收款二維碼"
          : locale === "th"
            ? "คิวอาร์โค้ด"
            : locale === "vi"
              ? "Ma QR"
              : locale === "hi"
                ? "QR code"
                : "收款二维码",
    qrOpen:
      locale === "en"
        ? "Open image"
        : locale === "zh-TW"
          ? "打開圖片"
          : locale === "th"
            ? "เปิดรูปภาพ"
            : locale === "vi"
              ? "Mo anh"
              : locale === "hi"
                ? "Image kholen"
                : "打开图片",
    note:
      locale === "en"
        ? "Payment note"
        : locale === "zh-TW"
          ? "付款備註"
          : locale === "th"
            ? "หมายเหตุการชำระเงิน"
            : locale === "vi"
              ? "Ghi chu thanh toan"
              : locale === "hi"
                ? "Payment note"
                : "付款备注",
    missing:
      locale === "en"
        ? "Manual collection details are not configured yet. Use the payment reference below when coordinating with operations."
        : locale === "zh-TW"
          ? "目前尚未配置人工收款資訊，請先使用下方支付流水號與營運核對。"
          : locale === "th"
            ? "ยังไม่ได้ตั้งค่าข้อมูลรับชำระแบบแมนนวล ใช้เลขอ้างอิงด้านล่างเพื่อติดต่อทีมปฏิบัติการก่อน"
            : locale === "vi"
              ? "Thong tin thu tien thu cong chua duoc cau hinh. Hay dung ma tham chieu ben duoi khi lam viec voi bo phan van hanh."
              : locale === "hi"
                ? "Manual collection details abhi configured nahin hain. Neeche diya gaya payment reference operations ke saath use karein."
                : "目前尚未配置人工收款信息，请先使用下方支付流水号与运营核对。",
  } as const;

  const mockFailureReason =
    locale === "en"
      ? "Mock channel returned a failure response. Please create a new order."
      : locale === "zh-TW"
        ? "模擬通道返回失敗，請重新建立訂單。"
        : locale === "th"
          ? "ช่องทางจำลองส่งผลล้มเหลวกลับมา กรุณาสร้างคำสั่งซื้อใหม่"
          : locale === "vi"
            ? "Kenh mock tra ve that bai. Vui long tao don hang moi."
            : locale === "hi"
              ? "Mock channel ne failure response diya. Kripya naya order banayen."
              : "模拟通道返回失败，请重新建立订单。";

  return { paymentPendingLabel, hostedCopy, manualCollectionCopy, mockFailureReason };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { checkoutPageCopy } = getSiteCopy(displayLocale);
  const opsCopy = getOpsCopy(displayLocale);
  const paymentRuntime = getPaymentRuntimeConfig();
  const manualCollection = getPaymentManualCollectionConfig();
  const { paymentPendingLabel, hostedCopy, manualCollectionCopy, mockFailureReason } = getCheckoutDisplayCopy(
    displayLocale,
    paymentRuntime.pendingMinutes,
  );
  const current = await getCurrentUserRecord();

  if (!current) {
    redirect("/login?next=%2Fmember");
  }

  const resolved = await searchParams;
  const type = normalizePaymentOrderType(readValue(resolved.type, "content"));
  const fallbackReturnTo = type === "membership" ? "/member" : "/plans";
  const orderId = readValue(resolved.orderId);
  const returnTo = sanitizeReturnTo(readValue(resolved.returnTo, fallbackReturnTo), fallbackReturnTo);
  const payment = readValue(resolved.payment);
  const paymentResult = getPaymentResultMeta("checkout", payment, displayLocale);
  const order = orderId
    ? await getCheckoutOrder({
        type,
        orderId,
        userId: current.id,
      })
    : null;

  if (!order) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <SectionHeading
            eyebrow={checkoutPageCopy.eyebrow}
            title={checkoutPageCopy.missingTitle}
            description={checkoutPageCopy.missingDescription}
          />

          <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-slate-300">
            {checkoutPageCopy.missingNote}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={returnTo}
              className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              {checkoutPageCopy.backToSource}
            </Link>
            <Link
              href={type === "membership" ? "/member" : "/plans"}
              className="rounded-full border border-white/12 px-5 py-3 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
            >
              {checkoutPageCopy.backToEntry}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const statusMeta = getOrderStatusMeta(order.status, displayLocale);
  const activityMeta = getOrderActivityMeta(order, displayLocale);
  const failureMeta = getOrderFailureMeta(order, displayLocale);
  const orderIssueToneClass =
    failureMeta?.tone === "info"
      ? "border-sky-300/20 bg-sky-400/10 text-sky-100"
      : "border-rose-300/20 bg-rose-400/10 text-rose-100";
  const orderTypeLabel = checkoutPageCopy.orderTypeLabel(type);
  const providerLabel = getPaymentProviderLabel(order.provider, displayLocale);
  const checkoutFlow = getPaymentCheckoutFlow(order.provider);
  const checkoutActions = getPaymentCheckoutActionTargets({
    type,
    orderId: order.id,
    returnTo,
  });
  const isManualReview = checkoutFlow.mode === "manual-review";
  const checkoutTitle = isManualReview ? opsCopy.checkout.manualTitle : checkoutPageCopy.title;
  const checkoutDescription = isManualReview ? opsCopy.checkout.manualDescription : checkoutPageCopy.description;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading
          eyebrow={checkoutPageCopy.eyebrow}
          title={checkoutTitle}
          description={checkoutDescription}
        />

        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{checkoutPageCopy.orderType}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{orderTypeLabel}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{checkoutPageCopy.orderStatus}</p>
            <div className="mt-3">
              <span className={statusMeta.className}>{statusMeta.label}</span>
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5 md:col-span-2">
            <p className="text-sm text-slate-500">{opsCopy.checkout.providerLabel}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-100">
                {providerLabel}
              </span>
              {isManualReview ? (
                <span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-medium text-orange-100">
                  {opsCopy.checkout.pendingReviewBadge}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-500">{checkoutPageCopy.orderTitle}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{order.title}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">{order.description}</p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
            <span>
              {checkoutPageCopy.amount} {formatPrice(order.amount, displayLocale)}
            </span>
            <span>
              {checkoutPageCopy.createdAt} {formatDateTime(order.createdAt, displayLocale)}
            </span>
            <span>
              {checkoutPageCopy.paymentProvider} {providerLabel}
            </span>
            {activityMeta.value ? (
              <span>
                {activityMeta.label} {formatDateTime(activityMeta.value, displayLocale)}
              </span>
            ) : null}
            {order.expiresAt ? (
              <span>
                {checkoutPageCopy.expiresAt} {formatDateTime(order.expiresAt, displayLocale)}
              </span>
            ) : null}
            {order.paymentReference ? (
              <span>
                {checkoutPageCopy.paymentReference} {order.paymentReference}
              </span>
            ) : null}
            {order.providerOrderId ? (
              <span>
                {checkoutPageCopy.providerOrderId} {order.providerOrderId}
              </span>
            ) : null}
            <span>
              {checkoutPageCopy.orderId} {order.id}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-slate-300">
          {getCheckoutHint(type, order, checkoutPageCopy)}
        </div>

        {isManualReview && order.status === "pending" ? (
          <div className="mt-6 rounded-[1.35rem] border border-sky-300/20 bg-sky-400/10 p-5 text-sm leading-7 text-sky-50">
            <p className="font-medium">{opsCopy.checkout.manualTitle}</p>
            <p className="mt-2 text-sky-100/90">{opsCopy.checkout.manualDescription}</p>
            <div className="mt-4 grid gap-2 text-xs text-sky-100/85 sm:grid-cols-1">
              <p>
                {opsCopy.checkout.pendingWindowLabel}: {paymentPendingLabel}
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-sky-100/90">
              {opsCopy.checkout.manualSteps.map((step) => (
                <li key={step}>- {step}</li>
              ))}
            </ul>
            {manualCollection.configured ? (
              <div className="mt-4 grid gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/20 p-4 sm:grid-cols-2">
                {manualCollection.channelLabel ? (
                  <p>
                    {manualCollectionCopy.channel}: {manualCollection.channelLabel}
                  </p>
                ) : null}
                {manualCollection.accountName ? (
                  <p>
                    {manualCollectionCopy.accountName}: {manualCollection.accountName}
                  </p>
                ) : null}
                {manualCollection.accountNo ? (
                  <p className="break-all sm:col-span-2">
                    {manualCollectionCopy.accountNo}: {manualCollection.accountNo}
                  </p>
                ) : null}
                {manualCollection.note ? (
                  <p className="sm:col-span-2">
                    {manualCollectionCopy.note}: {manualCollection.note}
                  </p>
                ) : null}
                {manualCollection.qrCodeUrl ? (
                  <p className="sm:col-span-2">
                    {manualCollectionCopy.qrCode}:{" "}
                    <a
                      href={manualCollection.qrCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 transition hover:text-white"
                    >
                      {manualCollectionCopy.qrOpen}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sky-100/80">{manualCollectionCopy.missing}</p>
            )}
            <p className="mt-4 text-sky-100/80">
              {opsCopy.checkout.referenceLabel}: {order.paymentReference ?? order.id}
            </p>
            <p className="mt-2 text-sky-100/80">{opsCopy.checkout.adminWillProcess}</p>
            <p className="mt-3 text-xs text-sky-100/70">{opsCopy.checkout.callbackHint}</p>
          </div>
        ) : null}

        {checkoutFlow.mode === "hosted-redirect" && order.status === "pending" ? (
          <div className="mt-6 rounded-[1.35rem] border border-emerald-300/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-50">
            <p className="font-medium">{hostedCopy.title}</p>
            <p className="mt-2 text-emerald-100/90">{hostedCopy.description}</p>
          </div>
        ) : null}

        {failureMeta ? (
          <div className={`mt-6 rounded-[1.35rem] border p-5 text-sm leading-7 ${orderIssueToneClass}`}>
            <p className="font-medium">{failureMeta.label}</p>
            <p className="mt-2">{failureMeta.value}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {isPending && checkoutFlow.showMockActions ? (
            <>
              <form action={checkoutActions.confirm.action} method="post">
                <input type="hidden" name="type" value={checkoutActions.confirm.type} />
                <input type="hidden" name="orderId" value={checkoutActions.confirm.orderId} />
                <input type="hidden" name="returnTo" value={checkoutActions.confirm.returnTo} />
                <button
                  type="submit"
                  className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                >
                  {checkoutPageCopy.confirmPayment}
                </button>
              </form>

              <form action={checkoutActions.fail.action} method="post">
                <input type="hidden" name="type" value={checkoutActions.fail.type} />
                <input type="hidden" name="orderId" value={checkoutActions.fail.orderId} />
                <input type="hidden" name="returnTo" value={checkoutActions.fail.returnTo} />
                <input
                  type="hidden"
                  name="reason"
                  value={mockFailureReason}
                />
                <button
                  type="submit"
                  className="rounded-full border border-rose-300/25 bg-rose-400/10 px-5 py-3 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20"
                >
                  {checkoutPageCopy.simulateFailure}
                </button>
              </form>

              <form action={checkoutActions.cancel.action} method="post">
                <input type="hidden" name="type" value={checkoutActions.cancel.type} />
                <input type="hidden" name="orderId" value={checkoutActions.cancel.orderId} />
                <input type="hidden" name="returnTo" value={checkoutActions.cancel.returnTo} />
                <button
                  type="submit"
                  className="rounded-full border border-white/12 px-5 py-3 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                >
                  {checkoutPageCopy.closeOrder}
                </button>
              </form>
            </>
          ) : null}

          {isPending && checkoutFlow.mode === "hosted-redirect" ? (
            <Link
              href={getPaymentLaunchRedirectPath({
                provider: order.provider,
                type,
                orderId: order.id,
                returnTo,
              })}
              className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
            >
              {hostedCopy.button}
            </Link>
          ) : null}

          <Link
            href={returnTo}
            className="rounded-full border border-white/12 px-5 py-3 text-sm text-slate-100 transition hover:border-lime-300/25 hover:text-white"
          >
            {checkoutPageCopy.backToSource}
          </Link>
        </div>
      </section>
    </div>
  );
}
