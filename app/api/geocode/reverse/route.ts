import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const REQUEST_INTERVAL_MS = 1_100;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

let nextRequestAt = 0;
const cache = new Map<string, { expiresAt: number; value: ReverseResult }>();

type ReverseResult = { label: string; province: string };
type NominatimResult = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

async function waitForRequestSlot() {
  const now = Date.now();
  const requestAt = Math.max(now, nextRequestAt);
  nextRequestAt = requestAt + REQUEST_INTERVAL_MS;
  const delay = requestAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
  }

  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value);
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "th");

  try {
    await waitForRequestSlot();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AntDatabase/1.0 (field observation location lookup)",
        "Accept-Language": "th",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Location lookup is temporarily unavailable" },
        { status: 502 },
      );
    }

    const result = (await response.json()) as NominatimResult;
    const address = result.address ?? {};
    const province = address.province ?? address.state ?? address.region;
    const label = [
      address.suburb ?? address.village ?? address.town ?? address.city,
      address.city_district ?? address.district ?? address.county,
      province,
    ]
      .filter((part): part is string => Boolean(part))
      .filter((part, index, parts) => parts.indexOf(part) === index)
      .join(", ");

    if (!province || !label) {
      return NextResponse.json(
        { message: "No location name was found for these coordinates" },
        { status: 404 },
      );
    }

    const value = { label, province };
    if (cache.size >= 1_000) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(value);
  } catch {
    return NextResponse.json(
      { message: "Location lookup is temporarily unavailable" },
      { status: 502 },
    );
  }
}
