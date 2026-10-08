import { z } from "zod";

export const createSpeciesSchema = z.object({
  commonName: z
    .string()
    .trim()
    .min(1, "Common name is required")
    .max(150),

  scientificName: z
    .string()
    .trim()
    .min(1, "Scientific name is required")
    .max(200),

  genus: z
    .string()
    .trim()
    .max(100)
    .optional(),

  family: z
    .string()
    .trim()
    .max(100)
    .optional(),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional(),
});

export const updateSpeciesSchema =
  createSpeciesSchema.partial();

export const speciesIdSchema = z.coerce
  .number()
  .int()
  .positive();