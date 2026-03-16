import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for n8n webhook requests.
 * Routes requests through Next.js to avoid browser CORS restrictions.
 *
 * IMPORTANT — n8n URL modes:
 *  - /webhook-test/<path>  → Test mode: captures input only, does NOT run downstream nodes
 *  - /webhook/<path>       → Production mode: runs full workflow, returns Respond To Webhook output
 *
 * API key injection:
 *  Server-side env vars (APOLLO_API_KEY, SERPER_API_KEY, APIFY_API_KEY) are
 *  merged into the payload here so they are never exposed to the browser.
 *  Explicit caller-supplied values always win (they override the env defaults).
 */

/**
 * Build a server-side API-key overlay from non-public env vars.
 * Only keys whose env var is actually set are included so we don't accidentally
 * overwrite caller-supplied values with an empty string.
 */
function buildApiKeyOverlay(): Record<string, string> {
  const overlay: Record<string, string> = {};
  const apolloKey  = process.env.APOLLO_API_KEY;
  const serperKey  = process.env.SERPER_API_KEY;
  const apifyKey   = process.env.APIFY_API_KEY;
  if (apolloKey)  overlay.apollo_api_key  = apolloKey;
  if (serperKey)  overlay.serper_api_key  = serperKey;
  if (apifyKey)   overlay.apify_api_key   = apifyKey;
  return overlay;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      webhookUrl: string;
      payload?: Record<string, unknown>;
      method?: "POST" | "HEAD" | "GET";
    };

    const { webhookUrl, payload, method = "POST" } = body;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { error: "webhookUrl is required" },
        { status: 400 }
      );
    }

    // Only allow https:// to prevent SSRF, except for local testing via docker/localhost
    const isLocalDevelopment = 
      webhookUrl.startsWith("http://localhost:") || 
      webhookUrl.startsWith("http://127.0.0.1:") || 
      webhookUrl.startsWith("http://host.docker.internal:");

    if (!webhookUrl.startsWith("https://") && !isLocalDevelopment) {
      return NextResponse.json(
        { error: "Only HTTPS webhook URLs are allowed (except local testing)" },
        { status: 400 }
      );
    }

    const isTestMode = webhookUrl.includes("/webhook-test/");

    const init: RequestInit = {
      method,
      signal: AbortSignal.timeout(30_000),
    };

    if (method === "POST" && payload !== undefined) {
      // Merge server-side API keys: env vars provide the base, caller payload
      // fields take precedence (truthy caller value overrides env default).
      const overlay = buildApiKeyOverlay();
      const enrichedPayload: Record<string, unknown> = { ...overlay, ...payload };

      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(enrichedPayload);
    }

    const upstream = await fetch(webhookUrl, init);

    // HEAD test: confirm the endpoint is reachable
    if (method !== "POST") {
      return NextResponse.json(
        { ok: upstream.ok, status: upstream.status },
        { status: 200 }
      );
    }

    const raw = await upstream.text();
    let data: unknown = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

    // n8n test mode returns empty body — full workflow does not run
    if (isTestMode) {
      return NextResponse.json({
        triggered: true,
        test_mode: true,
        warning:
          "You are using /webhook-test/ — n8n only captured the trigger input. " +
          "The workflow nodes did NOT run. Activate the workflow and use /webhook/ for full execution.",
        captured: data,
      });
    }

    // Production mode — data is the Respond to Webhook node output
    if (!data || (typeof data === "object" && data !== null && Object.keys(data as object).length === 0)) {
      return NextResponse.json({
        triggered: true,
        warning:
          "Workflow was triggered but returned an empty response. " +
          "Make sure the workflow is Active and ends with a 'Respond to Webhook' node.",
        raw: raw || null,
      });
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Proxy request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

