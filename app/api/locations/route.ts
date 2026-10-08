import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import { createLocation, getLocationList } from "@/services/location.service";
import {
    createLocationSchema,
    locationListQuerySchema,
} from "@/validators/location.schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";

export const GET = auth(async (request: NextAuthRequest) => {
    try {
        await requireUser(() => Promise.resolve(request.auth));
        const { searchParams } = request.nextUrl;

        const { page, limit, search } = locationListQuerySchema.parse({
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
            search: searchParams.get("search") || undefined,
        });

        const result = await getLocationList(
            page,
            limit,
            search
        );

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
        const data = createLocationSchema.parse(body);

        const location = await createLocation(data);

        return successResponse(location , 201);
    } catch (error) {
        return errorResponse(error);
    }
});