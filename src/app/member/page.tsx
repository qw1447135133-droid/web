import Link from "next/link";
import { AccountWorkspaceNav } from "@/components/account-workspace-nav";
import { SectionHeading } from "@/components/section-heading";
import { SiteAdSlot } from "@/components/site-ad-slot";
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
import { getArticlePlans, getSiteAds } from "@/lib/content-data";
import { getUnreadUserNotificationCount } from "@/lib/user-notifications";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function readNumber(value: string | string[] | undefined) {
  const parsed = Number(readValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function tMember(
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

function formatValidityDays(days: number, locale: DisplayLocale) {
  if (locale === "en") {
    return `${days} days`;
  }

  if (locale === "zh-TW") {
    return `${days} 天`;
  }

  if (locale === "th") {
    return `${days} วัน`;
  }

  if (locale === "vi") {
    return `${days} ngay`;
  }

  if (locale === "hi") {
    return `${days} days`;
  }

  return `${days} 天`;
}

function getRechargeOrderHint(status: "pending" | "paid" | "failed" | "closed" | "refunded", locale: DisplayLocale) {
  switch (status) {
    case "paid":
      return tMember(
        locale,
        "财务已完成入账，可直接用球币解锁内容或开通会员。",
        "財務已完成入帳，可直接用球幣解鎖內容或開通會員。",
        "Credited successfully. You can now use the coins to unlock content or activate membership.",
        "เติมยอดสำเร็จแล้ว สามารถใช้เหรียญปลดล็อกคอนเทนต์หรือเปิดสมาชิกได้",
        "Da ghi co thanh cong. Ban co the dung coin de mo khoa noi dung hoac kich hoat goi thanh vien.",
        "Credit ho chuka hai. Ab aap coins se content unlock ya membership activate kar sakte hain.",
      );
    case "failed":
      return tMember(
        locale,
        "该充值单处理失败，请重新提交或联系运营协助补单。",
        "該充值單處理失敗，請重新提交或聯繫運營協助補單。",
        "This recharge request failed. Submit a new one or contact support for manual repair.",
        "คำขอเติมเงินล้มเหลว กรุณาส่งใหม่หรือติดต่อทีมงาน",
        "Don nap nay that bai. Hay tao lai hoac lien he ho tro de xu ly thu cong.",
        "Yeh recharge request fail ho gayi. Dobara submit karein ya support se sampark karein.",
      );
    case "closed":
      return tMember(
        locale,
        "该充值单已关闭，不会继续入账。",
        "該充值單已關閉，不會繼續入帳。",
        "This recharge request has been closed and will not be credited.",
        "คำขอนี้ถูกปิดแล้วและจะไม่ถูกเติมยอด",
        "Don nap nay da dong va se khong duoc ghi co.",
        "Yeh recharge request band ho chuki hai aur credit nahi hoga.",
      );
    case "refunded":
      return tMember(
        locale,
        "该充值单已退款，如球币已入账会同步回退。",
        "該充值單已退款，如球幣已入帳會同步回退。",
        "This recharge was refunded. Any credited coins should be rolled back accordingly.",
        "ออเดอร์นี้คืนเงินแล้ว หากเคยเข้ายอดเหรียญจะถูกปรับกลับ",
        "Don nap nay da hoan tien. Neu da ghi coin thi se duoc hoan lai tuong ung.",
        "Is recharge ka refund ho chuka hai. Agar coins credit hue the to rollback hoga.",
      );
    default:
      return tMember(
        locale,
        "已提交待处理，财务核对收款后会完成入账。",
        "已提交待處理，財務核對收款後會完成入帳。",
        "Submitted and awaiting review. Finance will credit the order after payment verification.",
        "ส่งคำขอแล้ว รอทีมการเงินตรวจสอบก่อนเติมยอด",
        "Da gui yeu cau va dang cho duyet. Bo phan tai chinh se ghi co sau khi doi chieu thanh toan.",
        "Request submit ho gayi hai. Payment verify hone ke baad finance credit karegi.",
      );
  }
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

function getManualCollectionCopy(locale: DisplayLocale) {
  return {
    title: tMember(locale, "付款指引", "付款指引", "Payment guide", "คู่มือการชำระ", "Huong dan thanh toan", "Payment guide"),
    description: tMember(
      locale,
      "创建充值申请后，请按下方收款信息转账，并保留支付流水给财务核对。",
      "建立充值申請後，請依下方收款資訊轉帳，並保留支付流水供財務核對。",
      "After creating the recharge request, transfer to the collection account below and keep the payment reference for finance review.",
      "หลังสร้างคำขอเติมเงินแล้ว ให้โอนตามข้อมูลด้านล่างและเก็บเลขอ้างอิงไว้เพื่อตรวจสอบ",
      "Sau khi tao yeu cau nap coin, hay chuyen khoan theo thong tin ben duoi va giu lai ma tham chieu de doi chieu.",
      "Recharge request create karne ke baad neeche diye gaye details par transfer karein aur payment reference sambhal kar rakhein.",
    ),
    channel: tMember(locale, "收款通道", "收款通道", "Collection channel", "ช่องทางรับเงิน", "Kenh thu tien", "Collection channel"),
    accountName: tMember(locale, "收款户名", "收款戶名", "Account name", "ชื่อบัญชี", "Ten tai khoan", "Account name"),
    accountNo: tMember(locale, "收款账号", "收款帳號", "Account / wallet", "เลขบัญชี / วอลเล็ท", "Tai khoan / vi", "Account / wallet"),
    qrCode: tMember(locale, "收款二维码", "收款二維碼", "QR code", "คิวอาร์โค้ด", "Ma QR", "QR code"),
    qrOpen: tMember(locale, "打开图片", "打開圖片", "Open image", "เปิดรูปภาพ", "Mo anh", "Open image"),
    note: tMember(locale, "付款备注", "付款備註", "Payment note", "หมายเหตุการชำระเงิน", "Ghi chu thanh toan", "Payment note"),
    guide: tMember(locale, "操作说明", "操作說明", "Instructions", "วิธีดำเนินการ", "Huong dan", "Instructions"),
    missing: tMember(
      locale,
      "暂未配置人工收款信息，请先记录订单号和支付流水，再联系运营处理。",
      "暫未配置人工收款資訊，請先記錄訂單號和支付流水，再聯繫運營處理。",
      "Manual collection details are not configured yet. Save the order and payment reference first, then contact operations.",
      "ยังไม่ได้ตั้งค่าข้อมูลรับชำระ ให้บันทึกเลขออเดอร์และเลขอ้างอิงไว้ก่อนแล้วติดต่อทีมงาน",
      "Thong tin thu tien thu cong chua duoc cau hinh. Hay luu ma don va ma tham chieu truoc roi lien he van hanh.",
      "Manual collection details abhi configured nahin hain. Pehle order aur payment reference save karein, phir operations se sampark karein.",
    ),
    detailAction: tMember(locale, "查看充值详情", "查看充值詳情", "View recharge detail", "ดูรายละเอียดออเดอร์", "Xem chi tiet don", "View recharge detail"),
  };
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

  if (recharge === "cancelled") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-slate-300/20 bg-slate-400/10 px-5 py-4 text-sm text-slate-100",
      message:
        locale === "en"
          ? "Recharge request cancelled. This order will not be credited."
          : locale === "zh-TW"
            ? "充值申請已撤銷，該訂單不會再入帳。"
            : locale === "th"
              ? "ยกเลิกคำขอเติมเงินแล้ว ออเดอร์นี้จะไม่เข้ายอด"
              : locale === "vi"
                ? "Da huy yeu cau nap coin. Don nay se khong duoc ghi co."
                : locale === "hi"
                  ? "Recharge request cancel ho gayi hai. Yeh order ab credit nahi hoga."
                  : "充值申请已撤销，该订单不会再入账。",
    };
  }

  if (recharge === "error" || recharge === "cancel-error") {
    return {
      className: "mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100",
      message:
        recharge === "cancel-error"
          ? locale === "en"
            ? "This recharge request could not be cancelled."
            : locale === "zh-TW"
              ? "這筆充值申請目前無法撤銷。"
              : locale === "th"
                ? "คำขอนี้ยังไม่สามารถยกเลิกได้"
                : locale === "vi"
                  ? "Yeu cau nap coin nay hien khong the huy."
                  : locale === "hi"
                    ? "Yeh recharge request abhi cancel nahi ho sakti."
                    : "这笔充值申请当前无法撤销。"
          : locale === "en"
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
      rechargeDescription: "Review manual and hosted recharge orders, then confirm credited records.",
      ledgerTitle: "Recent coin ledger",
      emptyLedger: "No coin ledger records yet.",
      emptyRecharge: "No recharge orders yet.",
      loginHint: "Log in with a member account to view coin balance and recharge records.",
      balanceAfterLabel: "Balance after",
      createdAtLabel: "Created",
      updatedAtLabel: "Updated",
      creditedAtLabel: "Credited",
      totalCoinsLabel: "Coins",
      amountLabel: "Amount due",
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
      packagePriceLabel: "Price",
      packageTotalLabel: "Total coins",
      packageValidityLabel: "Validity",
      packageBonusLabel: "Bonus",
      packageSubmitLabel: "Create request",
      packageEmpty: "No active coin packages are available right now.",
      packageReviewHint: "Recharge requests stay pending until finance confirms the payment and credits the coins.",
      rechargeFlowTitle: "How recharge works",
      rechargeFlowSteps: [
        "Choose a package and create a recharge request.",
        "Keep the request reference for finance verification.",
        "Coins are credited after finance review and the order status changes to credited.",
      ],
      providerOrderIdLabel: "Gateway order ID",
      paymentReferenceLabel: "Payment reference",
      pendingStatusLabel: "Awaiting review",
      paidStatusLabel: "Credited",
      failedStatusLabel: "Failed",
      refundedStatusLabel: "Refunded",
      closedStatusLabel: "Closed",
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
      rechargeDescription: "查看人工充值與託管充值訂單，核對入帳狀態。",
      ledgerTitle: "最近球幣流水",
      emptyLedger: "目前還沒有球幣流水。",
      emptyRecharge: "目前還沒有充值訂單。",
      loginHint: "登入會員帳號後可查看球幣餘額與充值記錄。",
      balanceAfterLabel: "變動後餘額",
      createdAtLabel: "建立時間",
      updatedAtLabel: "更新時間",
      creditedAtLabel: "入帳時間",
      totalCoinsLabel: "入帳球幣",
      amountLabel: "應付金額",
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
      packagePriceLabel: "支付金額",
      packageTotalLabel: "總球幣",
      packageValidityLabel: "有效期",
      packageBonusLabel: "贈送",
      packageSubmitLabel: "建立申請",
      packageEmpty: "目前沒有可用的球幣套餐。",
      packageReviewHint: "充值單建立後會保持待處理，待財務核對收款後再入帳。",
      rechargeFlowTitle: "充值流程",
      rechargeFlowSteps: [
        "選擇套餐並建立充值申請。",
        "保留訂單流水，方便財務核對。",
        "財務確認後入帳，訂單狀態會變成已入帳。",
      ],
      providerOrderIdLabel: "通道單號",
      paymentReferenceLabel: "支付流水",
      pendingStatusLabel: "待審核",
      paidStatusLabel: "已入帳",
      failedStatusLabel: "失敗",
      refundedStatusLabel: "已退款",
      closedStatusLabel: "已關閉",
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
      updatedAtLabel: "อัปเดตเมื่อ",
      creditedAtLabel: "เข้ายอดเมื่อ",
      totalCoinsLabel: "เหรียญทั้งหมด",
      amountLabel: "ยอดชำระ",
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
      packagePriceLabel: "ราคา",
      packageTotalLabel: "เหรียญรวม",
      packageValidityLabel: "อายุแพ็กเกจ",
      packageBonusLabel: "โบนัส",
      packageSubmitLabel: "สร้างคำขอ",
      packageEmpty: "ยังไม่มีแพ็กเกจเหรียญที่พร้อมใช้งาน",
      packageReviewHint: "คำขอเติมเงินจะอยู่ในสถานะรอตรวจสอบจนกว่าทีมการเงินจะยืนยันและเติมยอด",
      rechargeFlowTitle: "ขั้นตอนการเติมเงิน",
      rechargeFlowSteps: [
        "เลือกแพ็กเกจและสร้างคำขอเติมเงิน",
        "เก็บเลขอ้างอิงคำขอไว้เพื่อตรวจสอบ",
        "เมื่อการเงินยืนยันแล้ว ระบบจะเติมเหรียญและอัปเดตสถานะคำสั่งซื้อ",
      ],
      providerOrderIdLabel: "เลขคำสั่งจากช่องทาง",
      paymentReferenceLabel: "เลขอ้างอิงการชำระ",
      pendingStatusLabel: "รอตรวจสอบ",
      paidStatusLabel: "เข้ายอดแล้ว",
      failedStatusLabel: "ไม่สำเร็จ",
      refundedStatusLabel: "คืนเงินแล้ว",
      closedStatusLabel: "ปิดแล้ว",
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
      updatedAtLabel: "Cap nhat luc",
      creditedAtLabel: "Ghi co luc",
      totalCoinsLabel: "Tong coin",
      amountLabel: "So tien",
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
      packagePriceLabel: "Gia",
      packageTotalLabel: "Tong coin",
      packageValidityLabel: "Hieu luc",
      packageBonusLabel: "Thuong",
      packageSubmitLabel: "Tao yeu cau",
      packageEmpty: "Hien chua co goi coin nao dang mo.",
      packageReviewHint: "Don nap coin se o trang thai cho xu ly cho den khi bo phan tai chinh xac nhan.",
      rechargeFlowTitle: "Quy trinh nap coin",
      rechargeFlowSteps: [
        "Chon goi coin va tao yeu cau nap.",
        "Luu lai ma tham chieu de doi soat voi bo phan tai chinh.",
        "Sau khi duyet, he thong se ghi co va cap nhat trang thai don.",
      ],
      providerOrderIdLabel: "Ma don kenh",
      paymentReferenceLabel: "Ma tham chieu thanh toan",
      pendingStatusLabel: "Cho duyet",
      paidStatusLabel: "Da ghi co",
      failedStatusLabel: "That bai",
      refundedStatusLabel: "Da hoan tien",
      closedStatusLabel: "Da dong",
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
      updatedAtLabel: "Updated",
      creditedAtLabel: "Credited",
      totalCoinsLabel: "Coins",
      amountLabel: "Amount",
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
      packagePriceLabel: "Price",
      packageTotalLabel: "Total coins",
      packageValidityLabel: "Validity",
      packageBonusLabel: "Bonus",
      packageSubmitLabel: "Create request",
      packageEmpty: "No active coin packages are available right now.",
      packageReviewHint: "Recharge requests remain pending until finance confirms and credits the coins.",
      rechargeFlowTitle: "Recharge flow",
      rechargeFlowSteps: [
        "Package chunein aur recharge request create karein.",
        "Reference number safe rakhein taaki finance verify kar sake.",
        "Review ke baad coins credit honge aur order status update hoga.",
      ],
      providerOrderIdLabel: "Gateway order ID",
      paymentReferenceLabel: "Payment reference",
      pendingStatusLabel: "Awaiting review",
      paidStatusLabel: "Credited",
      failedStatusLabel: "Failed",
      refundedStatusLabel: "Refunded",
      closedStatusLabel: "Closed",
    };
  }

  return {
    balanceLabel: "球币余额",
    walletEyebrow: "Coin Center",
    walletTitle: "会员球币钱包",
    walletDescription: "把可用余额、最新解锁流水和充值状态放在同一个入口里查看。",
    rechargeEyebrow: "Recharge",
    rechargeTitle: "最近充值订单",
    rechargeDescription: "查看人工充值与托管充值订单，核对入账状态。",
    ledgerTitle: "最近球币流水",
    emptyLedger: "当前还没有球币流水。",
    emptyRecharge: "当前还没有充值订单。",
    loginHint: "登录会员账号后可查看球币余额与充值记录。",
    balanceAfterLabel: "变动后余额",
    createdAtLabel: "创建时间",
    updatedAtLabel: "更新时间",
    creditedAtLabel: "入账时间",
    totalCoinsLabel: "入账球币",
    amountLabel: "支付金额",
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
    packagePriceLabel: "支付金额",
    packageTotalLabel: "总球币",
    packageValidityLabel: "有效期",
    packageBonusLabel: "赠送",
    packageSubmitLabel: "创建申请",
    packageEmpty: "当前没有可用的球币套餐。",
    packageReviewHint: "充值单创建后会保持待处理，待财务核对收款后再入账。",
    rechargeFlowTitle: "充值流程",
    rechargeFlowSteps: [
      "选择套餐并创建充值申请。",
      "保留支付流水，便于财务核对。",
      "财务确认后入账，订单状态会更新为已入账。",
    ],
    providerOrderIdLabel: "通道单号",
    paymentReferenceLabel: "支付流水",
    pendingStatusLabel: "待审核",
    paidStatusLabel: "已入账",
    failedStatusLabel: "失败",
    refundedStatusLabel: "已退款",
    closedStatusLabel: "已关闭",
  };
}

function getRechargeOrderStatusMeta(
  status: "pending" | "paid" | "failed" | "closed" | "refunded",
  copy: ReturnType<typeof getMemberCoinCopy>,
) {
  if (status === "paid") {
    return {
      label: copy.paidStatusLabel,
      className: "rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-100",
    };
  }

  if (status === "failed") {
    return {
      label: copy.failedStatusLabel,
      className: "rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-100",
    };
  }

  if (status === "refunded") {
    return {
      label: copy.refundedStatusLabel,
      className: "rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200",
    };
  }

  if (status === "closed") {
    return {
      label: copy.closedStatusLabel,
      className: "rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200",
    };
  }

  return {
    label: copy.pendingStatusLabel,
    className: "rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100",
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
  order: { provider?: "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu"; paymentReference?: string },
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
  const manualCollectionCopy = getManualCollectionCopy(displayLocale);
  const [{ session, entitlements }, articlePlans, resolved, currentUser, coinPackages, memberInlineAds] = await Promise.all([
    getSessionContext(),
    getArticlePlans(undefined, locale),
    searchParams,
    getCurrentUserRecord(),
    getAvailableCoinPackages(locale),
    getSiteAds(locale, "member-inline"),
  ]);
  const coinCenter = currentUser ? await getMemberCoinCenter(currentUser.id, displayLocale) : null;
  const unreadNotificationCount = currentUser ? await getUnreadUserNotificationCount(currentUser.id) : 0;
  const localizedMembershipPlans = membershipPlans.map((plan) => localizeMembershipPlan(plan, locale));
  const unlockedPlans = articlePlans.filter((plan) => canAccessContent(session, plan.id));
  const payment = readValue(resolved.payment);
  const coin = readValue(resolved.coin);
  const recharge = readValue(resolved.recharge);
  const rechargeOrderNo = readValue(resolved.rechargeOrderNo);
  const rechargeReference = readValue(resolved.rechargeReference);
  const rechargeCoins = readNumber(resolved.rechargeCoins);
  const rechargeAmount = readNumber(resolved.rechargeAmount);
  const paymentResult = getPaymentResultMeta("member", payment, displayLocale);
  const coinResult = getCoinPurchaseMessage(coin, displayLocale);
  const latestRechargeOrder = rechargeOrderNo
    ? coinCenter?.rechargeOrders.find((order) => order.orderNo === rechargeOrderNo)
    : undefined;
  const rechargeResult = latestRechargeOrder || rechargeOrderNo ? null : getRechargeRequestMessage(recharge, displayLocale);
  const coinBalance = coinCenter?.balance ?? session.coinBalance ?? 0;
  const pendingRechargeCount = coinCenter?.rechargeOrders.filter((order) => order.status === "pending").length ?? 0;
  const paidRechargeCount = coinCenter?.rechargeOrders.filter((order) => order.status === "paid").length ?? 0;
  const rechargeReceipt =
    recharge === "created"
      ? {
          orderNo: latestRechargeOrder?.orderNo || rechargeOrderNo,
          paymentReference: latestRechargeOrder?.paymentReference || rechargeReference,
          totalCoins: latestRechargeOrder?.totalCoins ?? rechargeCoins,
          amount: latestRechargeOrder?.amount ?? rechargeAmount,
        }
      : null;

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
        {rechargeReceipt?.orderNo ? (
          <div className="mt-6 rounded-[1.4rem] border border-sky-300/20 bg-sky-400/10 p-5 text-sm text-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-white">{coinCopy.pendingStatusLabel}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span>{rechargeReceipt.orderNo}</span>
                {latestRechargeOrder ? (
                  <Link
                    href={`/member/recharge/${latestRechargeOrder.id}`}
                    className="inline-flex rounded-full border border-sky-100/20 bg-sky-100/10 px-3 py-1 text-xs font-semibold text-sky-50 transition hover:bg-sky-100/15"
                  >
                    {manualCollectionCopy.detailAction}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-sky-50/90">
              {typeof rechargeReceipt.totalCoins === "number" ? <span>{coinCopy.totalCoinsLabel} {formatCoinAmount(rechargeReceipt.totalCoins, displayLocale)}</span> : null}
              {typeof rechargeReceipt.amount === "number" ? <span>{coinCopy.amountLabel} {formatPrice(rechargeReceipt.amount, displayLocale)}</span> : null}
              {rechargeReceipt.paymentReference ? <span>{coinCopy.paymentReferenceLabel} {rechargeReceipt.paymentReference}</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      <AccountWorkspaceNav locale={displayLocale} unreadCount={unreadNotificationCount} />

      <div className="space-y-6">
          <SiteAdSlot
            ads={memberInlineAds}
            locale={displayLocale}
            title={
              displayLocale === "en"
                ? "Member workspace picks"
                : displayLocale === "zh-TW"
                  ? "會員推薦位"
                  : displayLocale === "th"
                    ? "แนะนำสำหรับสมาชิก"
                    : displayLocale === "vi"
                      ? "De xuat cho hoi vien"
                      : displayLocale === "hi"
                        ? "Member workspace picks"
                        : "会员推荐位"
            }
          />

          <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-6">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={memberPageCopy.plansEyebrow}
            title={memberPageCopy.plansTitle}
            description={memberPageCopy.plansDescription}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {localizedMembershipPlans.map((plan) => (
              <div key={plan.id} className="flex h-full flex-col rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{memberPageCopy.durationLabel(plan.durationDays)}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{plan.description}</p>
                <p className="mt-5 text-3xl font-semibold text-orange-200">{formatCoinAmount(getMembershipCoinPrice(plan.price), displayLocale)}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {plan.perks.map((perk) => (
                    <li key={perk}>- {perk}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                {session.role === "visitor" ? (
                  <Link
                    href="/login?next=%2Fmember"
                    className="inline-flex rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                  >
                    {memberPageCopy.buyAfterLogin}
                  </Link>
                ) : (
                  <form action="/api/member/purchase-coins" method="post">
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
              </div>
            ))}
          </div>
        </div>

          <div id="member-coins" className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={coinCopy.packageEyebrow}
              title={coinCopy.packageTitle}
              description={coinCopy.packageDescription}
            />
            {rechargeReceipt?.orderNo ? (
              <div className="mt-4 rounded-[1.25rem] border border-sky-300/20 bg-sky-400/10 p-4 text-sm text-sky-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {tMember(displayLocale, "充值申请已创建", "充值申請已建立", "Recharge request created", "สร้างคำขอเติมเงินแล้ว", "Da tao yeu cau nap coin", "Recharge request create ho gayi")}
                    </p>
                    <p className="mt-2 text-xs text-sky-100/90">
                      {tMember(displayLocale, "请保存订单号并等待财务核对收款。", "請保存訂單號並等待財務核對收款。", "Save the order number and wait for finance to verify the payment.", "โปรดบันทึกเลขออเดอร์และรอทีมการเงินตรวจสอบ", "Hay luu ma don va cho bo phan tai chinh doi chieu.", "Order number save rakhein aur finance verification ka intezar karein.")}
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-200/20 bg-sky-100/10 px-3 py-1 text-xs font-semibold text-sky-50">
                    {tMember(displayLocale, "待处理", "待處理", "Pending", "รอดำเนินการ", "Dang cho xu ly", "Pending")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-sky-100/90">
                  <span>{tMember(displayLocale, "订单号", "訂單號", "Order", "เลขออเดอร์", "Ma don", "Order")} {rechargeReceipt.orderNo}</span>
                  {rechargeReceipt.paymentReference ? <span>{coinCopy.paymentReferenceLabel} {rechargeReceipt.paymentReference}</span> : null}
                  {typeof rechargeReceipt.totalCoins === "number" ? <span>{coinCopy.packageTotalLabel} {formatCoinAmount(rechargeReceipt.totalCoins, displayLocale)}</span> : null}
                  {typeof rechargeReceipt.amount === "number" ? <span>{coinCopy.amountLabel} {formatPrice(rechargeReceipt.amount, displayLocale)}</span> : null}
                </div>
              </div>
            ) : null}
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
                        <p className="mt-1 text-xs text-slate-500">{coinCopy.packageTotalLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-sky-100">
                        {coinCopy.packagePriceLabel} {formatPrice(pkg.price, displayLocale)}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {tMember(displayLocale, "基础球币", "基礎球幣", "Base coins", "เหรียญพื้นฐาน", "Coin co ban", "Base coins")} {formatCoinAmount(pkg.coinAmount, displayLocale)}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {coinCopy.packageBonusLabel} {formatCoinAmount(pkg.bonusAmount, displayLocale)}
                      </span>
                      {pkg.validityDays ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          {coinCopy.packageValidityLabel} {formatValidityDays(pkg.validityDays, displayLocale)}
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
        </div>

        <div className="space-y-6">
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
            {currentUser ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.15rem] border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">{tMember(displayLocale, "待审核充值", "待審核充值", "Pending recharges", "คำขอที่รอตรวจสอบ", "Don dang cho duyet", "Pending recharges")}</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-50">{pendingRechargeCount}</p>
                  <p className="mt-2 text-sm text-amber-100/80">{tMember(displayLocale, "财务确认到账后会自动入账。", "財務確認到帳後會自動入帳。", "They will be credited automatically after finance verification.", "จะเข้ายอดหลังทีมการเงินยืนยัน", "Se duoc ghi co sau khi doi chieu tai chinh.", "Finance verification ke baad auto credit hoga.")}</p>
                </div>
                <div className="rounded-[1.15rem] border border-lime-300/20 bg-lime-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-lime-100/70">{tMember(displayLocale, "已入账充值", "已入帳充值", "Credited recharges", "ออเดอร์ที่เข้ายอดแล้ว", "Don da ghi co", "Credited recharges")}</p>
                  <p className="mt-2 text-2xl font-semibold text-lime-50">{paidRechargeCount}</p>
                  <p className="mt-2 text-sm text-lime-100/80">{tMember(displayLocale, "入账后会同步出现在球币流水与余额里。", "入帳後會同步出現在球幣流水與餘額裡。", "Credited orders appear in your balance and coin ledger.", "ออเดอร์ที่เข้ายอดแล้วจะสะท้อนในยอดคงเหลือและประวัติ", "Don da ghi co se hien trong so du va lich su coin.", "Credited orders balance aur ledger mein dikhte hain.")}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-6 space-y-4">
              {currentUser && (coinCenter?.rechargeOrders.length ?? 0) > 0 ? (
                coinCenter?.rechargeOrders.map((order) => {
                  const statusMeta = getRechargeOrderStatusMeta(order.status, coinCopy);
                  const providerLabel = order.provider ? getPaymentProviderLabel(order.provider, displayLocale) : undefined;
                  const isLatestCreated = latestRechargeOrder?.id === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-[1.25rem] border bg-white/[0.03] p-4 ${
                        isLatestCreated ? "border-sky-300/30 ring-1 ring-sky-300/20" : "border-white/8"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{order.packageTitle}</p>
                            {isLatestCreated ? (
                              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
                                {tMember(displayLocale, "刚创建", "剛建立", "Just created", "เพิ่งสร้าง", "Vua tao", "Just created")}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{order.orderNo}</p>
                        </div>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                        <span>
                          {coinCopy.totalCoinsLabel} {formatCoinAmount(order.totalCoins, displayLocale)}
                        </span>
                        <span>
                          {tMember(displayLocale, "基础", "基礎", "Base", "พื้นฐาน", "Co ban", "Base")} {formatCoinAmount(order.coinAmount, displayLocale)}
                        </span>
                        <span>
                          {coinCopy.packageBonusLabel} {formatCoinAmount(order.bonusAmount, displayLocale)}
                        </span>
                        <span>
                          {coinCopy.amountLabel} {formatPrice(order.amount, displayLocale)}
                        </span>
                        <span>
                          {coinCopy.createdAtLabel} {formatDateTime(order.createdAt, displayLocale)}
                        </span>
                        <span>
                          {coinCopy.updatedAtLabel} {formatDateTime(order.updatedAt, displayLocale)}
                        </span>
                        {order.creditedAt ? (
                          <span>
                            {coinCopy.creditedAtLabel} {formatDateTime(order.creditedAt, displayLocale)}
                          </span>
                        ) : null}
                        {providerLabel ? <span>{memberPageCopy.paymentProvider} {providerLabel}</span> : null}
                      </div>
                      {order.providerOrderId ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {coinCopy.providerOrderIdLabel} {order.providerOrderId}
                        </p>
                      ) : null}
                      {order.paymentReference ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {coinCopy.paymentReferenceLabel} {order.paymentReference}
                        </p>
                      ) : null}
                      {order.proofUrl ? (
                        <p className="mt-1 text-xs text-cyan-200">
                          <a href={order.proofUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 transition hover:text-cyan-100">
                            {tMember(displayLocale, "已上传付款凭证", "已上傳付款憑證", "Payment proof uploaded", "อัปโหลดหลักฐานแล้ว", "Da tai len chung tu", "Payment proof uploaded")}
                          </a>
                        </p>
                      ) : null}
                      {order.memberNote ? <p className="mt-1 text-xs text-slate-500 line-clamp-2">{order.memberNote}</p> : null}
                      <p className="mt-3 text-xs text-slate-400">{getRechargeOrderHint(order.status, displayLocale)}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/member/recharge/${order.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/30 hover:text-sky-100"
                        >
                          {tMember(displayLocale, "查看详情", "查看詳情", "View detail", "ดูรายละเอียด", "Xem chi tiet", "View detail")}
                        </Link>
                        {order.status === "pending" ? (
                          <form action="/api/member/recharge-coins/cancel" method="post">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="returnTo" value="/member" />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15"
                            >
                              {tMember(displayLocale, "撤销申请", "撤銷申請", "Cancel request", "ยกเลิกคำขอ", "Huy yeu cau", "Cancel request")}
                            </button>
                          </form>
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

          <div id="member-orders" className="glass-panel rounded-[2rem] p-6">
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

          <div id="member-entitlements" className="glass-panel rounded-[2rem] p-6">
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
    </div>
  );
}
