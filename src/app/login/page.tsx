import Link from "next/link";
import { getAuthCopy } from "@/lib/account-copy";
import { getCurrentDisplayLocale } from "@/lib/i18n";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const displayLocale = await getCurrentDisplayLocale();
  const copy = getAuthCopy(displayLocale);
  const resolved = await searchParams;
  const next = pickValue(resolved.next);
  const inviteCode = pickValue(resolved.invite).trim().toUpperCase();
  const error = pickValue(resolved.error);

  const errorMessage =
    error === "invalid_credentials"
      ? displayLocale === "en"
        ? "Incorrect email or password."
        : displayLocale === "zh-TW"
          ? "信箱或密碼錯誤。"
          : "邮箱或密码错误。"
      : error === "dev_login_disabled"
        ? displayLocale === "en"
          ? "Development quick login is disabled in production."
          : displayLocale === "zh-TW"
            ? "正式環境已停用開發快捷登入。"
            : "正式环境已停用开发快捷登录。"
        : error
          ? displayLocale === "en"
            ? "Sign-in failed. Please try again."
            : displayLocale === "zh-TW"
              ? "登入失敗，請稍後再試。"
              : "登录失败，请稍后再试。"
          : "";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{copy.loginEyebrow}</p>
          <h1 className="display-title mt-3 text-5xl font-semibold text-white">{copy.loginTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">{copy.loginDescription}</p>
          {inviteCode ? (
            <div className="mt-6 rounded-[1.2rem] border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              {displayLocale === "en"
                ? `Invite code detected: ${inviteCode}`
                : displayLocale === "zh-TW"
                  ? `已識別邀請碼：${inviteCode}`
                  : `已识别邀请码：${inviteCode}`}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mt-6 rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{copy.signIn}</p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-white">{copy.loginTitle}</h2>
          <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="returnTo" value={next || "/member"} />
            <input type="hidden" name="inviteCode" value={inviteCode} />
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.email}</span>
              <input type="email" name="email" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{copy.password}</span>
              <input type="password" name="password" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <button
              type="submit"
              className="w-full rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              {copy.signIn}
            </button>
          </form>
          <div className="mt-5 text-sm text-slate-400">
            <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-orange-300 transition hover:text-orange-200">
              {copy.goRegister}
            </Link>
          </div>

          {process.env.NODE_ENV !== "production" ? (
            <div className="mt-8 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.devQuickEntry}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">{copy.devQuickDescription}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <form action="/api/auth/login" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <input type="hidden" name="mode" value="dev-quick" />
                  <input type="hidden" name="displayName" value="Ops Admin" />
                  <input type="hidden" name="email" value="ops@signalnine.demo" />
                  <input type="hidden" name="role" value="admin" />
                  <input type="hidden" name="returnTo" value={next || "/admin"} />
                  <input type="hidden" name="inviteCode" value={inviteCode} />
                  <button type="submit" className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                    Admin quick entry
                  </button>
                </form>
                <form action="/api/auth/login" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <input type="hidden" name="mode" value="dev-quick" />
                  <input type="hidden" name="displayName" value="Member Demo" />
                  <input type="hidden" name="email" value="member@signalnine.demo" />
                  <input type="hidden" name="role" value="member" />
                  <input type="hidden" name="returnTo" value={next || "/member"} />
                  <input type="hidden" name="inviteCode" value={inviteCode} />
                  <button type="submit" className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-200">
                    Member quick entry
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
