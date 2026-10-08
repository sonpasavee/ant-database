import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import {
  deleteLocation,
  getLocationById,
  updateLocation,
} from "@/services/location.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";
import {
  locationIdSchema,
  updateLocationSchema,
} from "@/validators/location.schema";

export const GET = auth(async (request: NextAuthRequest, context) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));

    const { id } = await context.params;
    const locationId = locationIdSchema.parse(id);

    const location = await getLocationById(locationId);

    return successResponse(location);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));
    requireAdmin(user);
    const { id } = await context.params;
    const locationId = locationIdSchema.parse(id);

    const body = await request.json();
    const updateData = updateLocationSchema.parse(body);
    const updatedLocation = await updateLocation(locationId, updateData);

    return successResponse(updatedLocation);
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));
    requireAdmin(user);

    const { id } = await context.params;
    const locationId = locationIdSchema.parse(id);

    await deleteLocation(locationId);
    return successResponse({
      message: "Location deleted successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
});
