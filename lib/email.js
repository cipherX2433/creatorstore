// ---- Centralized Email Service for CreatorStore ----
// Uses Resend HTTPS API via the official Resend Node.js SDK.
// Non-blocking, secure credential handling, failure-isolated, and structured logging.

import { Resend } from 'resend'
import * as templates from './emailTemplates.js'

// Re-export templates for backward compatibility
export * from './emailTemplates.js'

// Legacy template aliases for backwards compatibility with existing imports
export const purchaseConfirmationEmail = templates.purchaseConfirmationEmailTemplate
export const productDeliveryEmail = templates.digitalDeliveryEmailTemplate
export const passwordResetEmail = templates.passwordResetEmailTemplate
export const emailVerificationEmail = templates.verificationEmailTemplate
export const coachingBookingConfirmationEmail = templates.bookingConfirmationEmailTemplate
export const webinarRegistrationEmail = templates.webinarConfirmationEmailTemplate
export const webinarCancellationEmail = templates.webinarCancellationEmailTemplate
export const membershipActivatedEmail = templates.membershipActivatedEmailTemplate
export const membershipCancelledEmail = templates.membershipCancelledEmailTemplate
export const customServiceRequestEmail = templates.customServiceRequestEmailTemplate
export const customServiceDeliveredEmail = templates.customServiceDeliveredEmailTemplate

// Explicit Email Types Enum
export const EMAIL_TYPES = {
  VERIFICATION_OTP: 'VERIFICATION_OTP',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PURCHASE_CONFIRMATION: 'PURCHASE_CONFIRMATION',
  DIGITAL_DELIVERY: 'DIGITAL_DELIVERY',
  COURSE_ENROLLMENT: 'COURSE_ENROLLMENT',
  BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  BOOKING_CANCELLATION: 'BOOKING_CANCELLATION',
  BOOKING_RESCHEDULED: 'BOOKING_RESCHEDULED',
  WEBINAR_CONFIRMATION: 'WEBINAR_CONFIRMATION',
  WEBINAR_REMINDER: 'WEBINAR_REMINDER',
  WEBINAR_CANCELLATION: 'WEBINAR_CANCELLATION',
  MEMBERSHIP_ACTIVATED: 'MEMBERSHIP_ACTIVATED',
  MEMBERSHIP_RENEWAL: 'MEMBERSHIP_RENEWAL',
  MEMBERSHIP_CANCELLED: 'MEMBERSHIP_CANCELLED',
  COMMUNITY_ACCESS: 'COMMUNITY_ACCESS',
  NEW_ORDER_CREATOR: 'NEW_ORDER_CREATOR',
  NEW_LEAD_CREATOR: 'NEW_LEAD_CREATOR',
  PAYOUT_STATUS: 'PAYOUT_STATUS',
  SUBSCRIPTION_STATUS: 'SUBSCRIPTION_STATUS',
  MARKETING_BROADCAST: 'MARKETING_BROADCAST',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
  CUSTOM_SERVICE_REQUEST: 'CUSTOM_SERVICE_REQUEST',
  CUSTOM_SERVICE_DELIVERED: 'CUSTOM_SERVICE_DELIVERED',
  TRIAL_STARTED: 'TRIAL_STARTED',
  TRIAL_ENDING_SOON: 'TRIAL_ENDING_SOON',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  DIAGNOSTIC_TEST: 'DIAGNOSTIC_TEST',
}

/**
 * Safely masks an email address for structured logging without leaking PII.
 * Example: "creator@example.com" -> "c***r@example.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[empty]'
  const parts = email.trim().split('@')
  if (parts.length !== 2) return '[invalid_email]'
  const [name, domain] = parts
  if (name.length <= 2) return `${name[0]}*@${domain}`
  return `${name[0]}***${name[name.length - 1]}@${domain}`
}

class ResendEmailService {
  constructor() {
    this.apiKey = (process.env.RESEND_API_KEY || '').trim()

    // Enforce verified CreatorStore sender identity
    let rawFrom = (process.env.EMAIL_FROM || '').trim()
    if (!rawFrom || rawFrom.includes('resend.dev') || rawFrom.includes('gmail.com') || rawFrom.includes('creatorzero')) {
      rawFrom = '"CreatorStore" <noreply@creatorstore.store>'
    }
    this.from = rawFrom
    this.replyTo = (process.env.EMAIL_REPLY_TO || process.env.SUPPORT_EMAIL || '').trim() || 'support@creatorstore.store'

    this._resendClient = null
  }

  get resend() {
    if (!this._resendClient && this.apiKey) {
      this._resendClient = new Resend(this.apiKey)
    }
    return this._resendClient
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 5)
  }

  async verifyConnection() {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'resend_api_key_missing' }
    }
    try {
      if (!this.apiKey.startsWith('re_')) {
        return { ok: false, reason: 'invalid_resend_api_key_format' }
      }
      // Resend API key format verified
      console.info(`[EmailService] Resend configuration verified: sender "${this.from}"`)
      return {
        ok: true,
        provider: 'resend',
        transport: 'https_api',
        sender: this.from,
      }
    } catch (err) {
      console.error('[EmailService] Resend verification check error:', err?.message || 'Unknown error')
      return { ok: false, reason: err?.message || 'verification_failed' }
    }
  }

  /**
   * Safe, non-blocking email sender using Resend Node.js HTTPS API
   */
  async sendMail({
    to,
    subject,
    html,
    text,
    from = this.from,
    replyTo = this.replyTo,
    emailType = EMAIL_TYPES.DIAGNOSTIC_TEST,
    idempotencyKey,
    headers,
  }) {
    const recipient = String(to || '').toLowerCase().trim()
    const maskedRecipient = maskEmail(recipient)
    const startTime = Date.now()

    if (!recipient || !recipient.includes('@')) {
      console.warn(`[EmailService] Email delivery rejected | Type: ${emailType} | Invalid recipient: ${maskedRecipient}`)
      return { delivered: false, reason: 'invalid_recipient' }
    }

    if (!this.isConfigured()) {
      console.info(`[EmailService] Resend not configured (RESEND_API_KEY missing). Email suppressed | Type: ${emailType} | To: ${maskedRecipient} | Subject: "${subject}"`)
      return { delivered: false, reason: 'not_configured' }
    }

    try {
      const sendPayload = {
        from: from || this.from,
        to: recipient,
        subject: subject || 'Notification from CreatorStore',
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo || this.replyTo || 'support@creatorstore.store',
      }

      const requestHeaders = headers || {}
      if (idempotencyKey) {
        requestHeaders['Idempotency-Key'] = idempotencyKey
      }
      if (Object.keys(requestHeaders).length > 0) {
        sendPayload.headers = requestHeaders
      }

      console.info(`[EmailService] Sending email | Type: ${emailType} | To: ${maskedRecipient} | Subject: "${subject}"`)

      const { data, error } = await this.resend.emails.send(sendPayload)
      const duration = Date.now() - startTime

      if (error) {
        const sanitizedError = error.name || error.message || 'resend_api_error'
        console.error(`[EmailService] Email delivery failed | Type: ${emailType} | To: ${maskedRecipient} | Reason: ${sanitizedError} | ${duration}ms`)
        return {
          delivered: false,
          reason: error.name || 'send_failed',
          error: error.message || 'Failed to send email via Resend',
        }
      }

      const messageId = data?.id || 'resend_msg_ack'
      console.info(`[EmailService] Email sent successfully | Type: ${emailType} | To: ${maskedRecipient} | MessageId: ${messageId} | ${duration}ms`)
      return {
        delivered: true,
        providerMessageId: messageId,
        messageId: messageId,
        data,
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const sanitizedError = err?.name || err?.code || err?.message || 'unknown_error'
      console.error(`[EmailService] Email delivery failed | Type: ${emailType} | To: ${maskedRecipient} | Reason: ${sanitizedError} | ${duration}ms`)
      return {
        delivered: false,
        reason: err?.code || err?.name || 'send_failed',
        error: err?.message || 'Network exception during Resend email delivery',
      }
    }
  }

  // Diagnostic plain text test email
  async sendDiagnosticPlainTextEmail({ to }) {
    return this.sendMail({
      to,
      subject: 'CreatorStore Email System Test',
      text: 'This is a test email from CreatorStore via Resend HTTPS API.',
      emailType: EMAIL_TYPES.DIAGNOSTIC_TEST,
    })
  }

  // Backward compatibility alias for send() and sendEmail()
  async send(params) {
    return this.sendMail(params)
  }

  async sendEmail(params) {
    return this.sendMail(params)
  }

  // ---------------- 1. AUTHENTICATION ----------------

  async sendVerificationEmail({ to, name, otp }) {
    const tmpl = templates.verificationEmailTemplate({ name, otp })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.VERIFICATION_OTP,
      idempotencyKey: `otp_${to}_${Date.now()}`,
    })
  }

  async sendPurchaseAccessOtpEmail({ to, email, otp, expiryMinutes = 10 }) {
    const targetEmail = (to || email || '').trim().toLowerCase()
    const tmpl = templates.purchaseAccessOtpEmailTemplate({ otp, expiryMinutes })
    if (!this.isConfigured()) {
      console.info(`\n========================================\n[DEV EMAIL - PURCHASE ACCESS OTP]\nTo: ${targetEmail}\nOTP Code: ${otp}\nExpires: ${expiryMinutes} minutes\nSubject: ${tmpl.subject}\n========================================\n`)
      return { delivered: true, simulated: true, messageId: `dev_sim_${Date.now()}` }
    }
    return this.sendMail({
      to: targetEmail,
      ...tmpl,
      emailType: EMAIL_TYPES.VERIFICATION_OTP,
      idempotencyKey: `access_otp_${targetEmail}_${Date.now()}`,
    })
  }

  async sendOtpEmail(params) {
    return this.sendPurchaseAccessOtpEmail(params)
  }

  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const tmpl = templates.passwordResetEmailTemplate({ name, resetUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.PASSWORD_RESET,
      idempotencyKey: `pwd_reset_${to}_${Date.now()}`,
    })
  }

  async sendPasswordChangedEmail({ to, name }) {
    const tmpl = templates.passwordChangedEmailTemplate({ name })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.PASSWORD_CHANGED,
    })
  }

  // ---------------- 2. PURCHASES & DIGITAL DELIVERY ----------------

  async sendPurchaseConfirmation({ to, customerName, creatorName, productTitle, amount, currency, orderId, accessUrl }) {
    const tmpl = templates.purchaseConfirmationEmailTemplate({ customerName, creatorName, productTitle, amount, currency, orderId, accessUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.PURCHASE_CONFIRMATION,
      idempotencyKey: orderId ? `order_receipt_${orderId}` : undefined,
    })
  }

  async sendDigitalDeliveryEmail({ to, customerName, creatorName, productTitle, downloadUrl }) {
    const tmpl = templates.digitalDeliveryEmailTemplate({ customerName, creatorName, productTitle, downloadUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.DIGITAL_DELIVERY,
    })
  }

  async sendProductAccessEmail({ to, customerName, productTitle, accessUrl, isExisting = false, isPaid = false }) {
    try {
      const tmpl = templates.productAccessEmailTemplate({ customerName, productTitle, accessUrl, isExisting, isPaid })
      return await this.sendMail({
        to,
        ...tmpl,
        emailType: isPaid ? EMAIL_TYPES.PURCHASE_CONFIRMATION : EMAIL_TYPES.DIGITAL_DELIVERY,
        idempotencyKey: `access_${to}_${isPaid ? 'paid' : (isExisting ? 'exist' : 'free')}_${Date.now()}`,
      })
    } catch (err) {
      console.error('[EmailService] sendProductAccessEmail error:', err.message)
      return { delivered: false, error: err.message }
    }
  }

  async sendPurchaseAccessEmail(params) {
    return this.sendProductAccessEmail(params)
  }

  async sendPurchaseSuccessEmail({ to, customerName, productTitle, accessUrl }) {
    return this.sendProductAccessEmail({ to, customerName, productTitle, accessUrl, isPaid: true, isExisting: false })
  }

  async sendCourseEnrollmentEmail({ to, customerName, creatorName, courseTitle, accessUrl }) {
    const tmpl = templates.courseEnrollmentEmailTemplate({ customerName, creatorName, courseTitle, accessUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.COURSE_ENROLLMENT,
    })
  }

  // ---------------- 3. BOOKINGS & COACHING ----------------

  async sendBookingConfirmationEmail({ to, customerName, creatorName, productTitle, sessionTime, meetingUrl }) {
    const tmpl = templates.bookingConfirmationEmailTemplate({ customerName, creatorName, productTitle, sessionTime, meetingUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.BOOKING_CONFIRMATION,
    })
  }

  async sendBookingReminderEmail({ to, customerName, creatorName, productTitle, sessionTime, meetingUrl }) {
    const tmpl = templates.bookingReminderEmailTemplate({ customerName, creatorName, productTitle, sessionTime, meetingUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.BOOKING_REMINDER,
    })
  }

  async sendBookingCancellationEmail({ to, customerName, creatorName, productTitle, sessionTime, reason }) {
    const tmpl = templates.bookingCancellationEmailTemplate({ customerName, creatorName, productTitle, sessionTime, reason })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.BOOKING_CANCELLATION,
    })
  }

  async sendBookingRescheduledEmail({ to, customerName, creatorName, productTitle, newSessionTime, meetingUrl }) {
    const tmpl = templates.bookingRescheduledEmailTemplate({ customerName, creatorName, productTitle, newSessionTime, meetingUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.BOOKING_RESCHEDULED,
    })
  }

  // ---------------- 4. WEBINARS ----------------

  async sendWebinarConfirmationEmail({ to, customerName, creatorName, productTitle, webinarTime, meetingUrl }) {
    const tmpl = templates.webinarConfirmationEmailTemplate({ customerName, creatorName, productTitle, webinarTime, meetingUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.WEBINAR_CONFIRMATION,
    })
  }

  async sendWebinarReminderEmail({ to, customerName, creatorName, productTitle, webinarTime, meetingUrl }) {
    const tmpl = templates.webinarReminderEmailTemplate({ customerName, creatorName, productTitle, webinarTime, meetingUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.WEBINAR_REMINDER,
    })
  }

  async sendWebinarCancellationEmail({ to, customerName, creatorName, productTitle, webinarTime, reason }) {
    const tmpl = templates.webinarCancellationEmailTemplate({ customerName, creatorName, productTitle, webinarTime, reason })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.WEBINAR_CANCELLATION,
    })
  }

  // ---------------- 5. MEMBERSHIPS & COMMUNITY ----------------

  async sendMembershipActivatedEmail({ to, customerName, creatorName, productTitle, priceDisplay, billingInterval }) {
    const tmpl = templates.membershipActivatedEmailTemplate({ customerName, creatorName, productTitle, priceDisplay, billingInterval })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.MEMBERSHIP_ACTIVATED,
    })
  }

  async sendMembershipRenewalEmail({ to, customerName, creatorName, productTitle, priceDisplay, nextBillingDate }) {
    const tmpl = templates.membershipRenewalEmailTemplate({ customerName, creatorName, productTitle, priceDisplay, nextBillingDate })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.MEMBERSHIP_RENEWAL,
    })
  }

  async sendMembershipCancelledEmail({ to, customerName, creatorName, productTitle, currentPeriodEnd }) {
    const tmpl = templates.membershipCancelledEmailTemplate({ customerName, creatorName, productTitle, currentPeriodEnd })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.MEMBERSHIP_CANCELLED,
    })
  }

  async sendCommunityAccessEmail({ to, customerName, creatorName, communityTitle, accessUrl }) {
    const tmpl = templates.communityAccessEmailTemplate({ customerName, creatorName, communityTitle, accessUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.COMMUNITY_ACCESS,
    })
  }

  // ---------------- 6. CREATOR NOTIFICATIONS ----------------

  async sendNewOrderCreatorEmail({ to, creatorName, customerName, customerEmail, productTitle, amount, currency, orderId }) {
    const tmpl = templates.newOrderCreatorEmailTemplate({ creatorName, customerName, customerEmail, productTitle, amount, currency, orderId })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.NEW_ORDER_CREATOR,
    })
  }

  async sendNewLeadCreatorEmail({ to, creatorName, leadName, leadEmail, leadPhone, formName, submittedAt, dashboardUrl }) {
    const tmpl = templates.newLeadCreatorEmailTemplate({ creatorName, leadName, leadEmail, leadPhone, formName, submittedAt, dashboardUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.NEW_LEAD_CREATOR,
    })
  }

  async sendPayoutStatusEmail({ to, creatorName, status, amount, currency, payoutId, note }) {
    const tmpl = templates.payoutStatusEmailTemplate({ creatorName, status, amount, currency, payoutId, note })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.PAYOUT_STATUS,
    })
  }

  async sendSubscriptionStatusEmail({ to, creatorName, planName, status, priceDisplay, currentPeriodEnd }) {
    const tmpl = templates.subscriptionStatusEmailTemplate({ creatorName, planName, status, priceDisplay, currentPeriodEnd })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.SUBSCRIPTION_STATUS,
    })
  }

  async sendMarketingBroadcastEmail({ to, creatorName, subject, content }) {
    const tmpl = templates.marketingBroadcastEmailTemplate({ creatorName, subject, content })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.MARKETING_BROADCAST,
    })
  }

  // ---------------- 7. PAYMENT FAILURES ----------------

  async sendPaymentFailureEmail({ to, customerName, productTitle, reason, retryUrl }) {
    const tmpl = templates.paymentFailureEmailTemplate({ customerName, productTitle, reason, retryUrl })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.PAYMENT_FAILURE,
    })
  }

  // ---------------- 8. CUSTOM SERVICES ----------------

  async sendCustomServiceRequestEmail({ to, productTitle, creatorName, dueAt }) {
    const tmpl = templates.customServiceRequestEmailTemplate({ productTitle, creatorName, dueAt })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.CUSTOM_SERVICE_REQUEST,
    })
  }

  async sendCustomServiceDeliveredEmail({ to, productTitle, creatorName }) {
    const tmpl = templates.customServiceDeliveredEmailTemplate({ productTitle, creatorName })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.CUSTOM_SERVICE_DELIVERED,
    })
  }

  async sendTrialStartedEmail({ to, creatorName, trialEndsAt }) {
    const tmpl = templates.trialStartedEmailTemplate({ creatorName, trialEndsAt })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.TRIAL_STARTED,
    })
  }

  async sendTrialEndingSoonEmail({ to, creatorName, trialEndsAt, daysRemaining }) {
    const tmpl = templates.trialEndingSoonEmailTemplate({ creatorName, trialEndsAt, daysRemaining })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.TRIAL_ENDING_SOON,
    })
  }

  async sendTrialExpiredEmail({ to, creatorName }) {
    const tmpl = templates.trialExpiredEmailTemplate({ creatorName })
    return this.sendMail({
      to,
      ...tmpl,
      emailType: EMAIL_TYPES.TRIAL_EXPIRED,
    })
  }
}

// Singleton Email Service Instance
let _emailServiceInstance = null

export function getEmailService() {
  if (!_emailServiceInstance) {
    _emailServiceInstance = new ResendEmailService()
  }
  return _emailServiceInstance
}

export const emailService = {
  get from() { return getEmailService().from },
  get replyTo() { return getEmailService().replyTo },
  isConfigured: () => getEmailService().isConfigured(),
  verifyConnection: () => getEmailService().verifyConnection(),
  sendMail: (params) => getEmailService().sendMail(params),
  send: (params) => getEmailService().sendMail(params),
  sendEmail: (params) => getEmailService().sendMail(params),
  sendDiagnosticPlainTextEmail: (p) => getEmailService().sendDiagnosticPlainTextEmail(p),
  sendVerificationEmail: (p) => getEmailService().sendVerificationEmail(p),
  sendPurchaseAccessOtpEmail: (p) => getEmailService().sendPurchaseAccessOtpEmail(p),
  sendOtpEmail: (p) => getEmailService().sendPurchaseAccessOtpEmail(p),
  sendPasswordResetEmail: (p) => getEmailService().sendPasswordResetEmail(p),
  sendPasswordChangedEmail: (p) => getEmailService().sendPasswordChangedEmail(p),
  sendPurchaseConfirmation: (p) => getEmailService().sendPurchaseConfirmation(p),
  sendPurchaseSuccessEmail: (p) => getEmailService().sendPurchaseSuccessEmail(p),
  sendProductAccessEmail: (p) => getEmailService().sendProductAccessEmail(p),
  sendPurchaseAccessEmail: (p) => getEmailService().sendProductAccessEmail(p),
  sendDigitalDeliveryEmail: (p) => getEmailService().sendDigitalDeliveryEmail(p),
  sendCourseEnrollmentEmail: (p) => getEmailService().sendCourseEnrollmentEmail(p),
  sendBookingConfirmationEmail: (p) => getEmailService().sendBookingConfirmationEmail(p),
  sendBookingReminderEmail: (p) => getEmailService().sendBookingReminderEmail(p),
  sendBookingCancellationEmail: (p) => getEmailService().sendBookingCancellationEmail(p),
  sendBookingRescheduledEmail: (p) => getEmailService().sendBookingRescheduledEmail(p),
  sendWebinarConfirmationEmail: (p) => getEmailService().sendWebinarConfirmationEmail(p),
  sendWebinarReminderEmail: (p) => getEmailService().sendWebinarReminderEmail(p),
  sendWebinarCancellationEmail: (p) => getEmailService().sendWebinarCancellationEmail(p),
  sendMembershipActivatedEmail: (p) => getEmailService().sendMembershipActivatedEmail(p),
  sendMembershipRenewalEmail: (p) => getEmailService().sendMembershipRenewalEmail(p),
  sendMembershipCancelledEmail: (p) => getEmailService().sendMembershipCancelledEmail(p),
  sendCommunityAccessEmail: (p) => getEmailService().sendCommunityAccessEmail(p),
  sendNewOrderCreatorEmail: (p) => getEmailService().sendNewOrderCreatorEmail(p),
  sendNewLeadCreatorEmail: (p) => getEmailService().sendNewLeadCreatorEmail(p),
  sendPayoutStatusEmail: (p) => getEmailService().sendPayoutStatusEmail(p),
  sendSubscriptionStatusEmail: (p) => getEmailService().sendSubscriptionStatusEmail(p),
  sendMarketingBroadcastEmail: (p) => getEmailService().sendMarketingBroadcastEmail(p),
  sendPaymentFailureEmail: (p) => getEmailService().sendPaymentFailureEmail(p),
  sendCustomServiceRequestEmail: (p) => getEmailService().sendCustomServiceRequestEmail(p),
  sendCustomServiceDeliveredEmail: (p) => getEmailService().sendCustomServiceDeliveredEmail(p),
  sendTrialStartedEmail: (p) => getEmailService().sendTrialStartedEmail(p),
  sendTrialEndingSoonEmail: (p) => getEmailService().sendTrialEndingSoonEmail(p),
  sendTrialExpiredEmail: (p) => getEmailService().sendTrialExpiredEmail(p),
}

// Backward compatibility class exports
export {
  ResendEmailService,
  ResendEmailService as EmailService,
  ResendEmailService as NamecheapEmailService,
  ResendEmailService as SmtpEmailService,
  ResendEmailService as GmailSmtpEmailService,
}
