import Link from "next/link";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function t(
  locale: string,
  zhCn: string,
  zhTw: string,
  en: string,
  th?: string,
  vi?: string,
  hi?: string,
) {
  if (locale === "zh-TW") return zhTw;
  if (locale === "en") return en;
  if (locale === "th") return th ?? en;
  if (locale === "vi") return vi ?? en;
  if (locale === "hi") return hi ?? en;
  return zhCn;
}

export default async function AuthorApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const displayLocale = await getCurrentDisplayLocale();
  const [{ session }, user, resolvedSearchParams] = await Promise.all([
    getSessionContext(),
    getCurrentUserRecord(),
    searchParams,
  ]);

  const saved = pickValue(resolvedSearchParams.saved) === "1";
  const error = pickValue(resolvedSearchParams.error);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="section-label">
          {t(displayLocale, "作者招募", "作者招募", "Author onboarding", "รับสมัครผู้เขียน", "Tuyen tac gia", "Author onboarding")}
        </p>
        <h1 className="display-title mt-3 text-4xl font-semibold text-white">
          {t(
            displayLocale,
            "提交作者申请，进入站内内容体系",
            "提交作者申請，進入站內內容體系",
            "Submit your author application",
            "ส่งใบสมัครผู้เขียนเข้าสู่ระบบคอนเทนต์ของเว็บไซต์",
            "Gui don ung tuyen tac gia vao he thong noi dung",
            "Apni author application submit karein",
          )}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          {t(
            displayLocale,
            "填写擅长赛事、联系方式与样例链接后，后台会进入审核队列。通过后会自动生成作者档案，并写入你的消息中心。",
            "填寫擅長賽事、聯絡方式與樣例連結後，後台會進入審核隊列。通過後會自動生成作者檔案，並寫入你的訊息中心。",
            "Share your focus, contact information, and sample links. Approved applications create an author profile and notify you in the member message center.",
            "กรอกความเชี่ยวชาญ ช่องทางติดต่อ และลิงก์ตัวอย่าง จากนั้นทีมงานจะตรวจสอบและแจ้งผลผ่านศูนย์ข้อความ",
            "Dien huong chuyen mon, lien he va link mau. Sau khi duyet, he thong se tao ho so tac gia va gui thong bao.",
            "Apna focus, contact info aur sample links dein. Approval ke baad author profile banega aur message center me notice milega.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/plans" className="rounded-full border border-white/10 px-4 py-2 text-slate-100 transition hover:border-white/20 hover:bg-white/[0.05]">
            {t(displayLocale, "查看计划单区", "查看計畫單區", "Browse plans")}
          </Link>
          <Link href={session.id ? "/member" : "/login?next=%2Fauthors%2Fapply"} className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-400/15">
            {session.id
              ? t(displayLocale, "打开会员中心", "打開會員中心", "Open member center")
              : t(displayLocale, "登录后同步消息", "登入後同步訊息", "Login to sync notifications")}
          </Link>
        </div>
        {saved ? (
          <div className="mt-6 rounded-[1.2rem] border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
            {t(
              displayLocale,
              "作者申请已提交，后台审核完成后会写入消息中心。",
              "作者申請已提交，後台審核完成後會寫入訊息中心。",
              "Application submitted. Review updates will appear in your message center.",
            )}
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form action="/api/authors/applications" method="post" className="glass-panel rounded-[2rem] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{t(displayLocale, "显示名称", "顯示名稱", "Display name")}</span>
              <input
                name="displayName"
                defaultValue={user?.displayName ?? session.displayName ?? ""}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">Email</span>
              <input
                type="email"
                name="email"
                defaultValue={user?.email ?? session.email ?? ""}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{t(displayLocale, "定位标签", "定位標籤", "Badge")}</span>
              <input
                name="badge"
                placeholder={t(displayLocale, "例如：足球分析 / 电竞专栏", "例如：足球分析 / 電競專欄", "e.g. Football analysis / Esports desk")}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{t(displayLocale, "联系渠道", "聯絡渠道", "Contact method")}</span>
              <input
                name="contactMethod"
                defaultValue={user?.contactMethod ?? ""}
                placeholder="Telegram / WhatsApp / WeChat"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{t(displayLocale, "联系信息", "聯絡資訊", "Contact value")}</span>
              <input
                name="contactValue"
                defaultValue={user?.contactValue ?? ""}
                placeholder="@signalnine"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{t(displayLocale, "擅长方向", "擅長方向", "Focus")}</span>
              <input
                name="focus"
                required
                placeholder={t(displayLocale, "例如：足球欧赔 / 篮球让分 / LoL 系列赛前瞻", "例如：足球歐賠 / 籃球讓分 / LoL 系列賽前瞻", "e.g. football odds, basketball spreads, LoL match previews")}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{t(displayLocale, "样例链接", "樣例連結", "Sample links")}</span>
              <textarea
                name="sampleLinks"
                rows={3}
                placeholder={t(displayLocale, "可粘贴过往文章、社媒主页或作品集链接。多条可换行。", "可貼上過往文章、社群主頁或作品集連結。多條可換行。", "Paste articles, social profiles, or portfolio links. One per line is fine.")}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{t(displayLocale, "申请说明", "申請說明", "Application note")}</span>
              <textarea
                name="bio"
                rows={6}
                required
                placeholder={t(displayLocale, "介绍你的擅长联赛、内容风格、近况表现和你能为站内带来的价值。", "介紹你的擅長聯賽、內容風格、近況表現和你能為站內帶來的價值。", "Tell us about your league coverage, content style, recent performance, and the value you can bring to the platform.")}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-full bg-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
            {t(displayLocale, "提交作者申请", "提交作者申請", "Submit application")}
          </button>
        </form>

        <div className="glass-panel rounded-[2rem] p-6">
          <p className="section-label">{t(displayLocale, "审核说明", "審核說明", "Review flow")}</p>
          <div className="mt-4 grid gap-3">
            {[
              t(displayLocale, "1. 提交资料后进入后台内容审核队列。", "1. 提交資料後進入後台內容審核隊列。", "1. Your application enters the admin review queue."),
              t(displayLocale, "2. 运营可直接通过/拒绝，并附上备注。", "2. 營運可直接通過 / 拒絕，並附上備註。", "2. Operators can approve or reject with notes."),
              t(displayLocale, "3. 通过后会自动生成作者档案，后续可继续维护计划单与内容。", "3. 通過後會自動生成作者檔案，後續可繼續維護計畫單與內容。", "3. Approved applications create an author profile ready for content operations."),
            ].map((item) => (
              <div key={item} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
