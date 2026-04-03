import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
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
import { getPaymentProviderLabel } from "@/lib/payment-provider";
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

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getCurrentLocale();
  const { checkoutPageCopy } = getSiteCopy(locale);
  const opsCopy = getOpsCopy(locale);
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
  const paymentResult = getPaymentResultMeta("checkout", payment, locale);
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
  const statusMeta = getOrderStatusMeta(order.status, locale);
  const activityMeta = getOrderActivityMeta(order, locale);
  const failureMeta = getOrderFailureMeta(order, locale);
  const orderIssueToneClass =
    failureMeta?.tone === "info"
      ? "border-sky-300/20 bg-sky-400/10 text-sky-100"
      : "border-rose-300/20 bg-rose-400/10 text-rose-100";
  const orderTypeLabel = checkoutPageCopy.orderTypeLabel(type);
  const providerLabel = getPaymentProviderLabel(order.provider, locale);
  const isManualReview = order.provider === "manual";
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
              {checkoutPageCopy.amount} {formatPrice(order.amount, locale)}
            </span>
            <span>
              {checkoutPageCopy.createdAt} {formatDateTime(order.createdAt, locale)}
            </span>
            {activityMeta.value ? (
              <span>
                {activityMeta.label} {formatDateTime(activityMeta.value, locale)}
              </span>
            ) : null}
            {order.paymentReference ? (
              <span>
                {checkoutPageCopy.paymentReference} {order.paymentReference}
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
            <ul className="mt-4 space-y-2 text-sky-100/90">
              {opsCopy.checkout.manualSteps.map((step) => (
                <li key={step}>- {step}</li>
              ))}
            </ul>
            <p className="mt-4 text-sky-100/80">
              {opsCopy.checkout.referenceLabel}: {order.paymentReference ?? order.id}
            </p>
            <p className="mt-2 text-sky-100/80">{opsCopy.checkout.adminWillProcess}</p>
            <p className="mt-3 text-xs text-sky-100/70">{opsCopy.checkout.callbackHint}</p>
          </div>
        ) : null}

        {failureMeta ? (
          <div className={`mt-6 rounded-[1.35rem] border p-5 text-sm leading-7 ${orderIssueToneClass}`}>
            <p className="font-medium">{failureMeta.label}</p>
            <p className="mt-2">{failureMeta.value}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {isPending && !isManualReview ? (
            <>
              <form action="/api/payments/mock/confirm" method="post">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                >
                  {checkoutPageCopy.confirmPayment}
                </button>
              </form>

              <form action="/api/payments/mock/fail" method="post">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  type="hidden"
                  name="reason"
                  value={locale === "en" ? "Mock channel returned a failure response. Please create a new order." : locale === "zh-TW" ? "模擬通道返回失敗，請重新建立訂單。" : "模拟通道返回失败，请重新建立订单。"}
                />
                <button
                  type="submit"
                  className="rounded-full border border-rose-300/25 bg-rose-400/10 px-5 py-3 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20"
                >
                  {checkoutPageCopy.simulateFailure}
                </button>
              </form>

              <form action="/api/payments/mock/cancel" method="post">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="rounded-full border border-white/12 px-5 py-3 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                >
                  {checkoutPageCopy.closeOrder}
                </button>
              </form>
            </>
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
