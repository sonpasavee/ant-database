import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import { createAnt, getAntList } from "@/services/ant.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";
import { antListQuerySchema, createAntSchema } from "@/validators/ant.schema";

export const GET = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));

    const { searchParams } = request.nextUrl;
    const filters = antListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") || undefined,
      speciesId: searchParams.get("speciesId") ?? undefined,
      locationId: searchParams.get("locationId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const result = await getAntList({
      ...filters,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = auth(async (request: NextAuthRequest) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    const body = await request.json();
    const data = createAntSchema.parse(body);

    /*
     * USER:
     *   → PENDING
     *
     * ADMIN:
     *   → APPROVED
     *
     * เพราะ Ant Database ของคุณใช้เอง
     * ถ้าคุณ login ด้วย ADMIN
     * จะไม่ต้องเสียเวลารอ approve ตัวเอง
     */
    const status = user.role === "ADMIN" ? "APPROVED" : "PENDING";

    const record = await createAnt({
      speciesId: data.speciesId,
      amount: data.amount,
      locationId: data.locationId,
      collectionMethodId: data.collectionMethodId,
      collectedAt: new Date(data.collectedAt),
      description: data.description,
      collectedById: user.id,
      status,
    });

    return successResponse(record, 201);
  } catch (error) {
    return errorResponse(error);
  }
});
