BEGIN;

LOCK TABLE "AntRecord" IN SHARE ROW EXCLUSIVE MODE;

-- Preserve free-form location values by promoting each distinct name into the
-- shared locations catalog before replacing the nullable record reference.
INSERT INTO "locations" ("name", "createdAt", "updatedAt")
SELECT source.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (LOWER(BTRIM("locationText"))) BTRIM("locationText") AS name
  FROM "AntRecord"
  WHERE "locationId" IS NULL
    AND NULLIF(BTRIM("locationText"), '') IS NOT NULL
  ORDER BY LOWER(BTRIM("locationText")), BTRIM("locationText")
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM "locations" AS existing
  WHERE existing."province" IS NULL
    AND LOWER(BTRIM(existing."name")) = LOWER(source.name)
);

UPDATE "AntRecord" AS record
SET "locationId" = (
  SELECT location."id"
  FROM "locations" AS location
  WHERE location."province" IS NULL
    AND LOWER(BTRIM(location."name")) = LOWER(BTRIM(record."locationText"))
  ORDER BY location."id"
  LIMIT 1
)
WHERE record."locationId" IS NULL
  AND NULLIF(BTRIM(record."locationText"), '') IS NOT NULL;

-- Refuse to discard legacy values that conflict with an already-linked
-- reference. Resolve these rows before deploying this migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS record
    JOIN "locations" AS location ON location."id" = record."locationId"
    WHERE NULLIF(BTRIM(record."locationText"), '') IS NOT NULL
      AND LOWER(BTRIM(record."locationText")) <> LOWER(BTRIM(location."name"))
  ) THEN
    RAISE EXCEPTION 'Cannot normalize ant records: locationText conflicts with an existing locationId';
  END IF;
END $$;

-- Promote user-entered collection methods into the shared method catalog.
INSERT INTO "collection_methods" ("name", "createdAt", "updatedAt")
SELECT source.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (LOWER(BTRIM("collectionMethodOther"))) BTRIM("collectionMethodOther") AS name
  FROM "AntRecord"
  WHERE "collectionMethodId" IS NULL
    AND NULLIF(BTRIM("collectionMethodOther"), '') IS NOT NULL
  ORDER BY LOWER(BTRIM("collectionMethodOther")), BTRIM("collectionMethodOther")
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM "collection_methods" AS existing
  WHERE LOWER(BTRIM(existing."name")) = LOWER(source.name)
);

UPDATE "AntRecord" AS record
SET "collectionMethodId" = (
  SELECT method."id"
  FROM "collection_methods" AS method
  WHERE LOWER(BTRIM(method."name")) = LOWER(BTRIM(record."collectionMethodOther"))
  ORDER BY method."id"
  LIMIT 1
)
WHERE record."collectionMethodId" IS NULL
  AND NULLIF(BTRIM(record."collectionMethodOther"), '') IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS record
    WHERE record."locationId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "locations" AS location WHERE location."id" = record."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot normalize ant records: locationId references a missing location';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS record
    WHERE record."collectionMethodId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "collection_methods" AS method WHERE method."id" = record."collectionMethodId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot normalize ant records: collectionMethodId references a missing method';
  END IF;
END $$;

-- Refuse to discard legacy values that conflict with an already-linked method.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS record
    JOIN "collection_methods" AS method ON method."id" = record."collectionMethodId"
    WHERE NULLIF(BTRIM(record."collectionMethodOther"), '') IS NOT NULL
      AND LOWER(BTRIM(record."collectionMethodOther")) <> LOWER(BTRIM(method."name"))
  ) THEN
    RAISE EXCEPTION 'Cannot normalize ant records: collectionMethodOther conflicts with an existing collectionMethodId';
  END IF;
END $$;

ALTER TABLE "AntRecord"
  DROP CONSTRAINT IF EXISTS "ant_records_location_required_check",
  DROP CONSTRAINT IF EXISTS "ant_records_collection_method_required_check",
  DROP COLUMN "locationText",
  DROP COLUMN "collectionMethodOther";

COMMIT;
