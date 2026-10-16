# Payment Routing Implementation Report: India vs. International Subscriptions

**CreatorStore Platform Architecture**  
**Date:** October 10, 2026  
**Status:** Complete & Verified  

---

## 1. Executive Summary

This report documents the implementation of **country-based payment routing** for CreatorStore subscription purchases. The platform previously routed all international checkout attempts through Razorpay's domestic and international order modal. Under this architecture update:

1. **Domestic Customers (India 🇮🇳):** Route exclusively to the existing **Razorpay** integration in Indian Rupees (`INR`), supporting UPI AutoPay, cards, and netbanking with genuine recurring monthly and annual billing.
2. **International Customers (Outside India 🌎):** Route directly to the standalone **PayPal** integration in US Dollars (`USD`), **completely bypassing Razorpay checkout**.
3. **Unified Entitlements & Subscription System:** Both providers integrate into CreatorStore's shared database model (`creator_subscriptions`), entitlement guard (`creatorSubscriptionService.assertActiveEntitlement`), trial lifecycle, and billing management.
4. **Transparent Renewal Truthfulness:** The actual capability of the direct PayPal integration is truthful: PayPal Order capture provides fixed-duration access (30 days for monthly, 365 days for annual) with explicit manual renewal. Live automated debit renewal is documented as `BLOCKED` pending PayPal Subscriptions API merchant billing agreement approval, rather than falsely advertising auto-renewal.
5. **No Stripe Restoration:** Zero Stripe dependencies or code were introduced or restored.

---

## 2. Existing Architecture Discovered

Prior to changes, the codebase was inspected:
- **`lib/billing/config.js`:** Contained basic regional prices but previously mapped International orders to Razorpay international USD orders.
- **`lib/payments.js`:** Encapsulated Razorpay SDK calls. The Razorpay API strictly threw `BAD_REQUEST_ERROR: Currency provided is not supported` whenever Razorpay Subscriptions were attempted with non-INR currencies. Razorpay USD transactions only worked as one-time Orders (`orders.create`), requiring foreign users to enter Razorpay's checkout modal.
- **`prisma/schema.prisma` (`CreatorSubscription`):** Defined `creator_subscriptions` with `plan`, `status`, `billingInterval`, `amount`, `currency`, `provider` (default `RAZORPAY`), `providerSubscriptionId`, `razorpayOrderId`, `razorpayPaymentId`, `currentPeriodStart`, `currentPeriodEnd`, and trial tracking fields.
- **`lib/services.js` (`creatorSubscriptionService`):** Controlled checkout session creation and payment verification. Previously, both India and International called Razorpay methods.
- **UI Components (`RegionSelectionModal.jsx`, `PricingModal.jsx`, `app/creator/subscribe/page.js`):** `RegionSelectionModal` collected user region, but `PricingModal` and `/creator/subscribe` unconditionally invoked `loadRazorpayScript()` and opened Razorpay modal.

---

## 3. Files & Migrations Changed

No breaking database schema alterations or table recreations were needed; existing schema columns (`provider`, `providerSubscriptionId`, `razorpayOrderId`, `razorpayPaymentId`) already supported multi-provider identifiers.

| File | Change Description |
|---|---|
| `lib/paypal.js` | **Created.** Standalone PayPal provider supporting OAuth 2.0 token acquisition, PayPal Order creation (`intent: 'CAPTURE'`), order capture, webhook signature verification, and safe test/mock fallbacks. |
| `lib/billing/config.js` | Updated catalog to set `provider: BILLING_PROVIDERS.PAYPAL`, `flowType: 'order'`, `isRecurring: false`, `renewalType: 'MANUAL_RENEWAL'` for International region. India configured with `provider: BILLING_PROVIDERS.RAZORPAY`, `flowType: 'subscription'`, `isRecurring: true`, `renewalType: 'AUTO_RENEWING'`. |
| `lib/repos.js` | Added `getByProviderSubscriptionId` to `creatorSubscriptionsRepo` to support querying by provider-specific subscription or order IDs. |
| `lib/services.js` | Integrated `paypalProvider` into `creatorSubscriptionService.createCheckoutSession` and `verifySubscriptionPayment`. For international customers, initiates PayPal directly and bypasses Razorpay. In `webhookService.handle`, added idempotent handling for PayPal webhook events (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `BILLING.SUBSCRIPTION.CANCELLED`, etc.). |
| `app/api/[[...path]]/route.js` | Added `/api/webhooks/paypal` raw-body signature verification route. Added `/api/creator/subscription/paypal/return` GET route to capture order and redirect upon return from PayPal approval flow. |
| `components/dashboard/RegionSelectionModal.jsx` | Updated UI to explicitly offer "India — Pay in INR using Razorpay" vs. "Outside India — Pay using PayPal in USD". Step 2 displays "PayPal" gateway and "Continue to PayPal" for international users. |
| `components/dashboard/PricingModal.jsx` | Bypassed Razorpay script loading and checkout modal for international users. Immediately redirects to `checkoutRes.approvalUrl` when provider is PayPal. |
| `app/creator/subscribe/page.js` | Bypassed Razorpay script loading and checkout modal for international users. Immediately redirects to PayPal approval URL. |
| `scripts/test_india_international_subscription_flow.js` | Comprehensive automated test script validating India (Razorpay) vs. Outside India (PayPal) routing, signature/capture verification, duplicate prevention, and webhooks. |

---

## 4. Country Selection & Routing Behavior

The subscription flow now enforces explicit, server-authoritative routing:

```
                          User Initiates Upgrade
                                    │
                                    ▼
                     [RegionSelectionModal.jsx]
                   "Where are you purchasing from?"
                      ┌─────────────┴─────────────┐
                      ▼                           ▼
                 India (🇮🇳)                Outside India (🌎)
           Pay in INR using Razorpay     Pay using PayPal in USD
                      │                           │
                      ▼                           ▼
        POST /creator/subscription/checkout (region: 'INDIA' or 'INTERNATIONAL')
                      │                           │
          [Server-side Billing Config]   [Server-side Billing Config]
             Currency: INR (₹499/₹999)      Currency: USD ($6/$12)
             Provider: 'razorpay'           Provider: 'paypal'
                      │                           │
                      ▼                           ▼
           Razorpay Subscription API        PayPal Orders API (v2)
           Returns Razorpay sub ID/order    Returns PayPal orderId + approvalUrl
                      │                           │
                      ▼                           ▼
           Opens Razorpay Modal           Redirects to PayPal Checkout
           (UPI AutoPay / Cards)          (PayPal Balance / International Cards)
                      │                           │
                      ▼                           ▼
           POST .../verify                PayPal Redirects to Return URL
           Razorpay HMAC verification     Server captures order with PayPal
                      └─────────────┬─────────────┘
                                    ▼
                 [Shared Unified Subscription System]
                 - Database status: 'ACTIVE'
                 - Provider: 'RAZORPAY' or 'PAYPAL'
                 - Entitlements unlocked immediately
```

### Server-Authoritative Price & Country Protection
- **No Client Tampering:** If a malicious client passes `amount: 1` or `currency: "USD"` with `region: "INDIA"`, the server-side utility `resolveBillingConfig` overrides all client values with trusted catalog entries.
- **Region Fallback:** If `region` is omitted (e.g. in legacy tests), it defaults safely to `BILLING_REGIONS.INDIA`.

---

## 5. Razorpay Integration Status (India)

- **Provider:** Razorpay
- **Currency:** Indian Rupee (`INR`)
- **Plans & Pricing:**
  - Creator Monthly: ₹499/mo (`amountSmallestUnit: 49900`)
  - Creator Annual: ₹4,790/year (20% discount on ₹5,988)
  - Pro Monthly: ₹999/mo (`amountSmallestUnit: 99900`)
  - Pro Annual: ₹9,590/year (20% discount on ₹11,988)
- **Payment Methods:** UPI AutoPay, Credit/Debit Cards, Netbanking, Wallets
- **Flow Type:** Real recurring subscription (`provider.createSubscription`)
- **Signature Verification:** Server-side HMAC-SHA256 (`razorpay_signature`)
- **Webhooks Supported:** `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `subscription.paused`, `subscription.resumed`
- **Current Operational Status:** Fully functional, active, tested.

---

## 6. PayPal Integration Status & Recurring Capabilities (International)

### Actual PayPal Capability Discovered
The standalone PayPal provider interacts with PayPal's REST APIs:
- **Order Creation:** `POST /v2/checkout/orders` with `intent: 'CAPTURE'`
- **Order Capture:** `POST /v2/checkout/orders/{orderId}/capture`
- **Return URL:** `/api/creator/subscription/paypal/return?token={orderId}&PayerID={payerId}`
- **Pricing:**
  - Creator Monthly: $6/mo (30-day fixed duration)
  - Creator Annual: $58/year (365-day fixed duration, 20% discount)
  - Pro Monthly: $12/mo (30-day fixed duration)
  - Pro Annual: $115/year (365-day fixed duration, 20% discount)

### Recurring Billing & Auto-Renewal Capability
- **Current Status:** `MANUAL_RENEWAL` (Fixed-duration period with manual renewal).
- **Auto-Debit Status:** `BLOCKED`.
- **Reason:** Real automated recurring billing via PayPal requires onboarding to PayPal Subscriptions API (`/v1/billing/subscriptions`), creating billing plans with PayPal, and obtaining account approval for recurring debit mandates. Until PayPal live credentials with Subscriptions entitlement are verified on the merchant account, automated debits cannot execute.
- **Truthful UX & Contract:** The application explicitly labels international purchases as `30-day access · Manual renewal` (or 365 days for annual), accurately notifying creators without falsely claiming automated renewals.

---

## 7. Webhook & Security Architecture

1. **Razorpay Webhooks (`/api/webhooks/razorpay`):**
   - Verified via `x-razorpay-signature` and `provider.verifyWebhook(rawBody, signature)`.
2. **PayPal Webhooks (`/api/webhooks/paypal`):**
   - Verified via `paypalProvider.verifyWebhook` using `paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`, and `PAYPAL_WEBHOOK_ID`.
   - Handled events:
     - `PAYMENT.CAPTURE.COMPLETED`: Updates creator subscription to `ACTIVE` with `provider: 'PAYPAL'` and sets active period end.
     - `CHECKOUT.ORDER.APPROVED`: Automatically triggers capture if uncaptured.
     - `BILLING.SUBSCRIPTION.CANCELLED` / `PAYMENT.CAPTURE.DENIED`: Marks subscription as `CANCELLED` or `FAILED`.
3. **Idempotency:**
   - Both webhook handlers claim events atomically via `webhookEventsRepo.claim(eventId, eventType)`. Duplicate event deliveries return `{ duplicate: true }` without repeating side effects or extending subscription access.

---

## 8. Environment Variables

The following environment variables govern payment routing:

```bash
# --- Razorpay (India INR Payments) ---
RAZORPAY_KEY_ID=rzp_test_TU5aYIMJinylzM
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_TU5aYIMJinylzM
RAZORPAY_CREATOR_PLAN_ID=plan_TgJ1dRnLJrEtcY
RAZORPAY_CREATOR_ANNUAL_PLAN_ID=plan_TgJ1fyDvXo9kDd
RAZORPAY_PRO_PLAN_ID=plan_TgJ1iJkNNbFm0K
RAZORPAY_PRO_ANNUAL_PLAN_ID=plan_TgJ1l450fm9f4h

# --- PayPal (International USD Payments) ---
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox            # 'sandbox' or 'live'
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
```

- When credentials are placeholders or in test mode, the system safely operates test mock fallbacks without crashing.
- In production, missing or invalid live credentials return explicit, graceful server errors.

---

## 9. Verification & Automated Test Results

### 1. Dedicated Payment Routing Test Suite
Executed: `node scripts/test_india_international_subscription_flow.js`
- **Result:** `EXIT 0` (All tests passed cleanly)
- **Covered Scenarios:**
  - `GROUP 1:` Centralized server-side billing resolution (normalization of IN, US, outside_india, default fallback, trusted pricing).
  - `GROUP 2:` India checkout session creation -> provider `razorpay`, currency `INR`, session creation, DB `PENDING` state, signature verification, DB `ACTIVE` state, entitlements unlocked.
  - `GROUP 3:` International checkout session creation -> provider `paypal` (bypassed Razorpay), currency `USD`, PayPal order creation, approval URL returned, DB `PENDING` state, PayPal capture verification, DB `ACTIVE` state, entitlements unlocked.
  - `GROUP 4:` Duplicate active subscription requests prevented with appropriate informational message.
  - `GROUP 5:` Webhook processing & idempotency for both Razorpay (`order.paid`) and PayPal (`PAYMENT.CAPTURE.COMPLETED`), verifying duplicate webhook rejection.
  - `GROUP 6:` Payment failure handling (`payment.failed`) marking subscriptions `FAILED`.

### 2. Regression & Related Test Suites
- `node scripts/test_annual_billing.js`: `EXIT 0` (Passed - verified 365-day period and 20% discount for annual plans).
- `node scripts/test_security_phase1_remediation.js`: `EXIT 0` (All 24/24 security tests passed - SEC-001–004 intact).
- `node scripts/test_trial_system.js`: `EXIT 0` (All 40/40 trial and gating tests passed).
- `npm run build`: `EXIT 0` (Compiled in 5.4s; all 75/75 routes generated cleanly).

---

## 10. Remaining Blockers & Production Deployment Steps

1. **PayPal Live Credentials Onboarding:**
   - Obtain production PayPal credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) from PayPal Developer Dashboard.
   - Configure PayPal Webhook URL to point to `https://creatorstore.store/api/webhooks/paypal` subscribing to `Payment capture completed`, `Checkout order approved`, and `Billing subscription cancelled`.
   - Update `PAYPAL_MODE=live` and `PAYPAL_WEBHOOK_ID=<live_webhook_id>` in production environment.
2. **PayPal Recurring Subscriptions Mandates:**
   - To transition international orders from fixed-duration manual renewal to genuine auto-debit renewals, complete PayPal Billing Agreement approval and configure PayPal Subscriptions product plans (`/v1/billing/plans`).
3. **Razorpay Live Webhooks:**
   - Ensure webhook endpoint `https://creatorstore.store/api/webhooks/razorpay` is active in the Razorpay Live dashboard with secret matching `RAZORPAY_WEBHOOK_SECRET`.
