import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for n8n webhook requests.
 * Routes requests through Next.js to avoid browser CORS restrictions.
 *
 * IMPORTANT — n8n URL modes:
 *  - /webhook-test/<path>  → Test mode: captures input only, does NOT run downstream nodes
 *  - /webhook/<path>       → Production mode: runs full workflow, returns Respond To Webhook output
 */
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

    // Only allow https:// to prevent SSRF to internal services
    if (!webhookUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Only HTTPS webhook URLs are allowed" },
        { status: 400 }
      );
    }

    const isTestMode = webhookUrl.includes("/webhook-test/");

    const init: RequestInit = {
      method,
      signal: AbortSignal.timeout(30_000),
    };

    if (method === "POST" && payload !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload);
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

