import { redirect } from "next/navigation";
import { AccountAppInstallCard } from "@/components/account-app-install-card";
import { AccountWorkspaceNav } from "@/components/account-workspace-nav";
import { getAppVersionInfo } from "@/lib/app-version";
import { getProfilePageCopy } from "@/lib/account-copy";
import { displayLocales, getCurrentDisplayLocale } from "@/lib/i18n";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";
import { getUnreadUserNotificationCount } from "@/lib/user-notifications";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

const localeLabels: Record<(typeof displayLocales)[number], string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  th: "ไทย",
  vi: "Tiếng Việt",
  hi: "हिन्दी",
};

function getProfileBannerText(displayLocale: (typeof displayLocales)[number], error: string) {
  if (error === "profile_invalid") {
    return displayLocale === "en"
      ? "Please complete the required profile fields."
      : displayLocale === "zh-TW"
        ? "請完整填寫必要資料。"
        : displayLocale === "th"
          ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบ"
          : displayLocale === "vi"
            ? "Vui long dien day du thong tin bat buoc."
            : displayLocale === "hi"
              ? "Kripya zaruri profile fields poore bharein."
              : "请完整填写必要资料。";
  }

  return displayLocale === "en"
    ? "Profile update failed. Please try again."
    : displayLocale === "zh-TW"
      ? "資料更新失敗，請稍後再試。"
      : displayLocale === "th"
        ? "อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่"
        : displayLocale === "vi"
          ? "Cap nhat ho so that bai. Vui long thu lai."
          : displayLocale === "hi"
            ? "Profile update fail ho gaya. Kripya dobara try karein."
            : "资料更新失败，请稍后再试。";
}

export default async function AccountProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const displayLocale = await getCurrentDisplayLocale();
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.canAccessMemberCenter) {
    redirect("/login?next=%2Faccount%2Fprofile");
  }

  const [user, unreadCount, appVersionInfo] = await Promise.all([
    getCurrentUserRecord(),
    session.id ? getUnreadUserNotificationCount(session.id) : 0,
    getAppVersionInfo(),
  ]);

  if (!user) {
    redirect("/login?next=%2Faccount%2Fprofile");
  }

  const copy = getProfilePageCopy(displayLocale);
  const resolved = await searchParams;
  const saved = pickValue(resolved.saved) === "1";
  const error = pickValue(resolved.error);
  const savedText =
    displayLocale === "en"
      ? "Profile saved."
      : displayLocale === "zh-TW"
        ? "資料已更新。"
        : displayLocale === "th"
          ? "บันทึกข้อมูลแล้ว"
          : displayLocale === "vi"
            ? "Da luu ho so."
            : displayLocale === "hi"
              ? "Profile save ho gaya."
              : "资料已更新。";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <AccountWorkspaceNav locale={displayLocale} current="profile" unreadCount={unreadCount} />
      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="section-label">{copy.eyebrow}</p>
          <h1 className="display-title mt-3 text-4xl font-semibold text-white">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{copy.description}</p>
          {saved ? (
            <div className="mt-6 rounded-[1.2rem] border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
              {savedText}
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {getProfileBannerText(displayLocale, error)}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-[2rem] p-6">
            <form action="/api/account/profile" method="post" className="space-y-4">
              <input type="hidden" name="returnTo" value="/account/profile" />
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.displayName}</span>
                <input name="displayName" defaultValue={user.displayName} required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.contactMethod}</span>
                <input name="contactMethod" defaultValue={user.contactMethod ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-slate-400">{copy.contactValue}</span>
                <input name="contactValue" defaultValue={user.contactValue ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="text-slate-400">{copy.locale}</span>
                  <select name="preferredLocale" defaultValue={user.preferredLocale ?? displayLocale} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    {displayLocales.map((locale) => (
                      <option key={locale} value={locale}>
                        {localeLabels[locale]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="text-slate-400">{copy.country}</span>
                  <input name="countryCode" defaultValue={user.countryCode ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>
              <button type="submit" className="rounded-full bg-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {copy.save}
              </button>
            </form>
          </section>

          <section className="glass-panel rounded-[2rem] p-6">
            <p className="section-label">{copy.emailCardTitle}</p>
            <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-2 text-xl font-semibold text-white">{user.email}</p>
              <p className="mt-3 text-sm text-slate-300">
                {user.emailVerifiedAt ? copy.emailVerified : copy.emailPending}
              </p>
              {user.pendingEmail ? <p className="mt-3 text-sm text-sky-100">{user.pendingEmail}</p> : null}
              <a href="/account/security/email" className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]">
                {copy.emailAction}
              </a>
            </div>
          </section>
        </div>

        <AccountAppInstallCard
          info={appVersionInfo}
          labels={{
            eyebrow: copy.appCardEyebrow,
            title: copy.appCardTitle,
            description: copy.appCardDescription,
            install: copy.appInstall,
            installUnavailable: copy.appInstallUnavailable,
            download: copy.appDownload,
            manifest: copy.appManifest,
            version: copy.appVersion,
            hotUpdate: copy.appHotUpdate,
            minimum: copy.appMinimum,
            channel: copy.appChannel,
            fullscreen: copy.appFullscreen,
            installEnabled: copy.appInstallEnabled,
          }}
        />
      </div>
    </div>
  );
}
