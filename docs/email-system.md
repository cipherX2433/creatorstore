# Centralized Transactional Email System Documentation

## 1. Overview
CreatorStore utilizes a centralized transactional email delivery architecture powered by **Resend HTTPS API** via the official **Resend Node.js SDK** (`resend`).

All email deliveries across Authentication (Verification OTP, Password Reset), Orders, Digital Product Deliveries, Courses, Coaching Bookings, Webinars, Memberships, Communities, Creator Notifications, Payout Updates, Subscriptions, Custom Services, and Marketing Broadcasts flow through a single singleton `EmailService`.

Outbound delivery operates purely via HTTPS API requests on port 443, eliminating all reliance on SMTP ports (such as 25, 465, or 587) and avoiding SMTP timeout stalls on cloud platforms such as Railway.

---

## 2. Architecture & Directory Structure
```
lib/
├── email.js             # Centralized ResendEmailService singleton, HTTPS API client, failure isolation & logging
└── emailTemplates.js    # Responsive HTML + text email templates (CreatorStore brand tokens)

scripts/
├── test_resend_live.js               # Direct verification of Resend HTTPS API delivery
└── test_email_system_comprehensive.js # Comprehensive test suite for all templates & security
```

---

## 3. Required Environment Variables (Server-Side Only)

| Variable | Description | Example / Production Value |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Resend API key (`re_...`) | `re_1234567890` (configured in Railway variables) |
| `EMAIL_FROM` | Sender display name & address | `"CreatorStore <noreply@creatorstore.store>"` |
| `EMAIL_REPLY_TO` | Optional reply-to address | `support@creatorstore.store` |
| `APP_URL` | Canonical production/app base URL | `https://creatorstore.store` |

> **Security Note:** `RESEND_API_KEY` is strictly server-side and never exposed to browser bundles or `NEXT_PUBLIC_*` prefixes. API keys, passwords, OTPs, and reset tokens are never logged.

---

## 4. Supported Transactional Email Events

### A. Authentication
- `sendVerificationEmail({ to, name, otp })`: Triggered on creator/customer registration and resend verification. Contains 6-digit OTP (expires in 10 minutes).
- `sendPasswordResetEmail({ to, name, resetUrl })`: Triggered on forgot password request. Delivers secure 1-hour reset token link.
- `sendPasswordChangedEmail({ to, name })`: Triggered after successful password reset.

### B. Purchases & Product Deliveries
- `sendPurchaseConfirmation({ to, customerName, creatorName, productTitle, amount, currency, orderId, accessUrl })`: Triggered upon backend payment verification (`markPaidOnce`).
- `sendDigitalDeliveryEmail({ to, customerName, creatorName, productTitle, downloadUrl })`: Delivers signed, secure, expiring token download link.
- `sendCourseEnrollmentEmail({ to, customerName, creatorName, courseTitle, accessUrl })`: Delivers course access URL.
- `sendCommunityAccessEmail({ to, customerName, creatorName, communityTitle, accessUrl })`: Delivers community space access link.

### C. Coaching & Bookings
- `sendBookingConfirmationEmail({ to, customerName, creatorName, productTitle, sessionTime, meetingUrl })`
- `sendBookingReminderEmail({ to, customerName, creatorName, productTitle, sessionTime, meetingUrl })`
- `sendBookingRescheduledEmail({ to, customerName, creatorName, productTitle, newSessionTime, meetingUrl })`
- `sendBookingCancellationEmail({ to, customerName, creatorName, productTitle, sessionTime, reason })`

### D. Webinars
- `sendWebinarConfirmationEmail({ to, customerName, creatorName, productTitle, webinarTime, meetingUrl })`
- `sendWebinarReminderEmail({ to, customerName, creatorName, productTitle, webinarTime, meetingUrl })`
- `sendWebinarCancellationEmail({ to, customerName, creatorName, productTitle, webinarTime, reason })`

### E. Memberships
- `sendMembershipActivatedEmail({ to, customerName, creatorName, productTitle, priceDisplay, billingInterval })`
- `sendMembershipRenewalEmail({ to, customerName, creatorName, productTitle, priceDisplay, nextBillingDate })`
- `sendMembershipCancelledEmail({ to, customerName, creatorName, productTitle, currentPeriodEnd })`

### F. Creator Notifications
- `sendNewOrderCreatorEmail({ to, creatorName, customerName, customerEmail, productTitle, amount, currency, orderId })`
- `sendNewLeadCreatorEmail({ to, creatorName, leadName, leadEmail, leadPhone, formName, submittedAt, dashboardUrl })`
- `sendPayoutStatusEmail({ to, creatorName, status, amount, currency, payoutId, note })`
- `sendSubscriptionStatusEmail({ to, creatorName, planName, status, priceDisplay, currentPeriodEnd })`

### G. Payment Failure
- `sendPaymentFailureEmail({ to, customerName, productTitle, reason, retryUrl })`: Triggered when real payment gateway failure occurs.

### H. Custom Services
- `sendCustomServiceRequestEmail({ to, productTitle, creatorName, dueAt })`
- `sendCustomServiceDeliveredEmail({ to, productTitle, creatorName })`

### I. Marketing Broadcasts
- `sendMarketingBroadcastEmail({ to, creatorName, subject, content })`

---

## 5. Failure Isolation & Idempotency
1. **Failure Isolation**: Email delivery is treated strictly as an asynchronous notification layer. Any HTTP network error, quota issue, or provider exception is caught and logged safely without rolling back database transactions or failing user checkout / signup flows.
2. **Event Idempotency**: Order fulfillment utilizes `ordersRepo.markPaidOnce(orderId, ...)` to guarantee that repeated webhook retries or browser reloads never trigger duplicate order fulfillment or duplicate purchase emails. Resend idempotency headers are supported per event.
3. **Marketing Broadcast Separation**: Creator marketing broadcasts (`emailMarketingService`) remain separate from system transactional emails, respecting recipient consent.

---

## 6. Development & Testing
Run tests locally via:
```bash
# Run comprehensive test suite for all email templates and security
node scripts/test_email_system_comprehensive.js

# Test live Resend API delivery (requires RESEND_API_KEY)
node scripts/test_resend_live.js
```
