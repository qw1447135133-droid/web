const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_LOCALES = ["zh-CN", "zh-TW", "en"];

function getArg(name, fallback) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  if (index >= 0) {
    return process.argv[index + 1] ?? fallback;
  }

  return fallback;
}

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function parseLocales(value) {
  return (value || DEFAULT_LOCALES.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function logResult(result) {
  const prefix = result.ok ? "PASS" : "FAIL";
  console.log(`[${prefix}] ${result.label}`);

  if (result.detail) {
    console.log(`       ${result.detail}`);
  }
}

async function checkPublicPage(baseUrl, locale, path, marker) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      cookie: `signalnine-locale=${encodeURIComponent(locale)}`,
      "accept-language": locale,
    },
    redirect: "manual",
  });

  const body = await readResponseBody(response);
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const ok =
    response.status === 200 &&
    text.includes("Signal Nine") &&
    (!marker || text.includes(marker)) &&
    text.length > 800;

  return {
    ok,
    label: `${locale} ${path}`,
    detail: ok
      ? `status=200 marker=${marker || "Signal Nine"}`
      : `status=${response.status} missing marker=${marker || "Signal Nine"}`,
  };
}

async function checkAdminRedirect(baseUrl) {
  const response = await fetch(`${baseUrl}/admin`, {
    redirect: "manual",
  });

  const location = response.headers.get("location") || "";
  const ok = [302, 303, 307, 308].includes(response.status) && location.includes("/login");

  return {
    ok,
    label: "guest /admin redirect",
    detail: `status=${response.status} location=${location || "--"}`,
  };
}

async function checkHealth(baseUrl) {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: {
      accept: "application/json",
    },
  });
  const body = await readResponseBody(response);
  const ok =
    response.status === 200 &&
    body &&
    typeof body === "object" &&
    body.status !== "error" &&
    body.checks?.database?.ok === true;

  return {
    ok,
    label: "GET /api/health",
    detail: ok
      ? `status=${body.status} warnings=${Array.isArray(body.warnings) ? body.warnings.length : 0}`
      : `statusCode=${response.status} status=${body?.status ?? "--"}`,
  };
}

async function main() {
  const baseUrl = normalizeBaseUrl(getArg("--base-url", process.env.BASE_URL));
  const locales = parseLocales(getArg("--locales", process.env.LOCALES));
  const pageMatrix = [
    { path: "/", markers: { "zh-CN": "实时赛况总控台", "zh-TW": "即時賽況總控台", en: "Sports Data Platform" } },
    { path: "/live/football", markers: { "zh-CN": "足球比分", "zh-TW": "足球比分", en: "Football" } },
    { path: "/live/basketball", markers: { "zh-CN": "篮球比分", "zh-TW": "籃球比分", en: "Basketball" } },
    { path: "/live/cricket", markers: { "zh-CN": "板球比分", "zh-TW": "板球比分", en: "Cricket" } },
    { path: "/live/esports", markers: { "zh-CN": "电竞比分", "zh-TW": "電競比分", en: "Esports" } },
    { path: "/database", markers: { "zh-CN": "资料库", "zh-TW": "資料庫", en: "Database" } },
    { path: "/ai-predictions", markers: { "zh-CN": "AI 预测", "zh-TW": "AI 預測", en: "AI" } },
    { path: "/plans", markers: { "zh-CN": "计划单", "zh-TW": "計畫單", en: "Plans" } },
    { path: "/member", markers: { "zh-CN": "会员中心", "zh-TW": "會員中心", en: "Membership" } },
    { path: "/login", markers: { "zh-CN": "登录会员与运营身份", "zh-TW": "登入會員與營運身份", en: "Access Control" } },
  ];

  const results = [];
  results.push(await checkHealth(baseUrl));
  results.push(await checkAdminRedirect(baseUrl));

  for (const locale of locales) {
    for (const page of pageMatrix) {
      results.push(await checkPublicPage(baseUrl, locale, page.path, page.markers[locale] || page.markers["zh-CN"]));
    }
  }

  console.log(`Smoke regression target: ${baseUrl}`);
  console.log(`Locales: ${locales.join(", ")}`);

  for (const result of results) {
    logResult(result);
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`Summary: ${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Smoke regression failed to execute.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
