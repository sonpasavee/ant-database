import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

import { deleteAnt, getAntById, updateAnt } from "@/services/ant.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser, requireOwnerOrAdmin } from "@/lib/permissions";
import { antIdSchema, updateAntSchema } from "@/validators/ant.schema";
import { assertOwnedAntImages } from "@/lib/ant-image-security";

export const GET = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));
    const { id } = await context.params;
    const antId = antIdSchema.parse(id);

    const record = await getAntById(antId);
    if (
      record.status !== "APPROVED" &&
      record.collectedById !== user.id &&
      user.role !== "ADMIN"
    ) {
      return Response.json({ error: "NOT_FOUND", message: "Ant record not found" }, { status: 404 });
    }
    return successResponse(record);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    const { id } = await context.params;

    const antId = antIdSchema.parse(id);
    const existingRecord = await getAntById(antId);

    requireOwnerOrAdmin(user, existingRecord.collectedById);

    const body = await request.json();

    const data = updateAntSchema.parse(body);
    assertOwnedAntImages(
      data.images,
      user.id,
      existingRecord.images.map((image) => image.publicId),
    );

    if (
      user.role !== "ADMIN" &&
      existingRecord.status !== "DRAFT" &&
      existingRecord.status !== "REJECTED"
    ) {
      return Response.json(
        { error: "RECORD_NOT_EDITABLE", message: "Only draft or rejected records can be edited" },
        { status: 409 },
      );
    }

    /*
     * Approved record:
     * - ADMIN แก้ได้
     * - เจ้าของ USER แก้ไม่ได้
     *
     * เพื่อไม่ให้ข้อมูลที่ผ่านการ approve
     * ถูกแก้โดย user แล้วกลายเป็นข้อมูล
     * ที่ Admin ไม่เคยตรวจ
     */
    if (existingRecord.status === "APPROVED" && user.role !== "ADMIN") {
      return Response.json(
        {
          error: "APPROVED_RECORD_LOCKED",
          message: "Approved records cannot be edited",
        },
        { status: 409 },
      );
    }

    const record = await updateAnt(antId, {
      ...data,

      collectedAt: data.collectedAt ? new Date(data.collectedAt) : undefined,
    });

    return successResponse(record);
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = auth(async (request: NextAuthRequest, context) => {
  try {
    const user = await requireUser(() => Promise.resolve(request.auth));

    const { id } = await context.params;
    const antId = antIdSchema.parse(id);

    const existingRecord = await getAntById(antId);
    requireOwnerOrAdmin(user, existingRecord.collectedById);

    if (existingRecord.status === "APPROVED" && user.role !== "ADMIN") {
      return Response.json(
        {
          error: "APPROVED_RECORD_LOCKED",
          message: "Approved records cannot be deleted",
        },
        { status: 409 },
      );
    }

    await deleteAnt(antId);

    return successResponse({
      message: "Ant record deleted successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
});
