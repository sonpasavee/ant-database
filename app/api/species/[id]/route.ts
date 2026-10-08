import { NextRequest } from "next/server";

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

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    await requireUser(auth);
    const { id } = await context.params;
    const speciesId = speciesIdSchema.parse({ id });
    const species = await getSpeciesById(speciesId);

    return successResponse(species);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(auth);

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
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser(auth);

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
}
