import { z } from "zod";

export const speciesIdSchema = z.coerce
  .number()
  .int()
  .positive();

export const speciesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});
