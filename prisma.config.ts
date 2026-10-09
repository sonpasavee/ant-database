import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_URL;
const directUrlPort = directUrl ? new URL(directUrl).port : "";
const migrationUrl = directUrlPort === "6543"
  ? process.env.DATABASE_URL ?? directUrl
  : directUrl ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationUrl },
});
