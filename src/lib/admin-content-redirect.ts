import { NextRequest, NextResponse } from "next/server";

type AdminContentSection = "overview" | "homepage" | "library" | "distribution" | "assistant";
type AdminContentPane =
  | "featured"
  | "banners"
  | "modules"
  | "authors"
  | "plans"
  | "announcements"
  | "ads";

const adminContentSections = new Set<AdminContentSection>([
  "overview",
  "homepage",
  "library",
  "distribution",
  "assistant",
]);

const adminContentPanes = new Set<AdminContentPane>([
  "featured",
  "banners",
  "modules",
  "authors",
  "plans",
  "announcements",
  "ads",
]);

function getTrimmedFormValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function setOptionalSearchParam(params: URLSearchParams, key: string, value: string, defaultValue = "") {
  if (!value || value === defaultValue) {
    return;
  }

  params.set(key, value);
}

function applyExtraSearchParams(params: URLSearchParams, suffix = "") {
  if (!suffix) {
    return;
  }

  const normalized = suffix.startsWith("&") || suffix.startsWith("?") ? suffix.slice(1) : suffix;

  if (!normalized) {
    return;
  }

  const extra = new URLSearchParams(normalized);
  for (const [key, value] of extra.entries()) {
    params.set(key, value);
  }
}

export function redirectToAdminContent(
  request: NextRequest,
  options: {
    formData?: FormData;
    suffix?: string;
    fallbackSection?: AdminContentSection;
  } = {},
) {
  const url = new URL("/admin", request.url);
  url.searchParams.set("tab", "content");

  const { formData, fallbackSection, suffix = "" } = options;

  if (formData) {
    const requestedSection = getTrimmedFormValue(formData, "contentSection");
    const requestedPane = getTrimmedFormValue(formData, "contentPane");
    const contentSection = adminContentSections.has(requestedSection as AdminContentSection)
      ? (requestedSection as AdminContentSection)
      : fallbackSection;

    if (contentSection && contentSection !== "overview") {
      url.searchParams.set("contentSection", contentSection);
    }

    if (adminContentPanes.has(requestedPane as AdminContentPane)) {
      url.searchParams.set("contentPane", requestedPane);
    }

    setOptionalSearchParam(url.searchParams, "contentSport", getTrimmedFormValue(formData, "contentSport"), "all");
    setOptionalSearchParam(url.searchParams, "contentAuthorId", getTrimmedFormValue(formData, "contentAuthorId"));
    setOptionalSearchParam(
      url.searchParams,
      "contentPlanStatus",
      getTrimmedFormValue(formData, "contentPlanStatus"),
      "all",
    );
    setOptionalSearchParam(url.searchParams, "contentQuery", getTrimmedFormValue(formData, "contentQuery"));
    setOptionalSearchParam(
      url.searchParams,
      "knowledgeStatus",
      getTrimmedFormValue(formData, "knowledgeStatus"),
      "all",
    );
    setOptionalSearchParam(url.searchParams, "knowledgeCategory", getTrimmedFormValue(formData, "knowledgeCategory"));
    setOptionalSearchParam(url.searchParams, "knowledgeQuery", getTrimmedFormValue(formData, "knowledgeQuery"));
  } else if (fallbackSection && fallbackSection !== "overview") {
    url.searchParams.set("contentSection", fallbackSection);
  }

  applyExtraSearchParams(url.searchParams, suffix);
  return NextResponse.redirect(url);
}
