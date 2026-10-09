import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 25;
const LOCK_DURATION_MS = 5 * 60 * 1_000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1_000;

export async function processCloudinaryCleanupBatch() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const now = new Date();
  const jobs = await prisma.cloudinaryCleanupJob.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    select: { id: true, publicId: true, attempts: true },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const results = await Promise.all(
    jobs.map(async (job) => {
      const leaseUntil = new Date(Date.now() + LOCK_DURATION_MS);
      const claim = await prisma.cloudinaryCleanupJob.updateMany({
        where: {
          id: job.id,
          nextAttemptAt: { lte: now },
          OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
        },
        data: { lockedUntil: leaseUntil },
      });
      if (claim.count === 0) return "skipped" as const;

      try {
        const result = await cloudinary.uploader.destroy(job.publicId, {
          resource_type: "image",
        });
        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error("Cloudinary did not confirm image deletion");
        }
        await prisma.cloudinaryCleanupJob.deleteMany({
          where: { id: job.id, lockedUntil: leaseUntil },
        });
        return "deleted" as const;
      } catch (error) {
        const retryDelay = Math.min(
          60_000 * 2 ** Math.min(job.attempts, 8),
          MAX_RETRY_DELAY_MS,
        );
        await prisma.cloudinaryCleanupJob.updateMany({
          where: { id: job.id, lockedUntil: leaseUntil },
          data: {
            attempts: { increment: 1 },
            nextAttemptAt: new Date(Date.now() + retryDelay),
            lockedUntil: null,
            lastError: error instanceof Error ? error.name.slice(0, 200) : "UnknownError",
          },
        });
        console.error("Cloudinary image cleanup failed", {
          jobId: job.id,
          error: error instanceof Error ? error.name : "UnknownError",
        });
        return "failed" as const;
      }
    }),
  );

  return {
    selected: jobs.length,
    deleted: results.filter((result) => result === "deleted").length,
    failed: results.filter((result) => result === "failed").length,
    skipped: results.filter((result) => result === "skipped").length,
  };
}
