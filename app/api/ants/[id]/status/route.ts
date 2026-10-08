import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import { getAntById, updateAntStatus } from "@/services/ant.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireOwnerOrAdmin } from "@/lib/permissions";
import { antIdSchema, updateStatusSchema } from "@/validators/ant.schema";

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    const { id } = await context.params;

    const antId = antIdSchema.parse(id);
    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    if (user.role !== "ADMIN") {
      const existing = await getAntById(antId);
      requireOwnerOrAdmin(user, existing.collectedById);
      if (data.status !== "PENDING" || !["DRAFT", "REJECTED"].includes(existing.status)) {
        return Response.json(
          { error: "FORBIDDEN", message: "Only drafts or rejected records can be resubmitted" },
          { status: 403 },
        );
      }
    }

    /*
     * ตรวจว่า record มีจริง
     */
    const record = await updateAntStatus(
      antId,
      data.status,
      data.rejectionReason,
      data.speciesId,
    );

    return successResponse(record);
  } catch (error) {
    return errorResponse(error);
  }
});
