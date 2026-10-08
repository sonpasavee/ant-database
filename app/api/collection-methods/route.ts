import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import {
  createCollectionMethod,
  getCollectionMethodList,
} from "@/services/collection-method.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";
import {
  collectionMethodListQuerySchema,
  createCollectionMethodSchema,
} from "@/validators/collection-method.schema";

export const GET = auth(async (request: NextAuthRequest) => {
  try {
    await requireUser(() => Promise.resolve(request.auth));

    const { searchParams } = request.nextUrl;
    const { page, limit, search } = collectionMethodListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") || undefined,
    });

    const result = await getCollectionMethodList(page, limit, search);

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

    const data = createCollectionMethodSchema.parse(body);

    const method = await createCollectionMethod(data);

    return successResponse(method, 201);
  } catch (error) {
    return errorResponse(error);
  }
});
