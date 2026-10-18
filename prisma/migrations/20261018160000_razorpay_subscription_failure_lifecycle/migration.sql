-- Migration: Razorpay Subscription Failure Handling, Lifecycle & Invoices
-- Adds lifecycle, failure, grace period, and invoice tracking to creator_subscriptions
-- Creates subscription_invoices table for audit, manual recovery, and failure reconciliation

ALTER TABLE "creator_subscriptions"
ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
ADD COLUMN IF NOT EXISTS "cancellation_details" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "auth_status" TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "last_invoice_id" TEXT,
ADD COLUMN IF NOT EXISTS "last_invoice_status" TEXT,
ADD COLUMN IF NOT EXISTS "last_payment_failure_reason" TEXT,
ADD COLUMN IF NOT EXISTS "last_payment_failure_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "grace_period_ends_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_creator_subscriptions_status_auth"
ON "creator_subscriptions"("status", "auth_status");

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "subscription_id" TEXT NOT NULL,
    "razorpay_invoice_id" TEXT,
    "razorpay_payment_id" TEXT,
    "amount" DECIMAL DEFAULT 0,
    "currency" TEXT DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "billing_start" TIMESTAMPTZ,
    "billing_end" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "issued_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "attempt_count" INTEGER DEFAULT 0,
    "failure_reason" TEXT,
    "recovery_status" TEXT DEFAULT 'NONE',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_invoices_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_invoices_razorpay_invoice_id_key"
ON "subscription_invoices"("razorpay_invoice_id");

CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_creator"
ON "subscription_invoices"("creator_id");

CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_sub_id"
ON "subscription_invoices"("subscription_id");

CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_recovery"
ON "subscription_invoices"("status", "recovery_status");
