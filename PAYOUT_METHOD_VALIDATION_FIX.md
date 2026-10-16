# CreatorStore — Payout Method Conditional Validation & Schema Fix Report

---

## 1. Root Cause of `bank_name` Schema Cache Error

When `payoutProfilesRepo.upsert()` persisted payout data to Supabase/PostgREST PostgreSQL, the payload included `bankName` (mapped to `bank_name` in snake_case). 

However:
- The initial PostgreSQL `payout_profiles` table definition (and schema) did not include the `bank_name` column (as well as `payout_method`, `upi_id`, `account_number`, `ifsc_code`, `payout_schedule`, `minimum_payout_threshold`, and `is_payout_paused`).
- When PostgREST received an upsert payload referencing `bank_name`, it rejected the query with:
  > `"Could not find the 'bank_name' column of 'payout_profiles' in the schema cache"`

---

## 2. Database Migration & Schema Update

A database migration was applied adding all necessary columns as **nullable** fields (preserving existing payout profiles and ensuring UPI-only profiles are never forced to store bank fields). The PostgREST schema cache was then notified (`NOTIFY pgrst, 'reload schema'`).

### Applied SQL Migration
```sql
ALTER TABLE payout_profiles 
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS minimum_payout_threshold NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_payout_paused BOOLEAN DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
```

### Updated `payout_profiles` Table Schema
| Column Name | Data Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `creator_id` | `UUID` | NO | — | FK to `users(id)` |
| `payout_method` | `TEXT` | YES | `NULL` | Active payout method (`ACCOUNT` / `UPI`) |
| `account_holder_name`| `TEXT` | YES | `NULL` | Legal account holder name |
| `bank_name` | `TEXT` | YES | `NULL` | Bank Name (e.g. HDFC Bank, SBI) |
| `account_number` | `TEXT` | YES | `NULL` | Bank Account Number |
| `ifsc_code` | `TEXT` | YES | `NULL` | 11-digit IFSC code |
| `ifsc` | `TEXT` | YES | `NULL` | IFSC code |
| `bank_last4` | `TEXT` | YES | `NULL` | Masked last 4 digits |
| `bank_ifsc_masked` | `TEXT` | YES | `NULL` | Masked IFSC representation |
| `upi_id` | `TEXT` | YES | `NULL` | UPI ID (e.g. name@bank) |
| `payout_schedule` | `TEXT` | YES | `'weekly'` | Scheduled interval (`weekly`/`monthly`) |
| `minimum_payout_threshold` | `NUMERIC` | YES | `100` | Minimum balance before payout trigger |
| `is_payout_paused` | `BOOLEAN` | YES | `FALSE` | Creator payout pause toggle |
| `status` | `TEXT` | YES | `'NOT_CONFIGURED'` | Status (`NOT_CONFIGURED`, `PENDING`, `ACTIVE`, `VERIFIED`) |
| `onboarding_status` | `TEXT` | YES | `'NOT_CONFIGURED'` | Onboarding lifecycle status |
| `verification_status` | `TEXT` | YES | `'NOT_CONFIGURED'` | Verification state (`PENDING`, `VERIFIED`, `FAILED`) |
| `created_at` | `TIMESTAMPTZ`| YES | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ`| YES | `NOW()` | Update timestamp |

---

## 3. Conditional Business Validation

Validation is strictly enforced on the server-side (`lib/services.js` `payoutService.onboard`) based on `payoutMethod`:

### A. Account Details (`payoutMethod = ACCOUNT` / `BANK_ACCOUNT`)
- **Account Holder Name**: **REQUIRED** (min 2 characters)
- **Bank Name**: **REQUIRED** (min 2 characters, non-empty)
- **Account Number**: **REQUIRED** (8–20 numeric digits)
- **IFSC Code**: **REQUIRED** (valid 11-character Indian Financial System Code format `^[A-Z]{4}0[A-Z0-9]{6}$`)
- **Confirm Account Number**: Validated to match `accountNumber` when provided

### B. UPI (`payoutMethod = UPI`)
- **UPI ID**: **REQUIRED** (valid VPA format `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$`)
- **Bank Name**: **NOT REQUIRED** (nullable, ignored)
- **Account Holder Name**: **NOT REQUIRED**
- **Account Number**: **NOT REQUIRED**
- **IFSC Code**: **NOT REQUIRED**

---

## 4. Conditional Database Persistence & Method Switching

- **Saving Account Details**:
  - Sets `payout_method = 'ACCOUNT'`, `provider = 'MANUAL_BANK'`, `business_type = 'ACCOUNT'`, `bank_name`, `account_number`, `ifsc_code`, `bank_last4`, `bank_ifsc_masked`.
  - Clears `upi_id = null`.
  - Sets status to `PENDING` awaiting verification.
- **Saving UPI**:
  - Sets `payout_method = 'UPI'`, `provider = 'MANUAL_UPI'`, `business_type = 'UPI'`, `upi_id`.
  - Sets `bank_name = null`, `account_number = null`, `ifsc_code = null`, `bank_last4 = null`, `bank_ifsc_masked = null`.
  - Sets status to `PENDING` awaiting verification.
- **Active Destination Isolation**:
  - When active `payoutMethod === 'UPI'`, `getStatus` only exposes `upiIdMasked` as the active payout destination. Old bank details are not exposed as active destination.
  - When active `payoutMethod === 'ACCOUNT'`, `getStatus` exposes `bankAccountMasked` and `bankName`.

---

## 5. Frontend UI Adjustments ([`PayoutOnboardingWizard.jsx`](file:///Users/mohitranjan11082/Desktop/crevilo/components/dashboard/PayoutOnboardingWizard.jsx))

1. **When Account Details is selected**:
   - Shows Account Holder Name (required), Bank Name (required), IFSC Code (required), Bank Account Number (required), and Confirm Bank Account Number (required).
2. **When UPI is selected**:
   - Shows **only** the UPI ID field (required).
   - Removed Bank Name, Account Holder Name, Account Number, and IFSC fields from UPI form.
3. **Form Validation**:
   - Dynamic client-side validation runs conditionally according to selected `payoutMethod`.

---

## 6. Security Audit

- **Ownership Integrity**: All payout queries and upserts scope strictly to authenticated `creatorId` from JWT session. Creators cannot inspect or modify other creators' payout profiles.
- **Credential Protection**: Account numbers and UPI IDs are masked (`maskBankAccount`, `maskIfsc`, `maskUpiId`) for display. Raw bank account numbers are never logged in audit events or exposed in unauthenticated endpoints.
- **Non-Bypassable Verification**: Any update or switch of payout method automatically resets `status`, `onboardingStatus`, and `verificationStatus` to `PENDING`. Client-supplied `status: 'ACTIVE'` or `verified: true` payloads are ignored.

---

## 7. Test Results

### 12-Point Acceptance Test Suite (`scripts/test_payout_conditional_validation.js`)
- [x] **TEST 1**: Account Details + valid bank information → **PASS** (Status `PENDING`, `payoutMethod = ACCOUNT`, `bankName = HDFC Bank`, `bankLast4 = 7890`)
- [x] **TEST 2**: Account Details + missing bank name → **PASS** (Server rejects with HTTP 400: *"Bank name is required."*)
- [x] **TEST 3**: Account Details + missing account number → **PASS** (Server rejects with HTTP 400: *"Bank account number is required."*)
- [x] **TEST 4**: Account Details + missing IFSC → **PASS** (Server rejects with HTTP 400: *"IFSC code is required."*)
- [x] **TEST 5**: UPI + valid UPI ID → **PASS** (Status `PENDING`, `payoutMethod = UPI`, `upiIdMasked = mohit••••@okhdfcbank`)
- [x] **TEST 6**: UPI + no bank name → **PASS**
- [x] **TEST 7**: UPI + no account number → **PASS**
- [x] **TEST 8**: UPI + no IFSC → **PASS**
- [x] **TEST 9**: Switch Account → UPI → **PASS** (Active destination switches to UPI ID, status resets to `PENDING`)
- [x] **TEST 10**: Switch UPI → Account → **PASS** (Active destination switches to Bank details, status resets to `PENDING`)
- [x] **TEST 11**: Refresh / `getStatus` persistence → **PASS** (`payoutMethod`, `bankName`, `accountHolderName`, `bankLast4` correctly persist)
- [x] **TEST 12**: Database schema cache direct query → **PASS** (`bank_name` exists, `Could not find column` error completely eliminated)

### Complete Payout Lifecycle Suites
- **`scripts/test_payout_pending_verification.js`**: **13/13 PASSED** (35 assertions)
- **`scripts/test_payout_complete_flow.js`**: **13/13 PASSED** (49 assertions)

---

## 8. Build & Compilation Verification

- **Command**: `npm run build`
- **Result**: `✓ Compiled successfully (67/67 routes generated with zero errors)`.
- **Exit Code**: `0`.
