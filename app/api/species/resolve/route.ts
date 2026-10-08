import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";

const resolveSchema = z.object({ gbifKey: z.number().int().positive() });

type GbifTaxon = {
  key?: number;
  scientificName?: string;
  canonicalName?: string;
  vernacularName?: string;
  genus?: string;
  family?: string;
  rank?: string;
  status?: string;
  taxonomicStatus?: string;
};

function isAccepted(taxon: GbifTaxon) {
  return (taxon.status ?? taxon.taxonomicStatus)?.toUpperCase() === "ACCEPTED";
}

function isAntFamily(taxon: GbifTaxon) {
  return taxon.family?.trim().toLowerCase() === "formicidae";
}

export const POST = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));
    const { gbifKey } = resolveSchema.parse(await request.json());
    const response = await fetch(`https://api.gbif.org/v1/species/${gbifKey}`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return NextResponse.json({ message: "อ่านข้อมูลชนิดมดจาก GBIF ไม่สำเร็จ" }, { status: 502 });
    }

    const taxon = (await response.json()) as GbifTaxon;
    let belongsToAntFamily = isAntFamily(taxon);

    // Some GBIF name usages omit the denormalized `family` field. In that
    // case, confirm Formicidae from the authoritative parent classification.
    if (!belongsToAntFamily) {
      const parentsResponse = await fetch(
        `https://api.gbif.org/v1/species/${gbifKey}/parents`,
        {
          next: { revalidate: 60 * 60 * 24 },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (parentsResponse.ok) {
        const parents = (await parentsResponse.json()) as GbifTaxon[];
        belongsToAntFamily = parents.some(
          (parent) => parent.rank?.toUpperCase() === "FAMILY" &&
            (parent.scientificName ?? parent.canonicalName)?.trim().toLowerCase() === "formicidae",
        );
      }
    }

    if (
      taxon.key !== gbifKey ||
      taxon.rank?.toUpperCase() !== "SPECIES" ||
      !isAccepted(taxon) ||
      !belongsToAntFamily ||
      !taxon.scientificName
    ) {
      return NextResponse.json(
        { message: "ชนิดมดนี้ไม่ใช่ชื่อวิทยาศาสตร์ที่ยอมรับในกลุ่ม Formicidae" },
        { status: 422 },
      );
    }

    const scientificName = taxon.canonicalName?.trim() || taxon.scientificName.trim();
    const species = await prisma.antSpecies.upsert({
      where: { scientificName },
      update: {},
      create: {
        commonName: taxon.vernacularName?.trim() || taxon.canonicalName || scientificName,
        scientificName,
        genus: taxon.genus ?? undefined,
        family: "Formicidae",
      },
      select: { id: true, commonName: true, scientificName: true, genus: true, family: true },
    });

    return NextResponse.json({ data: species });
  } catch (error) {
    if (error instanceof ApiError || error instanceof ZodError || error instanceof SyntaxError) {
      return errorResponse(error);
    }
    console.error(
      "GBIF taxon resolution failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "บันทึกชนิดมดที่เลือกไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 502 },
    );
  }
});
