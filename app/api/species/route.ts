import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import { createSpecies, getSpeciesList } from "@/services/species.service";
import { createSpeciesSchema } from "@/validators/species.schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdmin, requireUser } from "@/lib/permissions";

export const GET = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));
    const { searchParams } = request.nextUrl;

    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "20"), 1),
      100,
    );

    const search = searchParams.get("search") ?? undefined;

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

export const POST = auth(async (request: NextAuthRequest) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));
    requireAdmin(user);

    const body = await request.json();
    const data = createSpeciesSchema.parse(body);

    const species = await createSpecies(data);

    return successResponse(
      species,
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
