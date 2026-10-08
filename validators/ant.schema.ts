import { z } from "zod";

export const createAntSchema =
  z.object({
    speciesId: z
      .number()
      .int()
      .positive(),

    amount: z
      .number()
      .int()
      .positive(),

    locationId: z
      .number()
      .int()
      .positive(),

    collectionMethodId: z
      .number()
      .int()
      .positive(),

    collectedAt: z
      .string()
      .datetime(),

    description: z
      .string()
      .trim()
      .max(5000)
      .optional(),
  });

export const updateAntSchema =
  z.object({
    speciesId: z
      .number()
      .int()
      .positive()
      .optional(),

    amount: z
      .number()
      .int()
      .positive()
      .optional(),

    locationId: z
      .number()
      .int()
      .positive()
      .optional(),

    collectionMethodId: z
      .number()
      .int()
      .positive()
      .optional(),

    collectedAt: z
      .string()
      .datetime()
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000)
      .optional(),
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

export const antIdSchema =
  z.string().cuid();

export const updateStatusSchema =
  z.object({
    status: z.enum([
      "PENDING",
      "APPROVED",
      "REJECTED",
    ]),

    rejectionReason: z
      .string()
      .trim()
      .max(2000)
      .optional(),
  });