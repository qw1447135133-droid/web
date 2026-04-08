import webpush from "web-push";

export type WebPushSubscriptionRecord = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type WebPushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

let configuredSignature: string | null = null;

function trimEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getWebPushRuntimeConfig() {
  const enabled = trimEnv("WEB_PUSH_ENABLED").toLowerCase() !== "false";
  const publicKey = trimEnv("WEB_PUSH_PUBLIC_KEY");
  const privateKey = trimEnv("WEB_PUSH_PRIVATE_KEY");
  const subject = trimEnv("WEB_PUSH_SUBJECT") || "mailto:support@nowscore.local";
  const configured = enabled && Boolean(publicKey && privateKey);

  return {
    enabled,
    configured,
    publicKey: publicKey || undefined,
    privateKey: privateKey || undefined,
    subject,
  };
}

function ensureWebPushConfigured() {
  const runtime = getWebPushRuntimeConfig();

  if (!runtime.configured || !runtime.publicKey || !runtime.privateKey) {
    throw new Error("WEB_PUSH_NOT_CONFIGURED");
  }

  const signature = `${runtime.publicKey}:${runtime.privateKey}:${runtime.subject}`;
  if (configuredSignature !== signature) {
    webpush.setVapidDetails(runtime.subject, runtime.publicKey, runtime.privateKey);
    configuredSignature = signature;
  }

  return runtime;
}

export function isValidWebPushSubscription(value: unknown): value is WebPushSubscriptionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys =
    record.keys && typeof record.keys === "object" && !Array.isArray(record.keys)
      ? (record.keys as Record<string, unknown>)
      : null;

  return Boolean(
    typeof record.endpoint === "string" &&
      record.endpoint.trim() &&
      keys &&
      typeof keys.p256dh === "string" &&
      keys.p256dh.trim() &&
      typeof keys.auth === "string" &&
      keys.auth.trim(),
  );
}

export async function sendWebPushNotification(input: {
  subscription: WebPushSubscriptionRecord;
  payload: WebPushPayload;
  ttlSeconds?: number;
}) {
  ensureWebPushConfigured();

  const response = await webpush.sendNotification(
    input.subscription,
    JSON.stringify(input.payload),
    {
      TTL: input.ttlSeconds ?? 60,
      urgency: "high",
    },
  );

  return {
    statusCode: response.statusCode,
    headers: response.headers,
  };
}
