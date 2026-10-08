import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { waitForNominatimSlot } from "@/lib/nominatim";

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 120;
// Nominatim viewbox order: left, top, right, bottom.
const THAILAND_VIEWBOX = "97.3,20.5,105.7,5.6";

type NominatimSearchResult = {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { message: `Search must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters` },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "th");
  url.searchParams.set("viewbox", THAILAND_VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "th");

  try {
    await waitForNominatimSlot();
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AntDatabase/1.0 (field observation place search)",
        "Accept-Language": "th",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      console.error("Nominatim place search returned an unsuccessful status", response.status);
      const status = response.status === 429 ? 503 : 502;
      return NextResponse.json(
        { message: response.status === 429
          ? "กำลังมีคำค้นจำนวนมาก กรุณารอสักครู่แล้วลองใหม่"
          : "บริการค้นหาสถานที่ขัดข้องชั่วคราว กรุณาลองใหม่ หรือปักหมุดบนแผนที่" },
        { status, headers: response.status === 429 ? { "Retry-After": "2" } : undefined },
      );
    }

    const payload = (await response.json()) as NominatimSearchResult[];
    const results = (Array.isArray(payload) ? payload : []).flatMap((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      const label = typeof item.display_name === "string" ? item.display_name.trim() : "";
      if (!label || label.length > 500 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      if (latitude < 5.6 || latitude > 20.5 || longitude < 97.3 || longitude > 105.7) return [];
      return [{ label, latitude, longitude }];
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "Nominatim place search request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "เชื่อมต่อบริการค้นหาสถานที่ไม่ได้ กรุณาลองอีกครั้งหรือปักหมุดบนแผนที่" },
      { status: 502 },
    );
  }
}
