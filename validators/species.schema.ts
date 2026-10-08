import { z } from "zod";

export const speciesIdSchema = z.coerce
  .number()
  .int()
  .positive();
