-- Migration: Stale Payment & Plan Change Expiration Management
-- Adds pending upgrade tracking columns and indexes to creator_subscriptions

ALTER TABLE "creator_subscriptions"
ADD COLUMN IF NOT EXISTS "pending_upgrade_plan" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_interval" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_payment_id" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_status" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_started_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "pending_upgrade_error_message" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_payment_link" TEXT,
ADD COLUMN IF NOT EXISTS "pending_upgrade_amount" DECIMAL,
ADD COLUMN IF NOT EXISTS "pending_upgrade_currency" TEXT;

CREATE INDEX IF NOT EXISTS "idx_creator_subscriptions_pending_upgrade" 
ON "creator_subscriptions"("pending_upgrade_status", "pending_upgrade_started_at");
