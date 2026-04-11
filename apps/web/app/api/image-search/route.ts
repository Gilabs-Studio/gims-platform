import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 30;

interface SearchImageItem {
  id: string;
  url: string;
  thumb_url: string;
  alt: string;
  photographer_name: string;
  photographer_url: string;
  unsplash_photo_url: string;
  download_location: string;
  source: "unsplash";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") ?? "").trim();
  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const requestedPerPage = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PER_PAGE);
  const perPage = Math.min(requestedPerPage, MAX_PER_PAGE);

  if (query.length < 2) {
    return NextResponse.json(
      {
        success: false,
        message: "Search query must be at least 2 characters",
        data: [],
        meta: {
          pagination: {
            page,
            per_page: perPage,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
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
        data: [],
        meta: {
          pagination: {
            page,
            per_page: perPage,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 503 }
    );
  }

  const apiBaseUrl = process.env.UNSPLASH_API_BASE_URL ?? "https://api.unsplash.com";
  const url = new URL("/search/photos", apiBaseUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${accessKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return NextResponse.json(
          {
            success: false,
            message: "Unsplash API rate limit reached",
            provider_status: response.status,
            retry_after_seconds: retryAfter ? Number.parseInt(retryAfter, 10) : null,
            data: [],
            meta: {
              pagination: {
                page,
                per_page: perPage,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false,
              },
            },
            timestamp: new Date().toISOString(),
            request_id: crypto.randomUUID(),
          },
          { status: 429 }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: "Unsplash credentials invalid or permission denied",
            provider_status: response.status,
            provider_response: responseText.slice(0, 300),
            data: [],
            meta: {
              pagination: {
                page,
                per_page: perPage,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false,
              },
            },
            timestamp: new Date().toISOString(),
            request_id: crypto.randomUUID(),
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch images from provider",
          provider_status: response.status,
          provider_response: responseText.slice(0, 300),
          data: [],
          meta: {
            pagination: {
              page,
              per_page: perPage,
              total: 0,
              total_pages: 0,
              has_next: false,
              has_prev: false,
            },
          },
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      total?: number;
      total_pages?: number;
      results?: Array<{
        id: string;
        alt_description?: string | null;
        description?: string | null;
        urls?: {
          regular?: string;
          small?: string;
          thumb?: string;
        };
        user?: {
          name?: string | null;
          links?: {
            html?: string | null;
          };
        };
        links?: {
          html?: string;
          download_location?: string;
        };
      }>;
    };

    const results = payload.results ?? [];
    const data: SearchImageItem[] = results
      .map((item) => {
        const imageUrl = item.urls?.regular ?? item.urls?.small;
        const thumbUrl = item.urls?.small ?? item.urls?.thumb ?? imageUrl;

        if (!imageUrl || !thumbUrl) {
          return null;
        }

        const photoPageUrl = item.links?.html;
        const downloadLocation = item.links?.download_location;
        const photographerName = item.user?.name?.trim();
        const photographerUrl = item.user?.links?.html?.trim();

        if (!photoPageUrl || !downloadLocation || !photographerName || !photographerUrl) {
          return null;
        }

        return {
          id: item.id,
          url: imageUrl,
          thumb_url: thumbUrl,
          alt:
            item.alt_description ??
            item.description ??
            "Unsplash image",
          photographer_name: photographerName,
          photographer_url: photographerUrl,
          unsplash_photo_url: photoPageUrl,
          download_location: downloadLocation,
          source: "unsplash" as const,
        };
      })
      .filter((item): item is SearchImageItem => item !== null);

    const total = payload.total ?? data.length;
    const totalPages = payload.total_pages ?? (total === 0 ? 0 : Math.ceil(total / perPage));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
          has_next: totalPages > 0 && page < totalPages,
          has_prev: totalPages > 0 && page > 1,
        },
      },
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          message: "Image search request timed out",
          data: [],
          meta: {
            pagination: {
              page,
              per_page: perPage,
              total: 0,
              total_pages: 0,
              has_next: false,
              has_prev: false,
            },
          },
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Image search request failed",
        data: [],
        meta: {
          pagination: {
            page,
            per_page: perPage,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
      { status: 500 }
    );
  }
}