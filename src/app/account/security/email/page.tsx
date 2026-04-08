import { redirect } from "next/navigation";
import { AccountWorkspaceNav } from "@/components/account-workspace-nav";
import { getEmailSecurityCopy } from "@/lib/account-copy";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";
import { getUnreadUserNotificationCount } from "@/lib/user-notifications";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getEmailStatusText(locale: Awaited<ReturnType<typeof getCurrentDisplayLocale>>, status: string) {
  if (status === "sent") {
    return locale === "en"
      ? "A verification link has been sent to your current email and message center."
      : locale === "zh-TW"
        ? "驗證連結已發送到目前信箱，消息中心也已同步保存。"
        : locale === "th"
          ? "ส่งลิงก์ยืนยันไปยังอีเมลปัจจุบันและศูนย์ข้อความแล้ว"
          : locale === "vi"
            ? "Da gui lien ket xac minh toi email hien tai va trung tam thong bao."
            : locale === "hi"
              ? "Verification link current email aur message center mein bhej diya gaya hai."
              : "验证链接已发送到当前邮箱，消息中心也已同步保存。";
  }

  if (status === "pending-sent") {
    return locale === "en"
      ? "A verification link has been sent to the new email. It will replace the current address after confirmation."
      : locale === "zh-TW"
        ? "驗證連結已發送到新信箱，完成確認後才會替換目前地址。"
        : locale === "th"
          ? "ส่งลิงก์ยืนยันไปยังอีเมลใหม่แล้ว ยืนยันเสร็จจึงจะเปลี่ยนที่อยู่ปัจจุบัน"
          : locale === "vi"
            ? "Da gui lien ket xac minh toi email moi. Sau khi xac minh moi se thay dia chi hien tai."
            : locale === "hi"
              ? "Verification link naye email par bhej diya gaya hai. Confirm hone ke baad hi address badlega."
              : "验证链接已发送到新邮箱，完成确认后才会替换当前地址。";
  }

  if (status === "verified") {
    return locale === "en"
      ? "Email verification completed successfully."
      : locale === "zh-TW"
        ? "信箱驗證成功完成。"
        : locale === "th"
          ? "ยืนยันอีเมลสำเร็จแล้ว"
          : locale === "vi"
            ? "Xac minh email thanh cong."
            : locale === "hi"
              ? "Email verification safal ho gaya."
              : "邮箱验证已成功完成。";
  }

  return status;
}

function getEmailErrorText(locale: Awaited<ReturnType<typeof getCurrentDisplayLocale>>, error: string) {
  if (error === "email_already_exists") {
    return locale === "en"
      ? "This email is already registered by another account."
      : locale === "zh-TW"
        ? "這個信箱已被其他帳號使用。"
        : locale === "th"
          ? "อีเมลนี้ถูกใช้โดยบัญชีอื่นแล้ว"
          : locale === "vi"
            ? "Email nay da duoc tai khoan khac su dung."
            : locale === "hi"
              ? "Yeh email kisi aur account mein pehle se registered hai."
              : "这个邮箱已被其他账号使用。";
  }

  if (error === "invalid_email") {
    return locale === "en"
      ? "Please enter a valid email address."
      : locale === "zh-TW"
        ? "請輸入有效的信箱地址。"
        : locale === "th"
          ? "กรุณากรอกอีเมลที่ถูกต้อง"
          : locale === "vi"
            ? "Vui long nhap dia chi email hop le."
            : locale === "hi"
              ? "Kripya valid email address darj karein."
              : "请输入有效的邮箱地址。";
  }

  if (error === "expired_token") {
    return locale === "en"
      ? "This verification link has expired. Send a new one to continue."
      : locale === "zh-TW"
        ? "這個驗證連結已過期，請重新發送。"
        : locale === "th"
          ? "ลิงก์ยืนยันนี้หมดอายุแล้ว กรุณาส่งใหม่"
          : locale === "vi"
            ? "Lien ket xac minh nay da het han. Hay gui lai."
            : locale === "hi"
              ? "Yeh verification link expire ho chuka hai. Naya link bhejiye."
              : "这个验证链接已过期，请重新发送。";
  }

  if (error === "invalid_token" || error === "token_already_used") {
    return locale === "en"
      ? "The verification link is invalid or has already been used."
      : locale === "zh-TW"
        ? "驗證連結無效，或已被使用。"
        : locale === "th"
          ? "ลิงก์ยืนยันไม่ถูกต้องหรือถูกใช้ไปแล้ว"
          : locale === "vi"
            ? "Lien ket xac minh khong hop le hoac da duoc su dung."
            : locale === "hi"
              ? "Verification link invalid hai ya pehle hi use ho chuka hai."
              : "验证链接无效，或已经被使用。";
  }

  return locale === "en"
    ? "Email action failed. Please try again."
    : locale === "zh-TW"
      ? "信箱操作失敗，請稍後再試。"
      : locale === "th"
        ? "ดำเนินการเกี่ยวกับอีเมลไม่สำเร็จ กรุณาลองใหม่"
        : locale === "vi"
          ? "Thao tac email that bai. Vui long thu lai."
          : locale === "hi"
            ? "Email action fail ho gaya. Kripya dobara try karein."
            : "邮箱操作失败，请稍后再试。";
}

export default async function AccountEmailSecurityPage({ searchParams }: { searchParams: SearchParams }) {
  const displayLocale = await getCurrentDisplayLocale();
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.canAccessMemberCenter) {
    redirect("/login?next=%2Faccount%2Fsecurity%2Femail");
  }

  const [user, unreadCount] = await Promise.all([
    getCurrentUserRecord(),
    session.id ? getUnreadUserNotificationCount(session.id) : 0,
  ]);

  if (!user) {
    redirect("/login?next=%2Faccount%2Fsecurity%2Femail");
  }

  const copy = getEmailSecurityCopy(displayLocale);
  const resolved = await searchParams;
  const status = pickValue(resolved.status);
  const error = pickValue(resolved.error);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <AccountWorkspaceNav locale={displayLocale} current="email" unreadCount={unreadCount} />
      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="section-label">{copy.eyebrow}</p>
          <h1 className="display-title mt-3 text-4xl font-semibold text-white">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{copy.description}</p>
          {status ? (
            <div className="mt-6 rounded-[1.2rem] border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
              {getEmailStatusText(displayLocale, status)}
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {getEmailErrorText(displayLocale, error)}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel rounded-[2rem] p-6">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">{copy.currentEmail}</p>
              <p className="mt-2 text-xl font-semibold text-white">{user.email}</p>
              <p className="mt-3 text-sm text-slate-300">{user.emailVerifiedAt ? copy.verified : copy.unverified}</p>
            </div>
            {user.pendingEmail ? (
              <div className="mt-4 rounded-[1.5rem] border border-sky-300/20 bg-sky-400/10 p-5">
                <p className="text-sm text-slate-300">{copy.pendingEmail}</p>
                <p className="mt-2 text-xl font-semibold text-sky-50">{user.pendingEmail}</p>
              </div>
            ) : null}
          </section>

          <section className="glass-panel rounded-[2rem] p-6">
            <form action="/api/account/email/send" method="post" className="space-y-4">
              <input type="hidden" name="returnTo" value="/account/security/email" />
              <button type="submit" className="rounded-full bg-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {copy.sendCurrent}
              </button>
            </form>

            <form action="/api/account/email/send" method="post" className="mt-6 space-y-4">
              <input type="hidden" name="returnTo" value="/account/security/email" />
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.nextEmail}</span>
                <input type="email" name="nextEmail" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <button type="submit" className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]">
                {copy.sendPending}
              </button>
            </form>
            <p className="mt-6 text-sm leading-7 text-slate-400">{copy.helper}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
