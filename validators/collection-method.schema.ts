import { z } from "zod";

export const createCollectionMethodSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(150),

    description: z
      .string()
      .trim()
      .max(5000)
      .optional(),
  });

export const updateCollectionMethodSchema =
  createCollectionMethodSchema.partial();

export const collectionMethodListQuerySchema = z.object({
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
});

export const collectionMethodIdSchema =
  z.coerce.number().int().positive();