function getAgentPayoutBaseUrl() {
  const configured =
    process.env.AGENT_PAYOUT_CALLBACK_BASE_URL?.trim() ||
    process.env.PAYMENT_CALLBACK_BASE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  return configured.replace(/\/+$/, "");
}

export function getAgentPayoutCallbackToken() {
  return (
    process.env.AGENT_PAYOUT_CALLBACK_TOKEN?.trim() ||
    process.env.PAYMENT_CALLBACK_TOKEN?.trim() ||
    process.env.SYNC_TRIGGER_TOKEN?.trim() ||
    ""
  );
}

export function getAgentPayoutCallbackPath() {
  return "/api/internal/agents/payout-callback";
}

export function getAgentPayoutPublicUrl(path: string) {
  const baseUrl = getAgentPayoutBaseUrl();

  if (!baseUrl) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${baseUrl}/${path}`;
  }

  return `${baseUrl}${path}`;
}

export function getAgentPayoutCallbackUrl() {
  return getAgentPayoutPublicUrl(getAgentPayoutCallbackPath());
}

export function getAgentPayoutRuntimeConfig() {
  const callbackPath = getAgentPayoutCallbackPath();
  const callbackUrl = getAgentPayoutCallbackUrl();
  const callbackToken = getAgentPayoutCallbackToken();

  return {
    callbackPath,
    callbackUrl,
    callbackUrlConfigured: callbackUrl !== callbackPath,
    callbackTokenConfigured: Boolean(callbackToken),
    callbackAuthMode: callbackToken ? "shared-token" : "disabled",
  } as const;
}
