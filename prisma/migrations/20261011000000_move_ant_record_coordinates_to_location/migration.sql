BEGIN;

LOCK TABLE "AntRecord", "locations" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AntRecord"
    WHERE ("latitude" IS NULL) <> ("longitude" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot move coordinates: an ant record has only one coordinate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AntRecord"
    WHERE "latitude" IS NOT NULL
      AND "locationId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot move coordinates: an ant record with coordinates has no location';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "locations"
    WHERE ("latitude" IS NULL) <> ("longitude" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot move coordinates: a location has only one coordinate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS record
    JOIN "locations" AS location ON location."id" = record."locationId"
    WHERE record."latitude" IS NOT NULL
      AND location."latitude" IS NOT NULL
      AND (
        record."latitude" <> location."latitude"
        OR record."longitude" <> location."longitude"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot move coordinates: an ant record conflicts with its location coordinates';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AntRecord" AS first_record
    JOIN "AntRecord" AS second_record
      ON second_record."locationId" = first_record."locationId"
     AND second_record."id" > first_record."id"
    WHERE first_record."latitude" IS NOT NULL
      AND second_record."latitude" IS NOT NULL
      AND (
        first_record."latitude" <> second_record."latitude"
        OR first_record."longitude" <> second_record."longitude"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot move coordinates: records sharing a location have conflicting coordinates';
  END IF;
END $$;

UPDATE "locations" AS location
SET
  "latitude" = source."latitude",
  "longitude" = source."longitude",
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ("locationId")
    "locationId",
    "latitude",
    "longitude"
  FROM "AntRecord"
  WHERE "locationId" IS NOT NULL
    AND "latitude" IS NOT NULL
  ORDER BY "locationId", "id"
) AS source
WHERE location."id" = source."locationId"
  AND location."latitude" IS NULL
  AND location."longitude" IS NULL;

ALTER TABLE "locations"
  ADD CONSTRAINT "locations_coordinates_pair_check"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE "AntRecord"
  DROP CONSTRAINT IF EXISTS "ant_records_coordinates_pair_check",
  DROP COLUMN "latitude",
  DROP COLUMN "longitude";

COMMIT;
