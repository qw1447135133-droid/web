import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getAvailableCoinPackages, getMemberCoinCenter, getMembershipCoinPrice } from "@/lib/coin-wallet";
import { canAccessContent } from "@/lib/entitlements";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { membershipPlans } from "@/lib/mock-data";
import { getPaymentProviderLabel } from "@/lib/payment-provider";
import {
  getOrderActivityMeta,
  getOrderFailureMeta,
  getOrderStatusMeta,
  getPaymentResultMeta,
} from "@/lib/payment-ui";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";
import { getArticlePlans } from "@/lib/content-data";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
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

function getCoinPurchaseMessage(coin: string, locale: DisplayLocale) {
  if (coin === "success") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 px-5 py-4 text-sm text-lime-100",
      message:
        locale === "en"
          ? "Content unlocked with coins."
          : locale === "zh-TW"
            ? "已使用球幣解鎖內容。"
            : locale === "th"
              ? "ปลดล็อกคอนเทนต์ด้วยเหรียญแล้ว"
              : locale === "vi"
                ? "Da mo khoa noi dung bang coin."
                : locale === "hi"
                  ? "कॉन्टेंट कॉइन्स से अनलॉक हो गया।"
                  : "已使用球币解锁内容。",
    };
  }

  if (coin === "insufficient") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        locale === "en"
          ? "Coin balance is insufficient. Recharge from the member center first."
          : locale === "zh-TW"
            ? "球幣餘額不足，請先到會員中心充值。"
            : locale === "th"
              ? "เหรียญไม่พอ กรุณาเติมในศูนย์สมาชิกก่อน"
              : locale === "vi"
                ? "So du coin khong du, hay nap them trong trung tam hoi vien."
                : locale === "hi"
                  ? "कॉइन बैलेंस पर्याप्त नहीं है, पहले सदस्य केंद्र में रिचार्ज करें।"
                  : "球币余额不足，请先到会员中心充值。",
    };
  }

  if (coin === "error") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        locale === "en"
          ? "Coin unlock failed. Please try again."
          : locale === "zh-TW"
            ? "球幣解鎖失敗，請稍後重試。"
            : locale === "th"
              ? "ปลดล็อกด้วยเหรียญไม่สำเร็จ กรุณาลองใหม่"
              : locale === "vi"
                ? "Mo khoa bang coin that bai, vui long thu lai."
                : locale === "hi"
                  ? "कॉइन अनलॉक विफल रहा, कृपया फिर कोशिश करें।"
                  : "球币解锁失败，请稍后重试。",
    };
  }

  return null;
}

function getRechargeRequestMessage(recharge: string, locale: DisplayLocale) {
  if (recharge === "created") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-sky-300/20 bg-sky-400/10 px-5 py-4 text-sm text-sky-100",
      message:
        locale === "en"
          ? "Recharge request submitted. Finance will credit the order after review."
          : locale === "zh-TW"
            ? "充值申請已提交，財務審核後會完成入帳。"
            : locale === "th"
              ? "ส่งคำขอเติมเงินแล้ว ทีมการเงินจะเติมยอดหลังตรวจสอบ"
              : locale === "vi"
                ? "Da gui yeu cau nap coin. Bo phan tai chinh se ghi co sau khi duyet."
                : locale === "hi"
                  ? "Recharge request bhej di gayi hai. Review ke baad finance team credit karegi."
                  : "充值申请已提交，财务审核后会完成入账。",
    };
  }

  if (recharge === "error") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        locale === "en"
          ? "Recharge request failed. Please try again."
          : locale === "zh-TW"
            ? "充值申請失敗，請稍後重試。"
            : locale === "th"
              ? "ส่งคำขอเติมเงินไม่สำเร็จ กรุณาลองใหม่"
              : locale === "vi"
                ? "Gui yeu cau nap coin that bai, vui long thu lai."
                : locale === "hi"
                  ? "Recharge request fail ho gayi, kripya dobara koshish karein."
                  : "充值申请失败，请稍后重试。",
    };
  }

  return null;
}

function getMemberCoinCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      balanceLabel: "Coin balance",
      walletEyebrow: "Coin Center",
      walletTitle: "Member coin wallet",
      walletDescription: "Track remaining balance and the latest content unlock movements in one place.",
      rechargeEyebrow: "Recharge",
      rechargeTitle: "Recent recharge orders",
      rechargeDescription: "Review manual or future hosted recharge orders and confirm credited records.",
      ledgerTitle: "Recent coin ledger",
      emptyLedger: "No coin ledger records yet.",
      emptyRecharge: "No recharge orders yet.",
      loginHint: "Log in with a member account to view coin balance and recharge records.",
      balanceAfterLabel: "Balance after",
      createdAtLabel: "Created",
      creditedAtLabel: "Credited",
      totalCoinsLabel: "Coins",
      walletSettlementProvider: "Coin wallet",
      manualRechargeReason: "Manual recharge",
      contentUnlockReason: "Content unlock",
      refundReason: "Refund returned",
      adminAdjustReason: "Admin adjustment",
      membershipUnlockReason: "Membership activation",
      fallbackReason: "Wallet movement",
      packageEyebrow: "Package Store",
      packageTitle: "Coin recharge packages",
      packageDescription: "Submit a recharge request from the member center and let finance credit coins after review.",
      packagePriceLabel: "Recharge request",
      packageValidityLabel: "Validity",
      packageBonusLabel: "Bonus",
      packageSubmitLabel: "Create request",
      packageEmpty: "No active coin packages are available right now.",
      packageReviewHint: "Recharge requests stay pending until finance confirms the payment and credits the coins.",
    };
  }

  if (locale === "zh-TW") {
    return {
      balanceLabel: "球幣餘額",
      walletEyebrow: "Coin Center",
      walletTitle: "會員球幣錢包",
      walletDescription: "把可用餘額、最新解鎖流水和充值狀態放在同一個入口裡查看。",
      rechargeEyebrow: "Recharge",
      rechargeTitle: "最近充值訂單",
      rechargeDescription: "查看人工充值與後續託管充值訂單，核對入帳狀態。",
      ledgerTitle: "最近球幣流水",
      emptyLedger: "目前還沒有球幣流水。",
      emptyRecharge: "目前還沒有充值訂單。",
      loginHint: "登入會員帳號後可查看球幣餘額與充值記錄。",
      balanceAfterLabel: "變動後餘額",
      createdAtLabel: "建立時間",
      creditedAtLabel: "入帳時間",
      totalCoinsLabel: "入帳球幣",
      walletSettlementProvider: "球幣錢包",
      manualRechargeReason: "人工充值",
      contentUnlockReason: "球幣解鎖內容",
      refundReason: "退款退回",
      adminAdjustReason: "後台調整",
      membershipUnlockReason: "球幣開通會員",
      fallbackReason: "錢包流水",
      packageEyebrow: "Package Store",
      packageTitle: "球幣充值套餐",
      packageDescription: "在會員中心提交充值申請，等待財務審核後完成球幣入帳。",
      packagePriceLabel: "充值申請",
      packageValidityLabel: "有效期",
      packageBonusLabel: "贈送",
      packageSubmitLabel: "建立申請",
      packageEmpty: "目前沒有可用的球幣套餐。",
      packageReviewHint: "充值單建立後會保持待處理，待財務核對收款後再入帳。",
    };
  }

  if (locale === "th") {
    return {
      balanceLabel: "ยอดเหรียญ",
      walletEyebrow: "Coin Center",
      walletTitle: "กระเป๋าเหรียญสมาชิก",
      walletDescription: "ดูยอดคงเหลือและรายการปลดล็อกคอนเทนต์ล่าสุดในจุดเดียว",
      rechargeEyebrow: "Recharge",
      rechargeTitle: "คำสั่งเติมเงินล่าสุด",
      rechargeDescription: "ตรวจสอบคำสั่งเติมเงินและสถานะการเข้ายอด",
      ledgerTitle: "รายการเหรียญล่าสุด",
      emptyLedger: "ยังไม่มีรายการเหรียญ",
      emptyRecharge: "ยังไม่มีคำสั่งเติมเงิน",
      loginHint: "เข้าสู่ระบบสมาชิกเพื่อดูยอดเหรียญและประวัติการเติมเงิน",
      balanceAfterLabel: "ยอดหลังรายการ",
      createdAtLabel: "สร้างเมื่อ",
      creditedAtLabel: "เข้ายอดเมื่อ",
      totalCoinsLabel: "จำนวนเหรียญ",
      walletSettlementProvider: "กระเป๋าเหรียญ",
      manualRechargeReason: "เติมเงินด้วยตนเอง",
      contentUnlockReason: "ปลดล็อกคอนเทนต์",
      refundReason: "คืนเงินกลับ",
      adminAdjustReason: "ปรับโดยแอดมิน",
      membershipUnlockReason: "เปิดสมาชิกด้วยเหรียญ",
      fallbackReason: "รายการกระเป๋า",
      packageEyebrow: "Package Store",
      packageTitle: "แพ็กเกจเติมเหรียญ",
      packageDescription: "ส่งคำขอเติมเหรียญจากศูนย์สมาชิก แล้วรอทีมการเงินตรวจสอบและเติมยอด",
      packagePriceLabel: "คำขอเติมเงิน",
      packageValidityLabel: "อายุแพ็กเกจ",
      packageBonusLabel: "โบนัส",
      packageSubmitLabel: "สร้างคำขอ",
      packageEmpty: "ยังไม่มีแพ็กเกจเหรียญที่พร้อมใช้งาน",
      packageReviewHint: "คำขอเติมเงินจะอยู่ในสถานะรอตรวจสอบจนกว่าทีมการเงินจะยืนยันและเติมยอด",
    };
  }

  if (locale === "vi") {
    return {
      balanceLabel: "So du coin",
      walletEyebrow: "Coin Center",
      walletTitle: "Vi coin thanh vien",
      walletDescription: "Theo doi so du con lai va cac lan mo khoa noi dung gan day tai mot noi.",
      rechargeEyebrow: "Recharge",
      rechargeTitle: "Don nap coin gan day",
      rechargeDescription: "Xem cac don nap coin va doi chieu trang thai ghi co.",
      ledgerTitle: "Lich su coin gan day",
      emptyLedger: "Chua co giao dich coin nao.",
      emptyRecharge: "Chua co don nap coin nao.",
      loginHint: "Dang nhap tai khoan thanh vien de xem so du coin va lich su nap.",
      balanceAfterLabel: "So du sau giao dich",
      createdAtLabel: "Tao luc",
      creditedAtLabel: "Ghi co luc",
      totalCoinsLabel: "Coin nhan duoc",
      walletSettlementProvider: "Vi coin",
      manualRechargeReason: "Nap coin thu cong",
      contentUnlockReason: "Mo khoa noi dung",
      refundReason: "Hoan coin",
      adminAdjustReason: "Dieu chinh boi admin",
      membershipUnlockReason: "Mo goi thanh vien",
      fallbackReason: "Giao dich vi",
      packageEyebrow: "Package Store",
      packageTitle: "Goi nap coin",
      packageDescription: "Gui yeu cau nap coin trong trung tam hoi vien va doi bo phan tai chinh duyet ghi co.",
      packagePriceLabel: "Yeu cau nap",
      packageValidityLabel: "Hieu luc",
      packageBonusLabel: "Thuong",
      packageSubmitLabel: "Tao yeu cau",
      packageEmpty: "Hien chua co goi coin nao dang mo.",
      packageReviewHint: "Don nap coin se o trang thai cho xu ly cho den khi bo phan tai chinh xac nhan.",
    };
  }

  if (locale === "hi") {
    return {
      balanceLabel: "Coin balance",
      walletEyebrow: "Coin Center",
      walletTitle: "Member coin wallet",
      walletDescription: "Balance, recharge records, and recent unlock activity are kept in one place.",
      rechargeEyebrow: "Recharge",
      rechargeTitle: "Recent recharge orders",
      rechargeDescription: "Recharge history and credited status appear here.",
      ledgerTitle: "Recent coin ledger",
      emptyLedger: "No coin ledger records yet.",
      emptyRecharge: "No recharge orders yet.",
      loginHint: "Coin balance aur recharge history dekhne ke liye member account se login karein.",
      balanceAfterLabel: "Balance after",
      createdAtLabel: "Created",
      creditedAtLabel: "Credited",
      totalCoinsLabel: "Coins",
      walletSettlementProvider: "Coin wallet",
      manualRechargeReason: "Manual recharge",
      contentUnlockReason: "Content unlock",
      refundReason: "Refund returned",
      adminAdjustReason: "Admin adjustment",
      membershipUnlockReason: "Membership activation",
      fallbackReason: "Wallet movement",
      packageEyebrow: "Package Store",
      packageTitle: "Coin recharge packages",
      packageDescription: "Submit a recharge request in the member center and wait for finance to credit the coins.",
      packagePriceLabel: "Recharge request",
      packageValidityLabel: "Validity",
      packageBonusLabel: "Bonus",
      packageSubmitLabel: "Create request",
      packageEmpty: "No active coin packages are available right now.",
      packageReviewHint: "Recharge requests remain pending until finance confirms and credits the coins.",
    };
  }

  return {
    balanceLabel: "球币余额",
    walletEyebrow: "Coin Center",
    walletTitle: "会员球币钱包",
    walletDescription: "把可用余额、最新解锁流水和充值状态放在同一个入口里查看。",
    rechargeEyebrow: "Recharge",
    rechargeTitle: "最近充值订单",
    rechargeDescription: "查看人工充值和后续托管充值订单，核对入账状态。",
    ledgerTitle: "最近球币流水",
    emptyLedger: "当前还没有球币流水。",
    emptyRecharge: "当前还没有充值订单。",
    loginHint: "登录会员账号后可查看球币余额与充值记录。",
    balanceAfterLabel: "变动后余额",
    createdAtLabel: "创建时间",
    creditedAtLabel: "入账时间",
    totalCoinsLabel: "入账球币",
    walletSettlementProvider: "球币钱包",
    manualRechargeReason: "人工充值",
    contentUnlockReason: "球币解锁内容",
    refundReason: "退款退回",
    adminAdjustReason: "后台调整",
    membershipUnlockReason: "球币开通会员",
    fallbackReason: "钱包流水",
    packageEyebrow: "Package Store",
    packageTitle: "球币充值套餐",
    packageDescription: "在会员中心提交充值申请，等待财务审核后完成球币入账。",
    packagePriceLabel: "充值申请",
    packageValidityLabel: "有效期",
    packageBonusLabel: "赠送",
    packageSubmitLabel: "创建申请",
    packageEmpty: "当前没有可用的球币套餐。",
    packageReviewHint: "充值单创建后会保持待处理，待财务核对收款后再入账。",
  };
}

function getCoinReasonLabel(reason: string, copy: ReturnType<typeof getMemberCoinCopy>) {
  if (reason === "manual_recharge" || reason === "recharge") {
    return copy.manualRechargeReason;
  }

  if (reason === "content_unlock") {
    return copy.contentUnlockReason;
  }

  if (reason === "membership_unlock") {
    return copy.membershipUnlockReason;
  }

  if (reason === "refund") {
    return copy.refundReason;
  }

  if (reason === "admin_adjustment") {
    return copy.adminAdjustReason;
  }

  return copy.fallbackReason;
}

function getOrderProviderDisplay(
  order: { provider?: "mock" | "manual" | "hosted"; paymentReference?: string },
  locale: DisplayLocale,
  coinCopy: ReturnType<typeof getMemberCoinCopy>,
) {
  if (order.paymentReference?.startsWith("COIN-")) {
    return coinCopy.walletSettlementProvider;
  }

  if (!order.provider) {
    return undefined;
  }

  return getPaymentProviderLabel(order.provider, locale);
}

export default async function MemberPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { memberPageCopy, roleLabels, uiCopy } = getSiteCopy(displayLocale);
  const coinCopy = getMemberCoinCopy(displayLocale);
  const [{ session, entitlements }, articlePlans, resolved, currentUser, coinPackages] = await Promise.all([
    getSessionContext(),
    getArticlePlans(undefined, locale),
    searchParams,
    getCurrentUserRecord(),
    getAvailableCoinPackages(locale),
  ]);
  const coinCenter = currentUser ? await getMemberCoinCenter(currentUser.id) : null;
  const localizedMembershipPlans = membershipPlans.map((plan) => localizeMembershipPlan(plan, locale));
  const unlockedPlans = articlePlans.filter((plan) => canAccessContent(session, plan.id));
  const payment = readValue(resolved.payment);
  const coin = readValue(resolved.coin);
  const recharge = readValue(resolved.recharge);
  const paymentResult = getPaymentResultMeta("member", payment, displayLocale);
  const coinResult = getCoinPurchaseMessage(coin, displayLocale);
  const rechargeResult = getRechargeRequestMessage(recharge, displayLocale);
  const coinBalance = coinCenter?.balance ?? session.coinBalance ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading
          eyebrow={memberPageCopy.heroEyebrow}
          title={session.role === "visitor" ? memberPageCopy.heroTitle : memberPageCopy.heroTitleFor(session.displayName)}
          description={memberPageCopy.heroDescription}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.currentRole}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{roleLabels[session.role]}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.memberStatus}</p>
            <p className="mt-2 text-2xl font-semibold text-orange-200">
              {entitlements.activeMembership ? uiCopy.memberStatusActive : uiCopy.memberStatusInactive}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{memberPageCopy.unlockedPlans}</p>
            <p className="mt-2 text-2xl font-semibold text-lime-100">{unlockedPlans.length}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-500">{coinCopy.balanceLabel}</p>
            <p className="mt-2 text-2xl font-semibold text-sky-100">{formatCoinAmount(coinBalance, displayLocale)}</p>
          </div>
        </div>

        {paymentResult ? <div className={paymentResult.className}>{paymentResult.message}</div> : null}
        {coinResult ? <div className={coinResult.className}>{coinResult.message}</div> : null}
        {rechargeResult ? <div className={rechargeResult.className}>{rechargeResult.message}</div> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={memberPageCopy.plansEyebrow}
            title={memberPageCopy.plansTitle}
            description={memberPageCopy.plansDescription}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {localizedMembershipPlans.map((plan) => (
              <div key={plan.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{memberPageCopy.durationLabel(plan.durationDays)}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{plan.description}</p>
                <p className="mt-5 text-3xl font-semibold text-orange-200">{formatCoinAmount(getMembershipCoinPrice(plan.price), displayLocale)}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {plan.perks.map((perk) => (
                    <li key={perk}>- {perk}</li>
                  ))}
                </ul>
                {session.role === "visitor" ? (
                  <Link
                    href="/login?next=%2Fmember"
                    className="mt-6 inline-flex rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                  >
                    {memberPageCopy.buyAfterLogin}
                  </Link>
                ) : (
                  <form action="/api/member/purchase-coins" method="post" className="mt-6">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="returnTo" value="/member" />
                    <button
                      type="submit"
                      className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                    >
                      {formatCoinAmount(getMembershipCoinPrice(plan.price), displayLocale)}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={coinCopy.packageEyebrow}
              title={coinCopy.packageTitle}
              description={coinCopy.packageDescription}
            />
            <p className="mt-4 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
              {coinCopy.packageReviewHint}
            </p>
            {coinPackages.length > 0 ? (
              <div className="mt-6 grid gap-4">
                {coinPackages.map((pkg) => (
                  <div key={pkg.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">{pkg.title}</p>
                        {pkg.description ? <p className="mt-2 text-sm leading-7 text-slate-400">{pkg.description}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-sky-100">{formatCoinAmount(pkg.totalCoins, displayLocale)}</p>
                        <p className="mt-1 text-xs text-slate-500">{coinCopy.packagePriceLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {coinCopy.packageBonusLabel} {formatCoinAmount(pkg.bonusAmount, displayLocale)}
                      </span>
                      {pkg.validityDays ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          {coinCopy.packageValidityLabel} {pkg.validityDays}d
                        </span>
                      ) : null}
                      {pkg.badge ? <span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-orange-100">{pkg.badge}</span> : null}
                    </div>
                    {session.role === "visitor" ? (
                      <Link
                        href="/login?next=%2Fmember"
                        className="mt-5 inline-flex rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                      >
                        {memberPageCopy.buyAfterLogin}
                      </Link>
                    ) : (
                      <form action="/api/member/recharge-coins" method="post" className="mt-5">
                        <input type="hidden" name="packageId" value={pkg.id} />
                        <input type="hidden" name="returnTo" value="/member" />
                        <button
                          type="submit"
                          className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                        >
                          {coinCopy.packageSubmitLabel}
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {coinCopy.packageEmpty}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={coinCopy.walletEyebrow}
              title={coinCopy.walletTitle}
              description={coinCopy.walletDescription}
            />
            <div className="mt-6 rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">{coinCopy.balanceLabel}</p>
              <p className="mt-2 text-3xl font-semibold text-sky-100">{formatCoinAmount(coinBalance, displayLocale)}</p>
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-white">{coinCopy.ledgerTitle}</p>
              <div className="mt-4 space-y-3">
                {currentUser && (coinCenter?.recentLedgers.length ?? 0) > 0 ? (
                  coinCenter?.recentLedgers.map((ledger) => {
                    const isCredit = ledger.direction === "credit";

                    return (
                      <div key={ledger.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{getCoinReasonLabel(ledger.reason, coinCopy)}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(ledger.createdAt, displayLocale)}</p>
                          </div>
                          <span className={isCredit ? "text-sm font-semibold text-lime-100" : "text-sm font-semibold text-orange-100"}>
                            {isCredit ? "+" : "-"}
                            {formatCoinAmount(ledger.amount, displayLocale)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            {coinCopy.balanceAfterLabel} {formatCoinAmount(ledger.balanceAfter, displayLocale)}
                          </span>
                          {ledger.note ? <span>{ledger.note}</span> : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {currentUser ? coinCopy.emptyLedger : coinCopy.loginHint}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={coinCopy.rechargeEyebrow}
              title={coinCopy.rechargeTitle}
              description={coinCopy.rechargeDescription}
            />
            <div className="mt-6 space-y-4">
              {currentUser && (coinCenter?.rechargeOrders.length ?? 0) > 0 ? (
                coinCenter?.rechargeOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status, displayLocale);

                  return (
                    <div key={order.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{order.packageTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">{order.orderNo}</p>
                        </div>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                        <span>
                          {coinCopy.totalCoinsLabel} {formatCoinAmount(order.totalCoins, displayLocale)}
                        </span>
                        <span>
                          {coinCopy.createdAtLabel} {formatDateTime(order.createdAt, displayLocale)}
                        </span>
                        {order.creditedAt ? (
                          <span>
                            {coinCopy.creditedAtLabel} {formatDateTime(order.creditedAt, displayLocale)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {currentUser ? coinCopy.emptyRecharge : coinCopy.loginHint}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading eyebrow={memberPageCopy.ordersEyebrow} title={memberPageCopy.ordersTitle} />
            <div className="mt-6 space-y-4">
              {session.membershipOrders.length === 0 && session.contentOrders.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {memberPageCopy.emptyOrders}
                </div>
              ) : null}

              {session.membershipOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status, displayLocale);
                const activityMeta = getOrderActivityMeta(order, displayLocale);
                const failureMeta = getOrderFailureMeta(order, displayLocale);
                const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";
                const providerLabel = getOrderProviderDisplay(order, displayLocale, coinCopy);

                return (
                  <div key={order.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-white">
                        {memberPageCopy.membershipOrder} | {order.planId}
                      </p>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>
                        {memberPageCopy.createdAt} {formatDateTime(order.createdAt, displayLocale)}
                      </span>
                      <span>{order.coinAmount ? formatCoinAmount(order.coinAmount, displayLocale) : formatPrice(order.amount, displayLocale)}</span>
                      {providerLabel ? <span>{memberPageCopy.paymentProvider} {providerLabel}</span> : null}
                      {activityMeta.value ? (
                        <span>
                          {activityMeta.label} {formatDateTime(activityMeta.value, displayLocale)}
                        </span>
                      ) : null}
                      {order.expiresAt ? (
                        <span>
                          {memberPageCopy.expiresAt} {formatDateTime(order.expiresAt, displayLocale)}
                        </span>
                      ) : null}
                    </div>
                    {order.providerOrderId ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.providerOrderId} {order.providerOrderId}
                      </p>
                    ) : null}
                    {order.paymentReference ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.paymentReference} {order.paymentReference}
                      </p>
                    ) : null}
                    {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                  </div>
                );
              })}

              {session.contentOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status, displayLocale);
                const activityMeta = getOrderActivityMeta(order, displayLocale);
                const failureMeta = getOrderFailureMeta(order, displayLocale);
                const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";
                const providerLabel = getOrderProviderDisplay(order, displayLocale, coinCopy);

                return (
                  <div key={order.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-white">
                        {memberPageCopy.contentOrder} | {order.contentId}
                      </p>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>
                        {memberPageCopy.createdAt} {formatDateTime(order.createdAt, displayLocale)}
                      </span>
                      <span>{order.coinAmount ? formatCoinAmount(order.coinAmount, displayLocale) : formatPrice(order.amount, displayLocale)}</span>
                      {providerLabel ? <span>{memberPageCopy.paymentProvider} {providerLabel}</span> : null}
                      {activityMeta.value ? (
                        <span>
                          {activityMeta.label} {formatDateTime(activityMeta.value, displayLocale)}
                        </span>
                      ) : null}
                      {order.expiresAt ? (
                        <span>
                          {memberPageCopy.expiresAt} {formatDateTime(order.expiresAt, displayLocale)}
                        </span>
                      ) : null}
                    </div>
                    {order.providerOrderId ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.providerOrderId} {order.providerOrderId}
                      </p>
                    ) : null}
                    {order.paymentReference ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {memberPageCopy.paymentReference} {order.paymentReference}
                      </p>
                    ) : null}
                    {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading eyebrow={memberPageCopy.entitlementsEyebrow} title={memberPageCopy.entitlementsTitle} />
            {entitlements.activeMembership ? (
              <p className="mt-4 rounded-[1.25rem] border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-100">
                {memberPageCopy.membershipUnlockedNotice}
              </p>
            ) : null}
            <div className="mt-6 space-y-4">
              {unlockedPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.slug}`}
                  className="block rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-lime-300/25"
                >
                  <p className="font-medium text-white">{plan.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{plan.league}</p>
                </Link>
              ))}

              {unlockedPlans.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {memberPageCopy.emptyUnlockedPlans}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
