import { z } from "zod";

export const createLocationSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200),

    province: z
      .string()
      .trim()
      .max(100)
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000)
      .optional(),

    latitude: z
      .number()
      .min(-90)
      .max(90)
      .optional(),

    longitude: z
      .number()
      .min(-180)
      .max(180)
      .optional(),
  });

export const updateLocationSchema =
  createLocationSchema.partial();

export const locationListQuerySchema = z.object({
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

export const locationIdSchema =
  z.coerce.number().int().positive();