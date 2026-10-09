import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import { getSpeciesList } from "@/services/species.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";
import { speciesListQuerySchema } from "@/validators/species.schema";

export const GET = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));
    const { searchParams } = request.nextUrl;

    const { page, limit, search } = speciesListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") || undefined,
    });

    const result = await getSpeciesList({
      page,
      limit,
      search,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
});
