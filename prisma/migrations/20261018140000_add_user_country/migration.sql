-- Migration: Add country field to User and CreatorProfile
-- Backwards-compatible addition of ISO 3166-1 alpha-2 country code

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);

CREATE INDEX IF NOT EXISTS "idx_users_country" ON "users"("country");
