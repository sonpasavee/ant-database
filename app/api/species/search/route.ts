import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";
import { ApiError } from "@/lib/api-error";
import { errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";

const MAX_QUERY_LENGTH = 100;
const GBIF_API = "https://api.gbif.org/v1/species";

type GbifMatch = { usageKey?: number; rank?: string };
type GbifSearchResponse = {
  results?: {
    key?: number;
    scientificName?: string;
    canonicalName?: string;
    authorship?: string;
    genus?: string;
    family?: string;
    rank?: string;
    status?: string;
  }[];
};

export const GET = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (query.length < 3 || query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ message: "พิมพ์ชื่ออย่างน้อย 3 ตัวอักษร" }, { status: 400 });
    }

    const familyUrl = new URL(`${GBIF_API}/match`);
    familyUrl.searchParams.set("name", "Formicidae");
    familyUrl.searchParams.set("rank", "FAMILY");
    familyUrl.searchParams.set("strict", "true");
    const familyResponse = await fetch(familyUrl, {
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!familyResponse.ok) throw new Error("GBIF family lookup failed");
    const family = (await familyResponse.json()) as GbifMatch;
    if (!family.usageKey) throw new Error("GBIF ant family was not found");

    const searchUrl = new URL(`${GBIF_API}/search`);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("rank", "SPECIES");
    searchUrl.searchParams.set("highertaxon_key", String(family.usageKey));
    searchUrl.searchParams.set("status", "ACCEPTED");
    searchUrl.searchParams.set("limit", "10");

    const response = await fetch(searchUrl, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error("GBIF species search returned an unsuccessful status", response.status);
      return NextResponse.json(
        { message: "ค้นหาฐานข้อมูลชนิดมดภายนอกไม่สำเร็จ กรุณาลองอีกครั้ง" },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as GbifSearchResponse;
    const results = (payload.results ?? []).flatMap((taxon) => {
      if (
        !Number.isSafeInteger(taxon.key) ||
        !taxon.scientificName ||
        taxon.rank !== "SPECIES" ||
        (taxon.family && taxon.family.toLowerCase() !== "formicidae")
      ) return [];
      return [{
        gbifKey: taxon.key as number,
        scientificName: taxon.scientificName,
        canonicalName: taxon.canonicalName ?? taxon.scientificName,
        authorship: taxon.authorship ?? "",
        genus: taxon.genus ?? null,
        family: "Formicidae",
      }];
    });

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    console.error(
      "GBIF species search failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "เชื่อมต่อฐานข้อมูลชนิดมดไม่ได้ กรุณาลองอีกครั้ง" },
      { status: 502 },
    );
  }
});
