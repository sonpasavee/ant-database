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

export const locationIdSchema =
  z.coerce.number().int().positive();