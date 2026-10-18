-- Migration: Single Active Subscription & Subscription Audit Logs
-- Adds scheduled plan fields to creator_subscriptions and creates subscription_audit_logs

ALTER TABLE "creator_subscriptions" 
ADD COLUMN IF NOT EXISTS "scheduled_plan" TEXT,
ADD COLUMN IF NOT EXISTS "scheduled_change_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "scheduled_interval" TEXT;

CREATE TABLE IF NOT EXISTS "subscription_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID,
    "event" TEXT NOT NULL,
    "provider" TEXT DEFAULT 'DODO',
    "provider_subscription_id" TEXT,
    "dodo_customer_id" TEXT,
    "plan" TEXT,
    "status" TEXT,
    "amount" DECIMAL,
    "currency" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_audit_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_subscription_audit_creator" ON "subscription_audit_logs"("creator_id");
CREATE INDEX IF NOT EXISTS "idx_subscription_audit_sub_id" ON "subscription_audit_logs"("provider_subscription_id");
