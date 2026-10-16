-- Razorpay Route payout onboarding tables (missing from initial schema)

CREATE TABLE IF NOT EXISTS payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  payout_method TEXT,
  legal_name TEXT,
  account_holder_name TEXT,
  verified_account_holder_name TEXT,
  business_type TEXT DEFAULT 'individual',
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  bank_last4 TEXT,
  bank_ifsc_masked TEXT,
  ifsc TEXT,
  upi_id TEXT,
  payout_schedule TEXT DEFAULT 'weekly',
  minimum_payout_threshold NUMERIC DEFAULT 100,
  is_payout_paused BOOLEAN DEFAULT FALSE,
  razorpay_account_id TEXT,
  razorpay_contact_id TEXT,
  razorpay_fund_account_id TEXT,
  razorpay_validation_id TEXT,
  provider TEXT DEFAULT 'RAZORPAY_ROUTE',
  status TEXT DEFAULT 'NOT_CONFIGURED',
  onboarding_status TEXT DEFAULT 'NOT_CONFIGURED',
  verification_status TEXT DEFAULT 'NOT_CONFIGURED',
  verification_message TEXT,
  verification_started_at TIMESTAMPTZ,
  verification_completed_at TIMESTAMPTZ,
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payout_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_profiles_creator ON payout_profiles(creator_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_creator ON payout_audit_logs(creator_id);
CREATE INDEX IF NOT EXISTS idx_payout_profiles_rzp_account ON payout_profiles(razorpay_account_id);
CREATE INDEX IF NOT EXISTS idx_payout_profiles_fund ON payout_profiles(razorpay_fund_account_id);

NOTIFY pgrst, 'reload schema';
