# CreatorStore Secure Guest Customer Product Access Implementation Report

## 1. Existing Architecture Inspected
- **Customer Identity Model**: CreatorStore uses frictionless guest checkout. Customers do not create accounts or passwords, but provide their email address at checkout.
- **Database & ORM**: PostgreSQL database on Supabase managed via Prisma (`@prisma/client`) with models for `User`, `Store`, `Product`, `Order`, `Entitlement`, and `Customer`.
- **Fulfillment & Verification**: `webhookService.finalizeOrder` executes upon verified Razorpay payment callback or direct verification (`markPaidOnce` guarantees atomic transition).
- **Email System**: Centralized Resend HTTPS API via `emailService` (`CreatorStore <noreply@creatorstore.store>`).
- **Storefront Architecture**: Next.js App Router with dynamic routes `/[username]/[slug]`, `/[username]`, and `/checkout/[productId]`.

---

## 2. Order & Entitlement Relationship
- Upon verified payment, `ordersRepo.markPaidOnce` transitions order status to `PAID`.
- `entitlementsRepo.createForOrder` creates an `ACTIVE` entitlement record tied to `orderId`, `productId`, and `customerEmail`.
- The customer is recognized as an active entitlement holder in the database without requiring an account or password.

---

## 3. Access Token Implementation
- Cryptographically secure random 64-character hexadecimal tokens are generated using Node.js `crypto.randomBytes(32).toString('hex')`.
- Tokens are single-purpose and explicitly tied to:
  - `orderId`
  - `entitlementId`
  - `productId`
  - `customerEmail`
  - `expiresAt` (30 days default)
- Tokens are generated once upon purchase confirmation and formatted into the access URL: `${APP_URL}/access/<secure-token>`.

---

## 4. Token Hashing Strategy
- **Raw Token Storage**: Raw access tokens are **NEVER** stored in the database and **NEVER** logged.
- **Database Storage**: The database only stores the one-way cryptographic SHA-256 hash:
  $$\text{tokenHash} = \text{crypto.createHash('sha256').update(rawToken).digest('hex')}$$
- When `/access/<token>` receives a token, it hashes it immediately with SHA-256 and searches the unique indexed `token_hash` column in `product_access_tokens`.

---

## 5. Access Route (`/access/[token]`)
- **Route Handler**: [`app/access/[token]/route.js`](file:///Users/mohitranjan11082/Desktop/crevilo/app/access/%5Btoken%5D/route.js)
- **Validation Pipeline**:
  1. Validates token existence.
  2. Computes SHA-256 hash and looks up database record.
  3. Verifies token is not expired (`expiresAt > now`).
  4. Verifies order is in `PAID` status.
  5. Verifies entitlement is `ACTIVE` and exists for the target product and email.
  6. Marks `usedAt = now` (while preserving ongoing customer access).
  7. Sets HttpOnly guest access session cookie (`creatorstore_guest_session`).
  8. Sets `Referrer-Policy: strict-origin-when-cross-origin` to prevent token leakage.
  9. Redirects (HTTP 307) directly to the canonical product storefront URL (e.g. `/${creatorUsername}/${productSlug}`).
- **Error Handling**: Invalid or expired tokens redirect to [`app/access/error/page.js`](file:///Users/mohitranjan11082/Desktop/crevilo/app/access/error/page.js) with clean error messaging and a button back to the storefront.

---

## 6. Access Cookie & Session Implementation
- **Cookie Name**: `creatorstore_guest_session`
- **Security Attributes**:
  - `HttpOnly: true` (inaccessible to client JavaScript / XSS protection)
  - `Secure: true` in production (HTTPS only)
  - `SameSite: 'lax'` (CSRF protection)
  - `Path: '/'`
  - `Max-Age: 30 days`
- **Tamper Protection**: Signed using HMAC-SHA256 with server-side `JWT_SECRET` via `signPurpose` / `verifyPurpose(cookie, 'guest_access')`.
- **Payload**: Contains customer email and customer ID. No plaintext passwords, raw tokens, or secrets.

---

## 7. Canonical Product URL Generation
- Dynamically resolves creator storefront username and product slug from database relations:
  ```javascript
  const creatorSlug = record.product?.creator?.store?.username || record.product?.creator?.username
  const productSlug = record.product?.slug
  const redirectUrl = `/${creatorSlug}/${productSlug}`
  ```
- Uses environment-aware base URL (`APP_URL` / `NEXT_PUBLIC_BASE_URL`).

---

## 8. Product Page Ownership Detection
- When `ProductPurchasePage` mounts on `/${creatorUsername}/${productSlug}`, it calls `/api/checkout/check-access?productId=${productId}` with automatic cookie propagation.
- `/api/checkout/check-access` checks the verified guest access cookie, extracts the email, and queries `entitlementsRepo.has(customerId, productId, email)` in PostgreSQL.
- If verified:
  - `hasAccess: true` is returned.
  - UI displays the existing verified card:
    - **"You Own This Product"**
    - **"Account Email: customer@example.com"**
    - **"Entitlement Status: Verified"**
    - **"DOWNLOAD PRODUCT"**

---

## 9. Download Authorization
- Clicking **"DOWNLOAD PRODUCT"** triggers `handleProductAccess()`:
  - Directly requests `/api/checkout/status` with verified guest cookie.
  - Generates signed download URL from `/api/download?token=...&json=true` via Supabase storage.
  - Initiates direct browser download via invisible `<a download>` DOM element.
  - User remains on the exact product page (`/${creatorUsername}/${productSlug}`) with zero URL redirection.

---

## 10. Purchase Email Implementation
- **Email Template**: Updated `purchaseConfirmationEmailTemplate` in [`lib/emailTemplates.js`](file:///Users/mohitranjan11082/Desktop/crevilo/lib/emailTemplates.js).
- **Structure**:
  - Heading: `Purchase Confirmed! 🎉`
  - Subtitle: `Your access is ready.`
  - Details: Product Title, Creator Name, Order ID, Purchase Date, Total Amount.
  - CTA Button: `ACCESS PRODUCT` pointing to `${APP_URL}/access/<secure-token>`.

---

## 11. Resend Integration
- Integrated into `finalizeOrder` in [`lib/services.js`](file:///Users/mohitranjan11082/Desktop/crevilo/lib/services.js).
- Dispatches from `CreatorStore <noreply@creatorstore.store>` via official Resend HTTPS SDK.
- Validated via live test dispatch (`scripts/test_resend_guest_email.js`) with message ID: `01a0b3b7-d54a-7358-9b00-de33bf679e2b`.

---

## 12. Multiple-Product Behavior & Creator Isolation
- Each purchase generates an independent, single-purpose access token.
- Guest sessions authenticate customer identity (email), but product access is strictly checked against database entitlements per product (`entitlementsRepo.has(customerId, targetProductId, email)`).
- Buying Product A from Creator 1 never grants access to Product B from Creator 2 unless separately purchased.

---

## 13. Security Protections
| Protection | Implementation |
|---|---|
| **No Passwords / Accounts** | Zero customer accounts created; guest model preserved |
| **Hashed Tokens** | Only SHA-256 hashes stored in PostgreSQL |
| **Token Entropy** | 256-bit cryptographically secure random bytes |
| **Cookie Security** | HttpOnly, SameSite=Lax, Secure in production, HMAC-SHA256 signed |
| **URL Cleanliness** | Raw tokens stripped on exchange; clean product URLs |
| **Referrer Leakage** | `Referrer-Policy: strict-origin-when-cross-origin` |
| **Tamper Proofing** | Modifying token or cookie fails server validation |
| **Download Gate** | Supabase Storage short-lived signed URLs token-gated by DB entitlement |

---

## 14. Failure Handling
- **Resend Email Failure**: Isolated in `try/catch` block. Order status, payment verification, and entitlement records remain valid.
- **Invalid / Expired Token**: Redirects to `/access/error` with user-friendly messaging; no stack traces or tokens exposed.

---

## 15. Duplicate-Event & Idempotency Protection
- `ordersRepo.markPaidOnce` guarantees atomic order state transition.
- Duplicate webhook payloads or payment callbacks exit immediately, preventing duplicate orders, entitlements, or emails.

---

## 16. Tests Performed
Executed [`scripts/test_guest_product_access.js`](file:///Users/mohitranjan11082/Desktop/crevilo/scripts/test_guest_product_access.js):
1. ✅ **TEST 1 — Paid purchase & hashed token creation**: Verified DB stores SHA-256 hash.
2. ✅ **TEST 2 — Token resolution & cookie creation**: Verified redirect URL and session cookie.
3. ✅ **TEST 3 — Server-side entitlement check**: Verified guest session recognition.
4. ✅ **TEST 4 — Direct secure download**: Verified download token resolution.
5. ✅ **TEST 5 — Multi-product isolation**: Verified unpurchased products rejected.
6. ✅ **TEST 6 — Unauthorized customer denial**: Verified non-entitled emails rejected.
7. ✅ **TEST 7 — Token tampering protection**: Verified manipulated tokens rejected.
8. ✅ **TEST 8 — Expired token rejection**: Verified expired tokens rejected.
9. ✅ **TEST 9 — Unpaid order token rejection**: Verified failed orders cannot access.
10. ✅ **TEST 10 — Duplicate webhook idempotency**: Verified `markPaidOnce` idempotency.
11. ✅ **TEST 11 — Live Resend email dispatch**: Verified receipt delivered to `mohit.mr11082@gmail.com` with `ACCESS PRODUCT` button.

---

## 17. Build Result
- `npm run build` completed with **Exit Code 0**:
  ```
  ▲ Next.js 15.5.18
  ✓ Compiled successfully in 4.7s
  ✓ Linting and checking validity of types
  ✓ Collecting page data
  ✓ Generating static pages (68/68)
  ✓ Finalizing page optimization
  ```

---

## 18. Database Migration
- Added `ProductAccessToken` model to `prisma/schema.prisma` mapping to `product_access_tokens` table.
- Synchronized with remote Supabase PostgreSQL via `npx prisma db push`.
- Indexes created: `token_hash` (unique), `order_id`, `product_id`, `customer_email`, `expires_at`.

---

## 19. Remaining Manual Configuration
- No additional configuration required. `RESEND_API_KEY`, `JWT_SECRET`, `APP_URL`, and Supabase database connection are fully operational.
