import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import { getSpeciesById } from "@/services/species.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/permissions";
import { speciesIdSchema } from "@/validators/species.schema";

export const GET = auth(async (_request: NextAuthRequest, context) => {
  try {
    await requireUser(() => Promise.resolve(_request.auth));
    const { id } = await context.params;
    const speciesId = speciesIdSchema.parse(id);
    const species = await getSpeciesById(speciesId);

    return successResponse(species);
  } catch (error) {
    return errorResponse(error);
  }
});
