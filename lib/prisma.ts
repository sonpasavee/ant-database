import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientRevision?: string;
};

// Prisma Client instances survive Next.js HMR through globalThis. Recreate the
// instance when the generated schema changes so dev keeps the current model.
const prismaClientRevision = "2026-10-ant-species-aliases-v1";
const adapter = new PrismaPg({ connectionString, max: 1 });
const hasCurrentClient =
  globalForPrisma.prisma &&
  globalForPrisma.prismaClientRevision === prismaClientRevision;

if (globalForPrisma.prisma && !hasCurrentClient) {
  void globalForPrisma.prisma.$disconnect();
}

export const prisma: PrismaClient = hasCurrentClient
  ? globalForPrisma.prisma!
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientRevision = prismaClientRevision;
}
