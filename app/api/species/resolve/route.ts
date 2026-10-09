import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";

const saveSpeciesSchema = z.object({
  commonName: z.string().trim().min(1).max(200),
  scientificName: z.string().trim().min(1).max(200),
  genus: z.string().trim().min(1).max(100),
  subfamily: z.string().trim().min(1).max(100),
});

export const POST = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));
    const data = saveSpeciesSchema.parse(await request.json());
    const species = await prisma.$transaction(async (tx) => {
      const lockKey = `species:${data.scientificName.toLocaleLowerCase("en")}`;
      await tx.$queryRaw<{ acquired: boolean }[]>`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0)) IS NULL AS acquired
      `;

      const existing = await tx.antSpecies.findFirst({
        where: {
          scientificName: { equals: data.scientificName, mode: "insensitive" },
        },
        select: { id: true, commonName: true, scientificName: true, genus: true, family: true, subfamily: true },
      });
      if (existing) return existing;

      return tx.antSpecies.create({
        data: {
          commonName: data.commonName,
          scientificName: data.scientificName,
          genus: data.genus,
          family: "Formicidae",
          subfamily: data.subfamily,
        },
        select: { id: true, commonName: true, scientificName: true, genus: true, family: true, subfamily: true },
      });
    });
    return NextResponse.json({ data: species });
  } catch (error) {
    if (error instanceof ApiError || error instanceof ZodError || error instanceof SyntaxError) {
      return errorResponse(error);
    }
    console.error("Species save failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "บันทึกชื่อมดไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }
});
