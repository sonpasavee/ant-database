import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import { updateAntStatus } from "@/services/ant.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { antIdSchema, updateStatusSchema } from "@/validators/ant.schema";

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));
    requireAdmin(user);

    const { id } = await context.params;

    const antId = antIdSchema.parse(id);
    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    /*
     * ตรวจว่า record มีจริง
     */
    const record = await updateAntStatus(
      antId,
      data.status,
      data.rejectionReason,
    );

    return successResponse(record);
  } catch (error) {
    return errorResponse(error);
  }
});
