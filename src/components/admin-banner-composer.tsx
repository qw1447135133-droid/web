"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminHomepageBannerRecord } from "@/lib/admin-operations";
import { resolveRenderLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";

type BannerFormCopy = {
  sectionLabel: string;
  editTitle: string;
  createTitle: string;
  fields: {
    key: string;
    theme: string;
    href: string;
    imageUrl: string;
    sortOrder: string;
    status: string;
    startsAt: string;
    endsAt: string;
    titleZhCn: string;
    titleZhTw: string;
    titleEn: string;
    subtitleZhCn: string;
    subtitleZhTw: string;
    subtitleEn: string;
    descriptionZhCn: string;
    descriptionZhTw: string;
    descriptionEn: string;
    ctaLabelZhCn: string;
    ctaLabelZhTw: string;
    ctaLabelEn: string;
  };
  themeLabels: Record<"sunrise" | "field" | "midnight", string>;
  saveButton: string;
  createButton: string;
};

type BannerStatusCopy = {
  active: string;
  inactive: string;
};

type Props = {
  locale: Locale | DisplayLocale;
  currentBanner: AdminHomepageBannerRecord | undefined;
  homepageBannerCount: number;
  cancelLabel: string;
  cancelHref: string;
  formCopy: BannerFormCopy;
  statusCopy: BannerStatusCopy;
  seedTemplates: Array<{
    id: string;
    label: string;
    draft: BannerDraft;
  }>;
};

type PreviewLocale = Locale;

type BannerDraft = {
  key: string;
  theme: "sunrise" | "field" | "midnight";
  href: string;
  imageUrl: string;
  sortOrder: string;
  status: "active" | "inactive";
  startsAt: string;
  endsAt: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  subtitleZhCn: string;
  subtitleZhTw: string;
  subtitleEn: string;
  descriptionZhCn: string;
  descriptionZhTw: string;
  descriptionEn: string;
  ctaLabelZhCn: string;
  ctaLabelZhTw: string;
  ctaLabelEn: string;
};

const previewLocaleLabels: Record<Locale, Record<PreviewLocale, string>> = {
  "zh-CN": {
    "zh-CN": "简体",
    "zh-TW": "繁體",
    en: "English",
  },
  "zh-TW": {
    "zh-CN": "簡體",
    "zh-TW": "繁體",
    en: "English",
  },
  en: {
    "zh-CN": "简体",
    "zh-TW": "繁體",
    en: "English",
  },
};

function resolveAdminBannerLocale(locale: Locale | DisplayLocale): Locale {
  return resolveRenderLocale(locale as DisplayLocale);
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getInitialDraft(currentBanner: AdminHomepageBannerRecord | undefined, homepageBannerCount: number): BannerDraft {
  return {
    key: currentBanner?.key ?? "",
    theme: (currentBanner?.theme as BannerDraft["theme"]) ?? "sunrise",
    href: currentBanner?.href ?? "/",
    imageUrl: currentBanner?.imageUrl ?? "",
    sortOrder: String(currentBanner?.sortOrder ?? homepageBannerCount),
    status: (currentBanner?.status as BannerDraft["status"]) ?? "active",
    startsAt: toDateTimeLocalValue(currentBanner?.startsAt),
    endsAt: toDateTimeLocalValue(currentBanner?.endsAt),
    titleZhCn: currentBanner?.titleZhCn ?? "",
    titleZhTw: currentBanner?.titleZhTw ?? "",
    titleEn: currentBanner?.titleEn ?? "",
    subtitleZhCn: currentBanner?.subtitleZhCn ?? "",
    subtitleZhTw: currentBanner?.subtitleZhTw ?? "",
    subtitleEn: currentBanner?.subtitleEn ?? "",
    descriptionZhCn: currentBanner?.descriptionZhCn ?? "",
    descriptionZhTw: currentBanner?.descriptionZhTw ?? "",
    descriptionEn: currentBanner?.descriptionEn ?? "",
    ctaLabelZhCn: currentBanner?.ctaLabelZhCn ?? "",
    ctaLabelZhTw: currentBanner?.ctaLabelZhTw ?? "",
    ctaLabelEn: currentBanner?.ctaLabelEn ?? "",
  };
}

function getThemeSurface(theme: BannerDraft["theme"]) {
  if (theme === "field") {
    return {
      glow: "from-lime-300/25 via-emerald-500/12 to-cyan-300/6",
      chip: "border-lime-300/30 bg-lime-300/12 text-lime-100",
    };
  }

  if (theme === "midnight") {
    return {
      glow: "from-sky-300/28 via-indigo-500/14 to-fuchsia-300/8",
      chip: "border-sky-300/30 bg-sky-300/12 text-sky-100",
    };
  }

  return {
    glow: "from-orange-300/30 via-orange-500/14 to-amber-200/8",
    chip: "border-orange-300/30 bg-orange-300/12 text-orange-100",
  };
}

function getLocalizedBannerValue(draft: BannerDraft, locale: PreviewLocale) {
  if (locale === "zh-TW") {
    return {
      title: draft.titleZhTw || draft.titleZhCn,
      subtitle: draft.subtitleZhTw || draft.subtitleZhCn || draft.titleZhCn,
      description: draft.descriptionZhTw || draft.descriptionZhCn,
      cta: draft.ctaLabelZhTw || draft.ctaLabelZhCn || "查看详情",
    };
  }

  if (locale === "en") {
    return {
      title: draft.titleEn || draft.titleZhCn,
      subtitle: draft.subtitleEn || draft.subtitleZhCn || draft.titleZhCn,
      description: draft.descriptionEn || draft.descriptionZhCn,
      cta: draft.ctaLabelEn || draft.ctaLabelZhCn || "View details",
    };
  }

  return {
    title: draft.titleZhCn,
    subtitle: draft.subtitleZhCn || draft.titleZhCn,
    description: draft.descriptionZhCn,
    cta: draft.ctaLabelZhCn || "查看详情",
  };
}

function getPreviewStatus(draft: BannerDraft, locale: Locale) {
  if (draft.status !== "active") {
    return locale === "en"
      ? { label: "Inactive", classes: "bg-white/8 text-slate-300" }
      : locale === "zh-TW"
        ? { label: "未啟用", classes: "bg-white/8 text-slate-300" }
        : { label: "未启用", classes: "bg-white/8 text-slate-300" };
  }

  const now = Date.now();
  const startsAt = draft.startsAt ? new Date(draft.startsAt).getTime() : undefined;
  const endsAt = draft.endsAt ? new Date(draft.endsAt).getTime() : undefined;

  if (startsAt && startsAt > now) {
    return locale === "en"
      ? { label: "Scheduled", classes: "bg-sky-300/12 text-sky-100" }
      : locale === "zh-TW"
        ? { label: "待生效", classes: "bg-sky-300/12 text-sky-100" }
        : { label: "待生效", classes: "bg-sky-300/12 text-sky-100" };
  }

  if (endsAt && endsAt < now) {
    return locale === "en"
      ? { label: "Expired", classes: "bg-rose-300/12 text-rose-100" }
      : locale === "zh-TW"
        ? { label: "已過期", classes: "bg-rose-300/12 text-rose-100" }
        : { label: "已过期", classes: "bg-rose-300/12 text-rose-100" };
  }

  return locale === "en"
    ? { label: "Live", classes: "bg-lime-300/12 text-lime-100" }
    : locale === "zh-TW"
      ? { label: "展示中", classes: "bg-lime-300/12 text-lime-100" }
      : { label: "展示中", classes: "bg-lime-300/12 text-lime-100" };
}

function getHrefMeta(href: string, locale: Locale) {
  const trimmed = href.trim();

  if (!trimmed) {
    return locale === "en"
      ? "Missing link"
      : locale === "zh-TW"
        ? "未填寫跳轉連結"
        : "未填写跳转链接";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return locale === "en"
      ? "External destination"
      : locale === "zh-TW"
        ? "外部跳轉"
        : "外部跳转";
  }

  if (trimmed.startsWith("/member")) {
    return locale === "en"
      ? "Membership conversion path"
      : locale === "zh-TW"
        ? "會員轉化路徑"
        : "会员转化路径";
  }

  if (trimmed.startsWith("/plans")) {
    return locale === "en"
      ? "Paid content path"
      : locale === "zh-TW"
        ? "計劃單轉化路徑"
        : "计划单转化路径";
  }

  if (trimmed.startsWith("/live")) {
    return locale === "en"
      ? "Live score path"
      : locale === "zh-TW"
        ? "比分直播入口"
        : "比分直播入口";
  }

  return locale === "en"
    ? "Internal destination"
    : locale === "zh-TW"
      ? "站內跳轉"
      : "站内跳转";
}

export function AdminBannerComposer({
  locale,
  currentBanner,
  homepageBannerCount,
  cancelLabel,
  cancelHref,
  formCopy,
  statusCopy,
  seedTemplates,
}: Props) {
  const adminLocale = resolveAdminBannerLocale(locale);
  const [draft, setDraft] = useState<BannerDraft>(() => getInitialDraft(currentBanner, homepageBannerCount));
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(adminLocale);
  const previewText = getLocalizedBannerValue(draft, previewLocale);
  const previewStatus = getPreviewStatus(draft, adminLocale);
  const themeSurface = getThemeSurface(draft.theme);
  const hrefMeta = getHrefMeta(draft.href, adminLocale);
  const sortOrder = Number.parseInt(draft.sortOrder || "0", 10);
  const projectedSlot =
    Number.isFinite(sortOrder) && sortOrder >= 0 && sortOrder < 3 && previewStatus.label !== statusCopy.inactive
      ? adminLocale === "en"
        ? `Projected hero slot ${sortOrder + 1}`
        : adminLocale === "zh-TW"
          ? `預計首頁第 ${sortOrder + 1} 位`
          : `预计首页第 ${sortOrder + 1} 位`
      : adminLocale === "en"
        ? "Projected standby"
        : adminLocale === "zh-TW"
          ? "預計候補位"
          : "预计候补位";

  function updateField<K extends keyof BannerDraft>(key: K, value: BannerDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <form action="/api/admin/operations/homepage-banners" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">{formCopy.sectionLabel}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {currentBanner ? formCopy.editTitle : formCopy.createTitle}
          </h3>
        </div>
        {currentBanner ? (
          <Link href={cancelHref} className="text-sm text-slate-400 transition hover:text-white">
            {cancelLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">
          {adminLocale === "en"
            ? "Homepage hero reads database banners first and shows up to 3 active items by sort order."
            : adminLocale === "zh-TW"
              ? "首頁 Hero 會優先讀取資料庫 Banner，並按排序展示最多 3 條有效項目。"
              : "首页 Hero 会优先读取数据库 Banner，并按排序展示最多 3 条有效项目。"}
        </p>
        <p className="mt-2 text-xs leading-6 text-slate-400">
          {adminLocale === "en"
            ? "Use the live preview below to check theme, localized copy, CTA, and destination quality before publishing."
            : adminLocale === "zh-TW"
              ? "發佈前可直接用下方即時預覽核對主題、三語文案、CTA 與跳轉品質。"
              : "发布前可直接用下方实时预览核对主题、三语文案、CTA 与跳转质量。"}
        </p>
        {seedTemplates.length > 0 ? (
          <div className="mt-4 border-t border-white/8 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {adminLocale === "en" ? "Quick fill from seeds" : adminLocale === "zh-TW" ? "快速套用種子" : "快速套用种子"}
              </span>
              {seedTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setDraft(template.draft)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-orange-300/30 hover:text-white"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <input type="hidden" name="intent" value="save" />
      <input type="hidden" name="id" value={currentBanner?.id ?? ""} />

      <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-slate-950/35 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {adminLocale === "en" ? "Live preview" : adminLocale === "zh-TW" ? "即時預覽" : "实时预览"}
            </p>
            <p className="mt-2 text-sm text-slate-300">{hrefMeta}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["zh-CN", "zh-TW", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPreviewLocale(item)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  previewLocale === item
                    ? "border-orange-300/30 bg-orange-300/12 text-orange-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {previewLocaleLabels[adminLocale][item]}
              </button>
            ))}
          </div>
        </div>

        <div
          className="relative mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 p-5"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(3, 8, 20, 0.92), rgba(6, 17, 27, 0.82)), url(${draft.imageUrl || "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80"})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${themeSurface.glow}`} />
          <div className="relative flex min-h-56 flex-col justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${themeSurface.chip}`}>
                {formCopy.themeLabels[draft.theme]}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs ${previewStatus.classes}`}>{previewStatus.label}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {projectedSlot}
              </span>
            </div>

            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {previewText.subtitle || (adminLocale === "en" ? "Subtitle" : adminLocale === "zh-TW" ? "副標" : "副标")}
              </p>
              <h4 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                {previewText.title || (adminLocale === "en" ? "Banner title preview" : adminLocale === "zh-TW" ? "Banner 標題預覽" : "Banner 标题预览")}
              </h4>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                {previewText.description ||
                  (adminLocale === "en"
                    ? "Description preview updates as you edit the form."
                    : adminLocale === "zh-TW"
                      ? "表單修改後，這裡會同步更新正文預覽。"
                      : "表单修改后，这里会同步更新正文预览。")}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                {previewText.cta}
              </span>
              <span className="text-sm text-slate-200">{draft.href || "/"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.key}</span>
          <input type="text" name="key" value={draft.key} onChange={(event) => updateField("key", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.theme}</span>
          <select name="theme" value={draft.theme} onChange={(event) => updateField("theme", event.target.value as BannerDraft["theme"])} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
            {Object.entries(formCopy.themeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.startsAt}</span>
          <input type="datetime-local" name="startsAt" value={draft.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.endsAt}</span>
          <input type="datetime-local" name="endsAt" value={draft.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-slate-400">{formCopy.fields.href}</span>
          <input type="text" name="href" value={draft.href} onChange={(event) => updateField("href", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-slate-400">{formCopy.fields.imageUrl}</span>
          <input type="text" name="imageUrl" value={draft.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.sortOrder}</span>
          <input type="number" name="sortOrder" value={draft.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-400">{formCopy.fields.status}</span>
          <select name="status" value={draft.status} onChange={(event) => updateField("status", event.target.value as BannerDraft["status"])} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
            <option value="active">{statusCopy.active}</option>
            <option value="inactive">{statusCopy.inactive}</option>
          </select>
        </label>
        {([
          ["titleZhCn", formCopy.fields.titleZhCn],
          ["titleZhTw", formCopy.fields.titleZhTw],
          ["titleEn", formCopy.fields.titleEn],
          ["subtitleZhCn", formCopy.fields.subtitleZhCn],
          ["subtitleZhTw", formCopy.fields.subtitleZhTw],
          ["subtitleEn", formCopy.fields.subtitleEn],
          ["ctaLabelZhCn", formCopy.fields.ctaLabelZhCn],
          ["ctaLabelZhTw", formCopy.fields.ctaLabelZhTw],
          ["ctaLabelEn", formCopy.fields.ctaLabelEn],
        ] as const).map(([name, label]) => (
          <label key={name} className="space-y-2 text-sm">
            <span className="text-slate-400">{label}</span>
            <input
              type="text"
              name={name}
              value={draft[name]}
              onChange={(event) => updateField(name, event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            />
          </label>
        ))}
        {([
          ["descriptionZhCn", formCopy.fields.descriptionZhCn],
          ["descriptionZhTw", formCopy.fields.descriptionZhTw],
          ["descriptionEn", formCopy.fields.descriptionEn],
        ] as const).map(([name, label]) => (
          <label key={name} className="space-y-2 text-sm md:col-span-2">
            <span className="text-slate-400">{label}</span>
            <textarea
              name={name}
              rows={3}
              value={draft[name]}
              onChange={(event) => updateField(name, event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            />
          </label>
        ))}
      </div>

      <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
        {currentBanner ? formCopy.saveButton : formCopy.createButton}
      </button>
    </form>
  );
}
