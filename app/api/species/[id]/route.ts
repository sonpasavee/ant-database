import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import {
  getSpeciesById,
  deleteSpecies,
  updateSpecies,
} from "@/services/species.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";
import {
  speciesIdSchema,
  updateSpeciesSchema,
} from "@/validators/species.schema";

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

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    requireAdmin(user);

    const { id } = await context.params;

    const speciesId = speciesIdSchema.parse(id);

    const body = await request.json();

    const data = updateSpeciesSchema.parse(body);

    const species = await updateSpecies(speciesId, data);

    return successResponse(species);
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = auth(async (_request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(_request.auth));

    requireAdmin(user);

    const { id } = await context.params;

    const speciesId = speciesIdSchema.parse(id);

    await deleteSpecies(speciesId);

    return successResponse({
      message: "Species deleted successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
});
