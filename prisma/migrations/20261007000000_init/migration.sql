-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ant_species" (
    "id" SERIAL NOT NULL,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "genus" TEXT,
    "family" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ant_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ant_records" (
    "id" SERIAL NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "collectionMethodId" INTEGER NOT NULL,
    "collectedById" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ant_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ant_images" (
    "id" SERIAL NOT NULL,
    "antRecordId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ant_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ant_species_scientificName_key" ON "ant_species"("scientificName");

-- CreateIndex
CREATE INDEX "ant_species_commonName_idx" ON "ant_species"("commonName");

-- CreateIndex
CREATE UNIQUE INDEX "collection_methods_name_key" ON "collection_methods"("name");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE INDEX "ant_records_status_collectedAt_idx" ON "ant_records"("status", "collectedAt");

-- CreateIndex
CREATE INDEX "ant_records_speciesId_idx" ON "ant_records"("speciesId");

-- CreateIndex
CREATE INDEX "ant_records_locationId_idx" ON "ant_records"("locationId");

-- CreateIndex
CREATE INDEX "ant_records_collectionMethodId_idx" ON "ant_records"("collectionMethodId");

-- CreateIndex
CREATE INDEX "ant_records_collectedById_status_idx" ON "ant_records"("collectedById", "status");

-- CreateIndex
CREATE INDEX "ant_records_amount_idx" ON "ant_records"("amount");

-- CreateIndex
CREATE UNIQUE INDEX "ant_images_publicId_key" ON "ant_images"("publicId");

-- CreateIndex
CREATE INDEX "ant_images_antRecordId_idx" ON "ant_images"("antRecordId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_records" ADD CONSTRAINT "ant_records_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "ant_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_records" ADD CONSTRAINT "ant_records_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_records" ADD CONSTRAINT "ant_records_collectionMethodId_fkey" FOREIGN KEY ("collectionMethodId") REFERENCES "collection_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_records" ADD CONSTRAINT "ant_records_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_records" ADD CONSTRAINT "ant_records_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ant_images" ADD CONSTRAINT "ant_images_antRecordId_fkey" FOREIGN KEY ("antRecordId") REFERENCES "ant_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
