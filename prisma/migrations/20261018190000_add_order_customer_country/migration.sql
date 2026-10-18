-- Migration: Add country field to orders and customers
-- Backwards-compatible addition of ISO 3166-1 alpha-2 country code

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);

CREATE INDEX IF NOT EXISTS "idx_orders_country" ON "orders"("country");
CREATE INDEX IF NOT EXISTS "idx_customers_country" ON "customers"("country");
