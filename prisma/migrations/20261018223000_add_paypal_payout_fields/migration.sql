-- Migration: Add PayPal payout fields to payout_profiles
-- Backwards-compatible addition of paypal_email and paypal_id

ALTER TABLE "payout_profiles" ADD COLUMN IF NOT EXISTS "paypal_email" TEXT;
ALTER TABLE "payout_profiles" ADD COLUMN IF NOT EXISTS "paypal_id" TEXT;
