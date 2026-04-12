import { NextRequest, NextResponse } from "next/server";

interface DownloadPayload {
  photo_id?: string;
  download_location?: string;
}

const UNSPLASH_API_ORIGIN = "https://api.unsplash.com";
const UNSPLASH_API_HOSTNAME = "api.unsplash.com";
const UNSPLASH_PHOTO_ID_REGEX = /^[A-Za-z0-9_-]+$/;

function isValidPhotoId(photoId: string): boolean {
  return UNSPLASH_PHOTO_ID_REGEX.test(photoId);
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

  if (!isValidPhotoId(photoId)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid photo_id",
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
    const downloadUrl = new URL(downloadLocation);
    const isHttps = downloadUrl.protocol === "https:";
    const isAllowedHost = downloadUrl.hostname === UNSPLASH_API_HOSTNAME;
    const expectedPath = `/photos/${photoId}/download`;
    const isExpectedPath = downloadUrl.pathname === expectedPath;

    if (!isHttps || !isAllowedHost || !isExpectedPath) {
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

    // Build the outbound URL from fixed server-controlled parts to prevent SSRF.
    const outboundUrl = new URL(expectedPath, UNSPLASH_API_ORIGIN);

    const response = await fetch(outboundUrl.toString(), {
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
