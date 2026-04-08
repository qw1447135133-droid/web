import Link from "next/link";
import { getAuthCopy } from "@/lib/account-copy";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { displayLocales } from "@/lib/i18n-config";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const displayLocale = await getCurrentDisplayLocale();
  const copy = getAuthCopy(displayLocale);
  const resolved = await searchParams;
  const next = pickValue(resolved.next);
  const error = pickValue(resolved.error);
  const localeLabels: Record<(typeof displayLocales)[number], string> = {
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    en: "English",
    th: "ไทย",
    vi: "Tiếng Việt",
    hi: "हिन्दी",
  };

  const errorMessage =
    error === "email_already_exists"
      ? displayLocale === "en"
        ? "This email has already been registered."
        : displayLocale === "zh-TW"
          ? "該信箱已註冊。"
          : "该邮箱已注册。"
      : error === "password_too_short"
        ? copy.passwordHint
        : error === "invalid_email"
          ? displayLocale === "en"
            ? "Please enter a valid email address."
            : displayLocale === "zh-TW"
              ? "請輸入有效的信箱地址。"
              : "请输入有效的邮箱地址。"
          : error
            ? displayLocale === "en"
              ? "Registration failed. Please try again."
              : displayLocale === "zh-TW"
                ? "註冊失敗，請稍後再試。"
                : "注册失败，请稍后再试。"
            : "";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{copy.registerEyebrow}</p>
          <h1 className="display-title mt-3 text-5xl font-semibold text-white">{copy.registerTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">{copy.registerDescription}</p>
          <div className="mt-8 rounded-[1.4rem] border border-sky-300/20 bg-sky-400/10 p-5 text-sm text-sky-100">
            {displayLocale === "en"
              ? "After registration you will enter the member workspace immediately. A verification link will also be written into your message center."
              : displayLocale === "zh-TW"
                ? "註冊完成後會立即進入會員工作台，驗證連結也會同步寫入消息中心。"
                : "注册完成后会立即进入会员工作台，验证链接也会同步写入消息中心。"}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{copy.createAccount}</p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-white">{copy.registerTitle}</h2>
          {errorMessage ? (
            <div className="mt-5 rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}
          <form action="/api/auth/register" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="returnTo" value={next || "/member"} />
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.displayName}</span>
              <input type="text" name="displayName" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.email}</span>
              <input type="email" name="email" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.password}</span>
              <input type="password" name="password" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              <p className="text-xs text-slate-500">{copy.passwordHint}</p>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.inviteCode}</span>
              <input type="text" name="inviteCode" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.preferredLocale}</span>
                <select name="preferredLocale" defaultValue={displayLocale} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  {displayLocales.map((locale) => (
                    <option key={locale} value={locale}>
                      {localeLabels[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.countryCode}</span>
                <input type="text" name="countryCode" maxLength={8} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
            </div>
            <button type="submit" className="w-full rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
              {copy.createAccount}
            </button>
          </form>
          <div className="mt-5 text-sm text-slate-400">
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-orange-300 transition hover:text-orange-200">
              {copy.goLogin}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
