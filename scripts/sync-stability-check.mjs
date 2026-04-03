const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_REQUESTS = 5;
const DEFAULT_INTERVAL_MS = 80_000;

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

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function hitSync(baseUrl, token, index) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/internal/sync`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });
  const body = await readJson(response);

  return {
    index,
    statusCode: response.status,
    ok: response.ok,
    message: body?.message ?? null,
    summary: body?.summary ?? null,
    durationMs: Date.now() - startedAt,
  };
}

async function readHealth(baseUrl) {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { accept: "application/json" },
  });
  return {
    statusCode: response.status,
    body: await readJson(response),
  };
}

function summarizeResults(results) {
  const counts = new Map();

  for (const result of results) {
    const key = `${result.statusCode}:${result.message ?? "ok"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([key, count]) => `${key} x${count}`);
}

async function main() {
  const baseUrl = normalizeBaseUrl(getArg("--base-url", process.env.BASE_URL));
  const token = getArg("--token", process.env.SYNC_TRIGGER_TOKEN);
  const mode = getArg("--mode", "burst");
  const requests = parsePositiveInt(getArg("--requests", process.env.SYNC_STRESS_REQUESTS), DEFAULT_REQUESTS);
  const intervalMs = parsePositiveInt(
    getArg("--interval-ms", process.env.SYNC_STRESS_INTERVAL_MS),
    DEFAULT_INTERVAL_MS,
  );

  if (!token) {
    console.error("SYNC_TRIGGER_TOKEN is required. Pass --token or set the environment variable.");
    process.exit(1);
  }

  console.log(`Sync stability target: ${baseUrl}`);
  console.log(`Mode: ${mode}`);
  console.log(`Requests: ${requests}`);
  if (mode === "loop") {
    console.log(`Interval: ${intervalMs}ms`);
  }

  const beforeHealth = await readHealth(baseUrl);
  console.log(
    `Preflight health: statusCode=${beforeHealth.statusCode} status=${beforeHealth.body?.status ?? "--"} warnings=${
      Array.isArray(beforeHealth.body?.warnings) ? beforeHealth.body.warnings.length : 0
    }`,
  );

  const results = [];

  if (mode === "loop") {
    for (let index = 1; index <= requests; index += 1) {
      const result = await hitSync(baseUrl, token, index);
      results.push(result);
      console.log(
        `Run ${index}: status=${result.statusCode} message=${result.message ?? "ok"} duration=${result.durationMs}ms`,
      );

      if (index < requests) {
        await sleep(intervalMs);
      }
    }
  } else {
    const batch = await Promise.all(
      Array.from({ length: requests }, (_, offset) => hitSync(baseUrl, token, offset + 1)),
    );

    for (const result of batch) {
      results.push(result);
      console.log(
        `Run ${result.index}: status=${result.statusCode} message=${result.message ?? "ok"} duration=${result.durationMs}ms`,
      );
    }
  }

  const afterHealth = await readHealth(baseUrl);
  console.log(
    `Post health: statusCode=${afterHealth.statusCode} status=${afterHealth.body?.status ?? "--"} warnings=${
      Array.isArray(afterHealth.body?.warnings) ? afterHealth.body.warnings.length : 0
    }`,
  );

  const summaryLines = summarizeResults(results);
  const hardFailures = results.filter((result) => result.statusCode >= 500 || result.statusCode === 401);
  const acceptedResults = results.filter(
    (result) =>
      result.statusCode === 200 ||
      (result.statusCode === 409 &&
        (result.message === "SYNC_ALREADY_RUNNING" || result.message === "SYNC_COOLDOWN_ACTIVE")),
  );

  console.log("Result buckets:");
  for (const line of summaryLines) {
    console.log(`- ${line}`);
  }

  if (afterHealth.body?.checks?.sync?.latestRun) {
    const latest = afterHealth.body.checks.sync.latestRun;
    console.log(
      `Latest sync after test: status=${latest.status} ageSeconds=${latest.ageSeconds ?? "--"} finishedAt=${latest.finishedAt ?? "--"}`,
    );
  }

  if (hardFailures.length > 0 || acceptedResults.length !== results.length) {
    console.error("Sync stability check failed.");
    process.exit(1);
  }

  console.log("Sync stability check passed.");
}

main().catch((error) => {
  console.error("Sync stability check failed to execute.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
