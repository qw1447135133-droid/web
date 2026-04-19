import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import { defaultLocale, resolveRenderLocale } from "@/lib/i18n-config";
import type { SiteAd, SiteAdPlacement, SiteAdTheme } from "@/lib/types";

export type SiteAdMetricType = "impression" | "click";

export type AdminSiteAdRecord = {
  id: string;
  key: string;
  placement: SiteAdPlacement;
  format: string;
  theme: SiteAdTheme;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  titleTh: string;
  titleVi: string;
  titleHi: string;
  descriptionZhCn: string;
  descriptionZhTw: string;
  descriptionEn: string;
  descriptionTh: string;
  descriptionVi: string;
  descriptionHi: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
  ctaLabelTh: string;
  ctaLabelVi: string;
  ctaLabelHi: string;
  href?: string;
  imageUrl?: string;
  htmlSnippet?: string;
  status: string;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
  impressionCount: number;
  clickCount: number;
  lastImpressionAt?: string;
  lastClickAt?: string;
};

const revalidateTargets = [
  "/",
  "/member",
  "/plans",
  "/database",
  "/live/football",
  "/live/basketball",
  "/live/cricket",
  "/live/esports",
  "/admin",
];

export const siteAdPlacements: SiteAdPlacement[] = [
  "home-inline",
  "member-inline",
  "plans-inline",
  "database-inline",
  "match-detail-inline",
  "live-footer",
];

const siteAdPlacementMeta: Record<
  SiteAdPlacement,
  {
    label: Record<DisplayLocale, string>;
    hint: Record<DisplayLocale, string>;
  }
> = {
  "home-inline": {
    label: {
      "zh-CN": "首页推荐位",
      "zh-TW": "首頁推薦位",
      en: "Home inline",
      th: "โฆษณาหน้าแรก",
      vi: "Quang cao trang chu",
      hi: "Home inline",
    },
    hint: {
      "zh-CN": "显示在首页 Hero 模块下方，适合首页频道导流。",
      "zh-TW": "顯示在首頁 Hero 模組下方，適合首頁頻道導流。",
      en: "Appears below the home hero area and works for homepage traffic routing.",
      th: "แสดงใต้ hero หน้าแรก เหมาะสำหรับดันทราฟฟิกจากหน้าแรก",
      vi: "Hien ben duoi hero trang chu, phu hop dieu huong luong truy cap trang chu.",
      hi: "Home hero ke neeche dikhai deta hai aur homepage traffic routing ke liye theek hai.",
    },
  },
  "member-inline": {
    label: {
      "zh-CN": "会员中心广告位",
      "zh-TW": "會員中心廣告位",
      en: "Member workspace",
      th: "โฆษณาศูนย์สมาชิก",
      vi: "Quang cao trung tam hoi vien",
      hi: "Member workspace",
    },
    hint: {
      "zh-CN": "显示在会员中心，适合充值、权益和订单引导。",
      "zh-TW": "顯示在會員中心，適合充值、權益和訂單引導。",
      en: "Appears in the member center for recharge, entitlement, and order guidance.",
      th: "แสดงในศูนย์สมาชิก เหมาะสำหรับโปรโมตการเติมเงิน สิทธิ์ และออเดอร์",
      vi: "Hien trong trung tam hoi vien, phu hop cho nap coin, quyen loi va don hang.",
      hi: "Member center mein dikhai deta hai, recharge, entitlement aur orders ke liye theek hai.",
    },
  },
  "plans-inline": {
    label: {
      "zh-CN": "计划单页广告位",
      "zh-TW": "計畫單頁廣告位",
      en: "Plans page",
      th: "โฆษณาหน้าแผน",
      vi: "Quang cao trang plan",
      hi: "Plans page",
    },
    hint: {
      "zh-CN": "显示在计划单列表页顶部内容区之后，适合导流会员和专题内容。",
      "zh-TW": "顯示在計畫單列表頁頂部內容區之後，適合導流會員和專題內容。",
      en: "Appears below the plans page intro and works for member or premium content promotion.",
      th: "แสดงใต้ส่วนแนะนำของหน้าแผน เหมาะสำหรับดันสมาชิกหรือคอนเทนต์พรีเมียม",
      vi: "Hien duoi phan gioi thieu trang plan, phu hop de day membership hoac noi dung premium.",
      hi: "Plans intro ke neeche dikhai deta hai aur membership ya premium content promo ke liye theek hai.",
    },
  },
  "database-inline": {
    label: {
      "zh-CN": "资料库广告位",
      "zh-TW": "資料庫廣告位",
      en: "Database page",
      th: "โฆษณาหน้าฐานข้อมูล",
      vi: "Quang cao trang database",
      hi: "Database page",
    },
    hint: {
      "zh-CN": "显示在资料库筛选区后，适合导流深度内容、计划单和 AI 页面。",
      "zh-TW": "顯示在資料庫篩選區後，適合導流深度內容、計畫單和 AI 頁面。",
      en: "Appears below the database filters and works for deep content, plans, or AI promotion.",
      th: "แสดงใต้ส่วนตัวกรองฐานข้อมูล เหมาะสำหรับดันคอนเทนต์เชิงลึก แผน หรือ AI",
      vi: "Hien duoi bo loc database, phu hop de dieu huong content chuyen sau, plan hoac AI.",
      hi: "Database filters ke neeche dikhai deta hai aur deep content, plans, ya AI promo ke liye theek hai.",
    },
  },
  "match-detail-inline": {
    label: {
      "zh-CN": "赛事详情广告位",
      "zh-TW": "賽事詳情廣告位",
      en: "Match detail",
      th: "โฆษณาหน้ารายละเอียดแมตช์",
      vi: "Quang cao trang chi tiet tran",
      hi: "Match detail",
    },
    hint: {
      "zh-CN": "显示在赛事详情头部信息后，适合承接计划单、AI 和资料库入口。",
      "zh-TW": "顯示在賽事詳情頭部資訊後，適合承接計畫單、AI 和資料庫入口。",
      en: "Appears after the match detail summary and works for linked plans, AI, or database entry points.",
      th: "แสดงหลังสรุปแมตช์ เหมาะสำหรับต่อไปยังแผน AI หรือฐานข้อมูล",
      vi: "Hien sau phan tong quan tran dau, phu hop de noi sang plan, AI hoac database.",
      hi: "Match summary ke baad dikhai deta hai aur linked plans, AI, ya database entry ke liye theek hai.",
    },
  },
  "live-footer": {
    label: {
      "zh-CN": "直播页底部广告位",
      "zh-TW": "直播頁底部廣告位",
      en: "Live board footer",
      th: "โฆษณาท้ายหน้าสด",
      vi: "Quang cao chan trang live",
      hi: "Live board footer",
    },
    hint: {
      "zh-CN": "显示在足球、篮球、板球和电竞直播比分看板之后。",
      "zh-TW": "顯示在足球、籃球、板球和電競直播比分看板之後。",
      en: "Appears below the football, basketball, cricket, and esports live scoreboards.",
      th: "แสดงใต้กระดานสกอร์สดของฟุตบอล บาสเกตบอล คริกเก็ต และอีสปอร์ต",
      vi: "Hien duoi bang ti so live cua bong da, bong ro, cricket va esports.",
      hi: "Football, basketball, cricket aur esports live scoreboards ke neeche dikhai deta hai.",
    },
  },
  sidebar: {
    label: { "zh-CN": "侧边栏广告位", "zh-TW": "側邊欄廣告位", en: "Sidebar", th: "แถบด้านข้าง", vi: "Thanh bên", hi: "Sidebar" },
    hint: { "zh-CN": "显示在公开页面侧边栏。", "zh-TW": "顯示在公開頁面側邊欄。", en: "Shown in the public page sidebar.", th: "แสดงในแถบด้านข้างของหน้าสาธารณะ", vi: "Hiển thị trong thanh bên trang công khai.", hi: "Public page sidebar mein dikhaya jata hai." },
  },
  hero: {
    label: { "zh-CN": "头部横幅广告位", "zh-TW": "頭部橫幅廣告位", en: "Hero banner", th: "แบนเนอร์หลัก", vi: "Banner chính", hi: "Hero banner" },
    hint: { "zh-CN": "显示在页面顶部横幅区域。", "zh-TW": "顯示在頁面頂部橫幅區域。", en: "Shown in the hero banner area.", th: "แสดงในพื้นที่แบนเนอร์หลัก", vi: "Hiển thị trong khu vực banner chính.", hi: "Hero banner area mein dikhaya jata hai." },
  },
  inline: {
    label: { "zh-CN": "内容内嵌广告位", "zh-TW": "內容內嵌廣告位", en: "Inline", th: "โฆษณาในเนื้อหา", vi: "Quảng cáo nội tuyến", hi: "Inline" },
    hint: { "zh-CN": "显示在文章内容中间。", "zh-TW": "顯示在文章內容中間。", en: "Shown within article content.", th: "แสดงภายในเนื้อหาบทความ", vi: "Hiển thị trong nội dung bài viết.", hi: "Article content ke beech mein dikhaya jata hai." },
  },
};

const seedAds = [
  {
    key: "home-inline-esports",
    placement: "home-inline" as const,
    format: "image",
    theme: "highlight" as const,
    titleZhCn: "电竞频道整合入口",
    titleZhTw: "電競頻道整合入口",
    titleEn: "Esports channel hub",
    titleTh: "ศูนย์รวมช่องอีสปอร์ต",
    titleVi: "Trung tam kenh esports",
    titleHi: "Esports channel hub",
    descriptionZhCn: "把 LoL、Dota 2、CS2 的直播、资料库和计划单入口集中到一处。",
    descriptionZhTw: "把 LoL、Dota 2、CS2 的直播、資料庫和計畫單入口集中到一處。",
    descriptionEn: "Bring live boards, database views, and plans for LoL, Dota 2, and CS2 into one entry point.",
    descriptionTh: "รวมไลฟ์ ฐานข้อมูล และแผนของ LoL, Dota 2 และ CS2 ไว้ในจุดเดียว",
    descriptionVi: "Tap trung live, co so du lieu va plan cua LoL, Dota 2, CS2 vao mot diem vao.",
    descriptionHi: "LoL, Dota 2 aur CS2 ke live, database aur plans ko ek entry point par lao.",
    ctaLabelZhCn: "进入电竞",
    ctaLabelZhTw: "進入電競",
    ctaLabelEn: "Open esports",
    ctaLabelTh: "เปิดอีสปอร์ต",
    ctaLabelVi: "Mo esports",
    ctaLabelHi: "Open esports",
    href: "/live/esports",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "member-inline-coins",
    placement: "member-inline" as const,
    format: "image",
    theme: "premium" as const,
    titleZhCn: "球币充值与会员权益",
    titleZhTw: "球幣充值與會員權益",
    titleEn: "Coins and membership workspace",
    titleTh: "ศูนย์เหรียญและสมาชิก",
    titleVi: "Trung tam coin va thanh vien",
    titleHi: "Coins and membership workspace",
    descriptionZhCn: "在个人中心完成充值、查看待处理订单，并用球币解锁会员或内容。",
    descriptionZhTw: "在個人中心完成充值、查看待處理訂單，並用球幣解鎖會員或內容。",
    descriptionEn: "Recharge, review pending orders, and unlock membership or content with coins from one workspace.",
    descriptionTh: "เติมเงิน ดูออเดอร์ค้าง และปลดล็อกสมาชิกหรือคอนเทนต์ด้วยเหรียญในที่เดียว",
    descriptionVi: "Nap coin, xem don dang cho va mo khoa goi thanh vien/noi dung trong mot trang.",
    descriptionHi: "Recharge, pending orders aur coins se membership ya content unlock ek hi jagah se.",
    ctaLabelZhCn: "打开会员中心",
    ctaLabelZhTw: "打開會員中心",
    ctaLabelEn: "Open member center",
    ctaLabelTh: "เปิดศูนย์สมาชิก",
    ctaLabelVi: "Mo trung tam hoi vien",
    ctaLabelHi: "Open member center",
    href: "/member",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "plans-inline-membership",
    placement: "plans-inline" as const,
    format: "image",
    theme: "highlight" as const,
    titleZhCn: "计划单页会员导流",
    titleZhTw: "計畫單頁會員導流",
    titleEn: "Unlock plan depth with membership",
    titleTh: "ปลดล็อกแผนเชิงลึกด้วยสมาชิก",
    titleVi: "Mo khoa plan chuyen sau bang goi thanh vien",
    titleHi: "Unlock plan depth with membership",
    descriptionZhCn: "把会员权益、已购内容和高频计划入口放进同一条消费链路。",
    descriptionZhTw: "把會員權益、已購內容和高頻計畫入口放進同一條消費鏈路。",
    descriptionEn: "Move membership perks, purchased content, and premium plan discovery into one conversion lane.",
    descriptionTh: "รวมสิทธิ์สมาชิก คอนเทนต์ที่ซื้อแล้ว และทางเข้าแผนพรีเมียมไว้ในเส้นทางเดียว",
    descriptionVi: "Dua quyen loi thanh vien, noi dung da mua va plan premium vao cung mot hanh trinh chuyen doi.",
    descriptionHi: "Membership perks, purchased content aur premium plan discovery ko ek conversion lane mein lao.",
    ctaLabelZhCn: "打开会员中心",
    ctaLabelZhTw: "打開會員中心",
    ctaLabelEn: "Open member center",
    ctaLabelTh: "เปิดศูนย์สมาชิก",
    ctaLabelVi: "Mo trung tam hoi vien",
    ctaLabelHi: "Open member center",
    href: "/member",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "database-inline-ai-hub",
    placement: "database-inline" as const,
    format: "image",
    theme: "neutral" as const,
    titleZhCn: "资料库到 AI 预测的衔接位",
    titleZhTw: "資料庫到 AI 預測的銜接位",
    titleEn: "Database to AI hub",
    titleTh: "ทางต่อจากฐานข้อมูลไป AI",
    titleVi: "Loi noi tu database sang AI",
    titleHi: "Database to AI hub",
    descriptionZhCn: "把联赛资料、历史交锋和 AI 预测整合成一个持续浏览入口。",
    descriptionZhTw: "把聯賽資料、歷史交鋒和 AI 預測整合成一個持續瀏覽入口。",
    descriptionEn: "Bridge league archives, head-to-head research, and AI predictions in one follow-on entry point.",
    descriptionTh: "เชื่อมคลังข้อมูลลีก H2H และ AI predictions ไว้ในทางเข้าเดียว",
    descriptionVi: "Ket noi kho du lieu giai dau, H2H va AI predictions trong mot diem vao tiep tuc.",
    descriptionHi: "League archives, H2H research aur AI predictions ko ek follow-on entry point mein jodo.",
    ctaLabelZhCn: "查看 AI 预测",
    ctaLabelZhTw: "查看 AI 預測",
    ctaLabelEn: "Open AI predictions",
    ctaLabelTh: "เปิด AI predictions",
    ctaLabelVi: "Mo AI predictions",
    ctaLabelHi: "Open AI predictions",
    href: "/ai-predictions",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "match-detail-inline-plan",
    placement: "match-detail-inline" as const,
    format: "image",
    theme: "premium" as const,
    titleZhCn: "赛事详情内容承接位",
    titleZhTw: "賽事詳情內容承接位",
    titleEn: "Match detail conversion slot",
    titleTh: "จุดเปลี่ยนต่อในหน้ารายละเอียดแมตช์",
    titleVi: "Vi tri chuyen doi trong trang chi tiet tran",
    titleHi: "Match detail conversion slot",
    descriptionZhCn: "在赛事详情页继续承接计划单、AI 判断和资料库跳转，不让用户在详情页断开。",
    descriptionZhTw: "在賽事詳情頁繼續承接計畫單、AI 判斷和資料庫跳轉，不讓使用者在詳情頁斷開。",
    descriptionEn: "Keep users moving from match detail into plans, AI angles, and database research without dropping the flow.",
    descriptionTh: "ต่อผู้ใช้จากหน้ารายละเอียดไปยังแผน AI และฐานข้อมูลโดยไม่ให้ flow หลุด",
    descriptionVi: "Giu nguoi dung di tiep tu chi tiet tran sang plan, AI va database ma khong dut mach.",
    descriptionHi: "Users ko match detail se plans, AI aur database research tak flow mein rakho.",
    ctaLabelZhCn: "查看计划单",
    ctaLabelZhTw: "查看計畫單",
    ctaLabelEn: "Browse plans",
    ctaLabelTh: "ดูแผน",
    ctaLabelVi: "Xem plan",
    ctaLabelHi: "Browse plans",
    href: "/plans",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "live-footer-member",
    placement: "live-footer" as const,
    format: "image",
    theme: "highlight" as const,
    titleZhCn: "直播页会员与球币入口",
    titleZhTw: "直播頁會員與球幣入口",
    titleEn: "Live board member entry",
    titleTh: "ทางเข้าสมาชิกจากหน้าสด",
    titleVi: "Loi vao hoi vien tu trang live",
    titleHi: "Live board member entry",
    descriptionZhCn: "在比分页底部承接会员、充值和高价值内容跳转。",
    descriptionZhTw: "在比分頁底部承接會員、充值和高價值內容跳轉。",
    descriptionEn: "Route live-board traffic into membership, recharge, and premium content from the board footer.",
    descriptionTh: "ต่อทราฟฟิกจากบอร์ดสดไปยังสมาชิก การเติมเงิน และคอนเทนต์พรีเมียม",
    descriptionVi: "Dieu huong traffic tu bang live sang membership, nap coin va noi dung premium.",
    descriptionHi: "Live board traffic ko membership, recharge aur premium content ki taraf le jao.",
    ctaLabelZhCn: "前往会员中心",
    ctaLabelZhTw: "前往會員中心",
    ctaLabelEn: "Go to member center",
    ctaLabelTh: "ไปศูนย์สมาชิก",
    ctaLabelVi: "Den trung tam hoi vien",
    ctaLabelHi: "Go to member center",
    href: "/member",
    imageUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
  },
];

export function getSiteAdPlacementLabel(
  placement: SiteAdPlacement,
  locale: Locale | DisplayLocale = defaultLocale,
) {
  return localizeValue(siteAdPlacementMeta[placement].label, locale);
}

export function getSiteAdPlacementHint(
  placement: SiteAdPlacement,
  locale: Locale | DisplayLocale = defaultLocale,
) {
  return localizeValue(siteAdPlacementMeta[placement].hint, locale);
}

function safeRevalidate() {
  for (const path of revalidateTargets) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (!error.message.includes("static generation store missing") &&
          !error.message.includes("during render which is unsupported"))
      ) {
        throw error;
      }
    }
  }
}

function toMetricDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const raw = parseText(value);
  return raw || undefined;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = parseText(value);
  if (!raw) {
    return null;
  }

  const next = new Date(raw);
  return Number.isNaN(next.getTime()) ? null : next;
}

function parseSortOrder(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseInt(parseText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePlacement(value: string): SiteAdPlacement {
  return siteAdPlacements.includes(value as SiteAdPlacement) ? (value as SiteAdPlacement) : "home-inline";
}

function normalizeTheme(value: string): SiteAdTheme {
  return value === "highlight" || value === "premium" ? value : "neutral";
}

function normalizeFormat(value: string) {
  return value === "text" || value === "html-snippet" ? value : "image";
}

function localizeValue(values: Record<DisplayLocale, string>, locale: Locale | DisplayLocale) {
  const displayLocale = (locale === "th" || locale === "vi" || locale === "hi" ? locale : resolveRenderLocale(locale as DisplayLocale)) as DisplayLocale;

  if (displayLocale === "th") {
    return values.th || values.en || values["zh-CN"];
  }

  if (displayLocale === "vi") {
    return values.vi || values.en || values["zh-CN"];
  }

  if (displayLocale === "hi") {
    return values.hi || values.en || values["zh-CN"];
  }

  if (displayLocale === "zh-TW") {
    return values["zh-TW"];
  }

  if (displayLocale === "en") {
    return values.en;
  }

  return values["zh-CN"];
}

function mapLocalizedAd(
  record: AdminSiteAdRecord,
  locale: Locale | DisplayLocale = defaultLocale,
): SiteAd {
  return {
    id: record.id,
    placement: record.placement,
    format: record.format === "text" || record.format === "html-snippet" ? record.format : "image",
    theme: record.theme,
    title: localizeValue(
      {
        "zh-CN": record.titleZhCn,
        "zh-TW": record.titleZhTw,
        en: record.titleEn,
        th: record.titleTh,
        vi: record.titleVi,
        hi: record.titleHi,
      },
      locale,
    ),
    description: localizeValue(
      {
        "zh-CN": record.descriptionZhCn,
        "zh-TW": record.descriptionZhTw,
        en: record.descriptionEn,
        th: record.descriptionTh,
        vi: record.descriptionVi,
        hi: record.descriptionHi,
      },
      locale,
    ),
    ctaLabel: localizeValue(
      {
        "zh-CN": record.ctaLabelZhCn,
        "zh-TW": record.ctaLabelZhTw,
        en: record.ctaLabelEn,
        th: record.ctaLabelTh,
        vi: record.ctaLabelVi,
        hi: record.ctaLabelHi,
      },
      locale,
    ),
    href: record.href,
    imageUrl: record.imageUrl,
    htmlSnippet: record.htmlSnippet,
  };
}

function mapAdminRecord(record: {
  id: string;
  key: string;
  placement: string;
  format: string;
  theme: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  titleTh: string;
  titleVi: string;
  titleHi: string;
  descriptionZhCn: string;
  descriptionZhTw: string;
  descriptionEn: string;
  descriptionTh: string;
  descriptionVi: string;
  descriptionHi: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
  ctaLabelTh: string;
  ctaLabelVi: string;
  ctaLabelHi: string;
  href: string | null;
  imageUrl: string | null;
  htmlSnippet: string | null;
  status: string;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  impressionCount: number;
  clickCount: number;
  lastImpressionAt: Date | null;
  lastClickAt: Date | null;
}): AdminSiteAdRecord {
  return {
    id: record.id,
    key: record.key,
    placement: normalizePlacement(record.placement),
    format: normalizeFormat(record.format),
    theme: normalizeTheme(record.theme),
    titleZhCn: record.titleZhCn,
    titleZhTw: record.titleZhTw,
    titleEn: record.titleEn,
    titleTh: record.titleTh,
    titleVi: record.titleVi,
    titleHi: record.titleHi,
    descriptionZhCn: record.descriptionZhCn,
    descriptionZhTw: record.descriptionZhTw,
    descriptionEn: record.descriptionEn,
    descriptionTh: record.descriptionTh,
    descriptionVi: record.descriptionVi,
    descriptionHi: record.descriptionHi,
    ctaLabelZhCn: record.ctaLabelZhCn,
    ctaLabelZhTw: record.ctaLabelZhTw,
    ctaLabelEn: record.ctaLabelEn,
    ctaLabelTh: record.ctaLabelTh,
    ctaLabelVi: record.ctaLabelVi,
    ctaLabelHi: record.ctaLabelHi,
    href: record.href ?? undefined,
    imageUrl: record.imageUrl ?? undefined,
    htmlSnippet: record.htmlSnippet ?? undefined,
    status: record.status,
    sortOrder: record.sortOrder,
    startsAt: record.startsAt?.toISOString(),
    endsAt: record.endsAt?.toISOString(),
    impressionCount: record.impressionCount,
    clickCount: record.clickCount,
    lastImpressionAt: record.lastImpressionAt?.toISOString(),
    lastClickAt: record.lastClickAt?.toISOString(),
  };
}

async function ensureUniqueKey(baseKey: string, ignoreId?: string) {
  const sanitized = baseKey.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || randomUUID().slice(0, 8);
  let candidate = sanitized;
  let index = 2;

  while (true) {
    const existing = await prisma.siteAd.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${sanitized}-${index}`;
    index += 1;
  }
}

function isRecordVisible(record: { status: string; startsAt?: string; endsAt?: string }, now = Date.now()) {
  if (record.status !== "active") {
    return false;
  }

  if (record.startsAt && new Date(record.startsAt).getTime() > now) {
    return false;
  }

  if (record.endsAt && new Date(record.endsAt).getTime() < now) {
    return false;
  }

  return true;
}

export async function getAdminSiteAds(): Promise<AdminSiteAdRecord[]> {
  const records = await prisma.siteAd.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return records.map(mapAdminRecord);
}

export async function saveSiteAd(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const titleZhCn = parseText(formData.get("titleZhCn"));
  const descriptionZhCn = parseText(formData.get("descriptionZhCn"));

  if (!titleZhCn || !descriptionZhCn) {
    throw new Error("SITE_AD_INVALID");
  }

  const key = await ensureUniqueKey(parseText(formData.get("key")) || titleZhCn, id);
  const titleZhTw = parseText(formData.get("titleZhTw")) || titleZhCn;
  const titleEn = parseText(formData.get("titleEn")) || titleZhCn;
  const titleTh = parseText(formData.get("titleTh")) || titleEn;
  const titleVi = parseText(formData.get("titleVi")) || titleEn;
  const titleHi = parseText(formData.get("titleHi")) || titleEn;
  const descriptionZhTw = parseText(formData.get("descriptionZhTw")) || descriptionZhCn;
  const descriptionEn = parseText(formData.get("descriptionEn")) || descriptionZhCn;
  const descriptionTh = parseText(formData.get("descriptionTh")) || descriptionEn;
  const descriptionVi = parseText(formData.get("descriptionVi")) || descriptionEn;
  const descriptionHi = parseText(formData.get("descriptionHi")) || descriptionEn;
  const ctaLabelZhCn = parseText(formData.get("ctaLabelZhCn"));
  const ctaLabelZhTw = parseText(formData.get("ctaLabelZhTw")) || ctaLabelZhCn;
  const ctaLabelEn = parseText(formData.get("ctaLabelEn")) || ctaLabelZhCn;
  const ctaLabelTh = parseText(formData.get("ctaLabelTh")) || ctaLabelEn;
  const ctaLabelVi = parseText(formData.get("ctaLabelVi")) || ctaLabelEn;
  const ctaLabelHi = parseText(formData.get("ctaLabelHi")) || ctaLabelEn;
  const payload = {
    key,
    placement: normalizePlacement(parseText(formData.get("placement"))),
    format: normalizeFormat(parseText(formData.get("format"))),
    theme: normalizeTheme(parseText(formData.get("theme"))),
    titleZhCn,
    titleZhTw,
    titleEn,
    titleTh,
    titleVi,
    titleHi,
    descriptionZhCn,
    descriptionZhTw,
    descriptionEn,
    descriptionTh,
    descriptionVi,
    descriptionHi,
    ctaLabelZhCn,
    ctaLabelZhTw,
    ctaLabelEn,
    ctaLabelTh,
    ctaLabelVi,
    ctaLabelHi,
    href: parseOptionalText(formData.get("href")) ?? null,
    imageUrl: parseOptionalText(formData.get("imageUrl")) ?? null,
    htmlSnippet: parseOptionalText(formData.get("htmlSnippet")) ?? null,
    status: parseText(formData.get("status")) || "active",
    sortOrder: parseSortOrder(formData.get("sortOrder")),
    startsAt: parseOptionalDate(formData.get("startsAt")),
    endsAt: parseOptionalDate(formData.get("endsAt")),
  };

  if (id) {
    await prisma.siteAd.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.siteAd.create({
      data: payload,
    });
  }

  safeRevalidate();
}

export async function toggleSiteAdStatus(id: string) {
  const record = await prisma.siteAd.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!record) {
    throw new Error("SITE_AD_NOT_FOUND");
  }

  await prisma.siteAd.update({
    where: { id },
    data: {
      status: record.status === "active" ? "inactive" : "active",
    },
  });

  safeRevalidate();
}

export async function moveSiteAd(id: string, direction: "up" | "down") {
  const records = await prisma.siteAd.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      placement: true,
      sortOrder: true,
    },
  });
  const current = records.find((item) => item.id === id);

  if (!current) {
    throw new Error("SITE_AD_NOT_FOUND");
  }

  const samePlacement = records.filter((item) => item.placement === current.placement);
  const index = samePlacement.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= samePlacement.length) {
    return;
  }

  const target = samePlacement[targetIndex];
  await prisma.$transaction([
    prisma.siteAd.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.siteAd.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  safeRevalidate();
}

export async function bootstrapMockSiteAds() {
  for (const [index, item] of seedAds.entries()) {
    await prisma.siteAd.upsert({
      where: { key: item.key },
      update: {},
      create: {
        ...item,
        sortOrder: index,
        status: "active",
      },
    });
  }

  safeRevalidate();
}

export async function getSiteAds(
  locale: Locale | DisplayLocale = defaultLocale,
  placement?: SiteAdPlacement,
): Promise<SiteAd[]> {
  const records = await prisma.siteAd.findMany({
    where: {
      ...(placement ? { placement } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return records
    .map(mapAdminRecord)
    .filter((item) => isRecordVisible(item))
    .map((item) => mapLocalizedAd(item, locale));
}

export async function recordSiteAdMetric(adId: string, type: SiteAdMetricType) {
  const record = await prisma.siteAd.findUnique({
    where: { id: adId },
    select: { id: true },
  });

  if (!record) {
    return;
  }

  const now = new Date();
  const metricDate = toMetricDate(now);

  if (type === "click") {
    await prisma.$transaction([
      prisma.siteAd.update({
        where: { id: adId },
        data: {
          clickCount: { increment: 1 },
          lastClickAt: now,
        },
      }),
      prisma.siteAdDailyStat.upsert({
        where: {
          adId_metricDate: {
            adId,
            metricDate,
          },
        },
        update: {
          clickCount: { increment: 1 },
        },
        create: {
          adId,
          metricDate,
          clickCount: 1,
        },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.siteAd.update({
      where: { id: adId },
      data: {
        impressionCount: { increment: 1 },
        lastImpressionAt: now,
      },
    }),
    prisma.siteAdDailyStat.upsert({
      where: {
        adId_metricDate: {
          adId,
          metricDate,
        },
      },
      update: {
        impressionCount: { increment: 1 },
      },
      create: {
        adId,
        metricDate,
        impressionCount: 1,
      },
    }),
  ]);
}
