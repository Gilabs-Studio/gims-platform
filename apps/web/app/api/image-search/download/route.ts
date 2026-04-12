import { NextRequest, NextResponse } from "next/server";

interface DownloadPayload {
  photo_id?: string;
  download_location?: string;
}

export async function POST(request: NextRequest) {
  let payload: DownloadPayload;

  try {
    payload = (await request.json()) as DownloadPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON payload",
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 400 }
    );
  }

  const photoId = payload.photo_id?.trim();
  const downloadLocation = payload.download_location?.trim();

  if (!photoId || !downloadLocation) {
    return NextResponse.json(
      {
        success: false,
        message: "photo_id and download_location are required",
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 400 }
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      {
        success: false,
        message: "UNSPLASH_ACCESS_KEY is not configured",
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 503 }
    );
  }

  try {
    const url = new URL(downloadLocation);
    const allowedHosts = new Set(["api.unsplash.com"]);
    const isHttps = url.protocol === "https:";
    const isAllowedHost = allowedHosts.has(url.hostname);
    const isAllowedPath =
      url.pathname.startsWith("/photos/") && url.pathname.endsWith("/download");

    if (!isHttps || !isAllowedHost || !isAllowedPath) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid download_location",
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
        { status: 400 }
      );
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${accessKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: "Failed to trigger Unsplash download event",
          provider_status: response.status,
          provider_response: responseText.slice(0, 300),
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        photo_id: photoId,
      },
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to trigger image download",
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 500 }
    );
  }
}
