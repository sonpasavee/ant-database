CREATE TABLE "cloudinary_cleanup_jobs" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloudinary_cleanup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cloudinary_cleanup_jobs_publicId_key"
ON "cloudinary_cleanup_jobs"("publicId");

CREATE INDEX "cloudinary_cleanup_jobs_nextAttemptAt_lockedUntil_createdAt_idx"
ON "cloudinary_cleanup_jobs"("nextAttemptAt", "lockedUntil", "createdAt");
