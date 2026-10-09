import { z } from "zod";

export const antImageSchema = z.object({
  url: z.string().url(),

  publicId: z.string().min(1).max(500),

  caption: z.string().trim().max(500).optional(),

  sortOrder: z.number().int().min(0).max(4),
});

export const createAntSchema = z.object({
  speciesId: z.number().int().positive().nullable().optional(),

  amount: z.number().int().positive(),

  locationId: z.number().int().positive().nullable().optional(),

  locationName: z.string().trim().min(1).max(300).optional(),

  locationLatitude: z.number().min(-90).max(90).optional(),

  locationLongitude: z.number().min(-180).max(180).optional(),

  collectionMethodId: z.number().int().positive().nullable().optional(),

  collectionMethodName: z.string().trim().min(1).max(200).optional(),

  collectedAt: z.string().datetime(),

  description: z.string().trim().max(5000).optional(),

  images: z.array(antImageSchema).max(5).optional().default([]),

  draft: z.boolean().optional().default(false),
}).superRefine((data, context) => {
  if (!data.locationId && !data.locationName) {
    context.addIssue({ code: "custom", path: ["locationName"], message: "ระบุสถานที่หรือเลือกจากรายการ" });
  }
  if (!data.collectionMethodId && !data.collectionMethodName) {
    context.addIssue({ code: "custom", path: ["collectionMethodName"], message: "เลือกหรือระบุวิธีเก็บ" });
  }
  if ((data.locationLatitude === undefined) !== (data.locationLongitude === undefined)) {
    context.addIssue({ code: "custom", path: ["locationLatitude"], message: "กรุณาระบุพิกัดให้ครบทั้งสองค่า" });
  }
});

export const updateAntSchema = z.object({
  speciesId: z.number().int().positive().nullable().optional(),

  amount: z.number().int().positive().optional(),

  locationId: z.number().int().positive().nullable().optional(),

  locationName: z.string().trim().min(1).max(300).optional(),

  locationLatitude: z.number().min(-90).max(90).nullable().optional(),

  locationLongitude: z.number().min(-180).max(180).nullable().optional(),

  collectionMethodId: z.number().int().positive().nullable().optional(),

  collectionMethodName: z.string().trim().min(1).max(200).optional(),

  collectedAt: z.string().datetime().optional(),

  description: z.string().trim().max(5000).optional(),

  images: z.array(antImageSchema).max(5).optional(),
}).superRefine((data, context) => {
  if (data.locationId === null && !data.locationName) {
    context.addIssue({ code: "custom", path: ["locationName"], message: "ระบุสถานที่ใหม่ก่อนบันทึก" });
  }
  if (data.collectionMethodId === null && !data.collectionMethodName) {
    context.addIssue({ code: "custom", path: ["collectionMethodName"], message: "ระบุวิธีเก็บใหม่ก่อนบันทึก" });
  }
  if (data.locationId !== undefined && data.locationId !== null && data.locationName) {
    context.addIssue({ code: "custom", path: ["locationName"], message: "เลือกสถานที่หรือพิมพ์ชื่อใหม่อย่างใดอย่างหนึ่ง" });
  }
  if (data.collectionMethodId !== undefined && data.collectionMethodId !== null && data.collectionMethodName) {
    context.addIssue({ code: "custom", path: ["collectionMethodName"], message: "เลือกวิธีเก็บหรือพิมพ์ชื่อใหม่อย่างใดอย่างหนึ่ง" });
  }
  const hasLatitude = data.locationLatitude !== undefined;
  const hasLongitude = data.locationLongitude !== undefined;
  if (hasLatitude !== hasLongitude || (hasLatitude && hasLongitude && (data.locationLatitude === null) !== (data.locationLongitude === null))) {
    context.addIssue({ code: "custom", path: ["locationLatitude"], message: "กรุณาระบุพิกัดให้ครบทั้งสองค่า" });
  }
});

export const antListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .default(1)
    .transform((page) => Math.max(page, 1)),

  limit: z.coerce
    .number()
    .int()
    .default(20)
    .transform((limit) => Math.min(Math.max(limit, 1), 100)),

  search: z.string().optional(),

  speciesId: z.coerce.number().int().positive().optional(),

  locationId: z.coerce.number().int().positive().optional(),

  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const antIdSchema = z.string().cuid();

export const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),

  speciesId: z.number().int().positive().optional(),

  rejectionReason: z.string().trim().max(2000).optional(),
});
