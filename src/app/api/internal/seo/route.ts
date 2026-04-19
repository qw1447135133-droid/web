import { NextRequest, NextResponse } from "next/server";
import { displayLocales } from "@/lib/i18n-config";

function isAuthorized(request: NextRequest) {
  const secret = process.env.PIPELINE_API_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-pipeline-secret")?.trim() === secret;
}

async function getGoogleAccessToken(): Promise<string> {
  const b64 = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT_B64 not set");

  const serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));

  // Create JWT for Google OAuth
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  // Sign with private key using Web Crypto API
  const privateKeyPem = serviceAccount.private_key;
  const pemBody = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const keyData = Buffer.from(pemBody, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(signingInput)
  );

  const jwt = `${signingInput}.${Buffer.from(signature).toString("base64url")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function submitUrl(url: string, accessToken: string): Promise<void> {
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Auth errors are critical — surface them
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Indexing API auth error: ${err}`);
    }
    // Other errors (quota, etc.) are non-fatal
    console.warn(`Indexing API non-fatal error for ${url}: ${res.status} ${err}`);
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await request.json() as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN;
  if (!domain) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_DOMAIN not set" }, { status: 500 });

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (err) {
    // Auth failure is critical — log and alert
    console.error("CRITICAL: Google Indexing API auth failed:", err);
    // In production, send admin notification here
    return NextResponse.json({ error: "Google auth failed", detail: String(err) }, { status: 500 });
  }

  const urls = displayLocales.map((locale) => `https://${domain}/${locale}/news/${slug}`);
  const results: { url: string; ok: boolean }[] = [];

  for (const url of urls) {
    try {
      await submitUrl(url, accessToken);
      results.push({ url, ok: true });
    } catch (err) {
      console.error(`Failed to submit ${url}:`, err);
      results.push({ url, ok: false });
    }
  }

  return NextResponse.json({ submitted: results.filter((r) => r.ok).length, total: urls.length, results });
}
