-- Allow field observations to be recorded before every taxonomic/reference value is known.
ALTER TABLE "AntRecord"
  ALTER COLUMN "speciesId" DROP NOT NULL,
  ALTER COLUMN "locationId" DROP NOT NULL,
  ALTER COLUMN "collectionMethodId" DROP NOT NULL;

ALTER TABLE "AntRecord"
  ADD COLUMN "locationText" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "collectionMethodOther" TEXT;

ALTER TABLE "AntRecord"
  ADD CONSTRAINT "ant_records_location_required_check"
    CHECK ("locationId" IS NOT NULL OR NULLIF(BTRIM("locationText"), '') IS NOT NULL),
  ADD CONSTRAINT "ant_records_collection_method_required_check"
    CHECK ("collectionMethodId" IS NOT NULL OR NULLIF(BTRIM("collectionMethodOther"), '') IS NOT NULL),
  ADD CONSTRAINT "ant_records_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

CREATE TABLE "ant_species_aliases" (
  "id" SERIAL NOT NULL,
  "speciesId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "ant_species_aliases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ant_species_aliases_speciesId_fkey"
    FOREIGN KEY ("speciesId") REFERENCES "ant_species"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ant_species_aliases_speciesId_name_key"
  ON "ant_species_aliases"("speciesId", "name");
CREATE INDEX "ant_species_aliases_name_idx"
  ON "ant_species_aliases"("name");

-- A small reusable method catalog; existing custom methods are left untouched.
INSERT INTO "collection_methods" ("name", "updatedAt")
VALUES
  ('Hand collection', CURRENT_TIMESTAMP),
  ('Pitfall trap', CURRENT_TIMESTAMP),
  ('Baited trap', CURRENT_TIMESTAMP),
  ('Winkler extraction', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
