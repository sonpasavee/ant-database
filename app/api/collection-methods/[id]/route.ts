import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import {
  deleteCollectionMethod,
  getCollectionMethodById,
  updateCollectionMethod,
} from "@/services/collection-method.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";
import {
  collectionMethodIdSchema,
  updateCollectionMethodSchema,
} from "@/validators/collection-method.schema";

export const GET = auth(async (request: NextAuthRequest, context) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));

    const { id } = await context.params;

    const methodId = collectionMethodIdSchema.parse(id);

    const method = await getCollectionMethodById(methodId);

    return successResponse(method);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    requireAdmin(user);

    const { id } = await context.params;

    const methodId = collectionMethodIdSchema.parse(id);

    const body = await request.json();

    const data = updateCollectionMethodSchema.parse(body);

    const method = await updateCollectionMethod(methodId, data);

    return successResponse(method);
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    requireAdmin(user);

    const { id } = await context.params;

    const methodId = collectionMethodIdSchema.parse(id);

    await deleteCollectionMethod(methodId);

    return successResponse({
      message: "Collection method deleted successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
});
