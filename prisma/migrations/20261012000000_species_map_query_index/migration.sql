CREATE INDEX IF NOT EXISTS "AntRecord_speciesId_status_locationId_idx"
ON "AntRecord" ("speciesId", "status", "locationId");
