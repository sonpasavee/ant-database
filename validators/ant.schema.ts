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

  locationText: z.string().trim().max(300).optional(),

  latitude: z.number().min(-90).max(90).optional(),

  longitude: z.number().min(-180).max(180).optional(),

  collectionMethodId: z.number().int().positive().nullable().optional(),

  collectionMethodOther: z.string().trim().max(200).optional(),

  collectedAt: z.string().datetime(),

  description: z.string().trim().max(5000).optional(),

  images: z.array(antImageSchema).max(5).optional().default([]),

  draft: z.boolean().optional().default(false),
}).superRefine((data, context) => {
  if (!data.locationId && !data.locationText) {
    context.addIssue({ code: "custom", path: ["locationText"], message: "ระบุสถานที่หรือเลือกจากรายการ" });
  }
  if (!data.collectionMethodId && !data.collectionMethodOther) {
    context.addIssue({ code: "custom", path: ["collectionMethodOther"], message: "เลือกหรือระบุวิธีเก็บ" });
  }
  if ((data.latitude === undefined) !== (data.longitude === undefined)) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "กรุณาระบุพิกัดให้ครบทั้งสองค่า" });
  }
});

export const updateAntSchema = z.object({
  speciesId: z.number().int().positive().nullable().optional(),

  amount: z.number().int().positive().optional(),

  locationId: z.number().int().positive().nullable().optional(),

  locationText: z.string().trim().max(300).nullable().optional(),

  latitude: z.number().min(-90).max(90).nullable().optional(),

  longitude: z.number().min(-180).max(180).nullable().optional(),

  collectionMethodId: z.number().int().positive().nullable().optional(),

  collectionMethodOther: z.string().trim().max(200).nullable().optional(),

  collectedAt: z.string().datetime().optional(),

  description: z.string().trim().max(5000).optional(),

  images: z.array(antImageSchema).max(5).optional(),
}).superRefine((data, context) => {
  const hasLatitude = data.latitude !== undefined;
  const hasLongitude = data.longitude !== undefined;
  if (hasLatitude !== hasLongitude || (hasLatitude && hasLongitude && (data.latitude === null) !== (data.longitude === null))) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "กรุณาระบุพิกัดให้ครบทั้งสองค่า" });
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
