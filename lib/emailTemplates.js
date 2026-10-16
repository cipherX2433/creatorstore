// ---- Centralized Email Templates for CreatorStore ----
// Pure functions returning { subject, html, text }
// Responsive, clean typography, CreatorStore design tokens, no gradients, no glassmorphism, no Razorpay branding, no custom-domain messaging.

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]))
}

function formatMoney(amount, currency = 'INR') {
  try {
    const num = Number(amount)
    if (isNaN(num)) return `${amount} ${currency}`
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: (currency || 'INR').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${amount} ${currency}`
  }
}

import { getAppUrl, SUPPORT_EMAIL as DEFAULT_SUPPORT_EMAIL } from '../config/site.js'

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL

function baseTemplate({ previewText = '', title, subtitle, contentHtml, ctaText, ctaUrl, footerNote }) {
  const brandName = 'CreatorStore'
  const brandColor = '#4D7CFF'
  const appUrl = getAppUrl()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #0F172A;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${escapeHtml(previewText)}</div>` : ''}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0F172A; border-bottom: 2px solid ${brandColor};">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                      Creator<span style="color: ${brandColor};">Store</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #94A3B8; font-weight: 500;">Transactional Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${title ? `<h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">${escapeHtml(title)}</h1>` : ''}
              ${subtitle ? `<p style="margin: 0 0 20px 0; font-size: 15px; color: #64748B; line-height: 1.5;">${escapeHtml(subtitle)}</p>` : ''}
              
              <div style="font-size: 15px; color: #334155; line-height: 1.6;">
                ${contentHtml}
              </div>

              ${ctaText && ctaUrl ? `
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: ${brandColor}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; mso-padding-alt: 0;">
                      <!--[if mso]><i style="letter-spacing: 28px; mso-font-width: -100%; mso-text-raise: 30pt">&nbsp;</i><![endif]-->
                      <span style="mso-text-raise: 15pt;">${escapeHtml(ctaText)}</span>
                      <!--[if mso]><i style="letter-spacing: 28px; mso-font-width: -100%">&nbsp;</i><![endif]-->
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer Note (if any) -->
          ${footerNote ? `
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="padding: 12px 16px; background-color: #F1F5F9; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.4;">
                ${footerNote}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748B;">CreatorStore Platform</p>
                    <p style="margin: 0 0 4px 0;">The monetization operating system for modern creators.</p>
                    <p style="margin: 0; color: #94A3B8;">Need help? Contact support at <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: ${brandColor}; text-decoration: none; font-weight: 500;">${escapeHtml(SUPPORT_EMAIL)}</a></p>
                  </td>
                  <td align="right" valign="top">
                    <a href="${escapeHtml(appUrl)}" style="color: ${brandColor}; text-decoration: none; font-weight: 500;">Visit Store</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------- 1. AUTHENTICATION TEMPLATES ----------------

export function verificationEmailTemplate({ name, otp }) {
  const subject = 'Your CreatorStore verification code'
  const title = 'Verify your email'
  const subtitle = name ? `Welcome to CreatorStore, ${name}!` : 'Welcome to CreatorStore!'
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Use the verification code below to complete your CreatorStore signup:
    </p>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #F1F5F9; border: 2px solid #CBD5E1; border-radius: 8px; padding: 16px 36px; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #0F172A; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; text-align: center;">
            ${escapeHtml(otp)}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 16px 0 6px 0; font-size: 14px; color: #64748B;">
      This code is valid for 10 minutes. Do not share this code with anyone.
    </p>
  `
  const text = `Your CreatorStore verification code is: ${otp}. It will expire in 10 minutes.`
  const html = baseTemplate({
    previewText: `Your verification code is ${otp}`,
    title,
    subtitle,
    contentHtml,
    footerNote: 'If you did not sign up for a CreatorStore account, you can safely disregard this message.',
  })
  return { subject, html, text }
}

export function passwordResetEmailTemplate({ name, resetUrl }) {
  const subject = 'Reset your CreatorStore password'
  const title = 'Reset your password'
  const subtitle = name ? `Hello ${name},` : 'Hello,'
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      We received a request to reset the password for your CreatorStore account. Click the button below to set a new password:
    </p>
  `
  const text = `Reset your CreatorStore password using this link: ${resetUrl}\nThis link expires in 1 hour.`
  const html = baseTemplate({
    previewText: 'Reset your CreatorStore account password',
    title,
    subtitle,
    contentHtml,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl,
    footerNote: 'If you did not request a password reset, no action is needed. Your account remains secure.',
  })
  return { subject, html, text }
}

export function passwordChangedEmailTemplate({ name }) {
  const subject = 'Your password has been changed - CreatorStore'
  const title = 'Password successfully updated'
  const subtitle = name ? `Hello ${name},` : 'Hello,'
  const contentHtml = `
    <p>The password for your CreatorStore account was just changed.</p>
    <p>If you made this change, you can safely disregard this email.</p>
  `
  const text = `Your CreatorStore password has been successfully updated. If you did not perform this change, please contact ${SUPPORT_EMAIL} immediately.`
  const html = baseTemplate({
    previewText: 'Your CreatorStore account password was recently changed',
    title,
    subtitle,
    contentHtml,
    footerNote: `Security Notice: If you did not make this change, please contact ${SUPPORT_EMAIL} immediately.`,
  })
  return { subject, html, text }
}

// ---------------- 2. PURCHASE & DIGITAL DELIVERY TEMPLATES ----------------

export function purchaseConfirmationEmailTemplate({ customerName, creatorName, productTitle, amount, currency, orderId, accessUrl, purchaseDate }) {
  if (!accessUrl || typeof accessUrl !== 'string' || !accessUrl.trim()) {
    console.error(`[Email Template Error] Missing required secure accessUrl for purchase confirmation email (Order: ${orderId || 'unknown'})`)
    throw new Error(`Missing required secure accessUrl for purchase confirmation email (Order: ${orderId || 'unknown'})`)
  }
  const formattedPrice = formatMoney(amount, currency)
  const formattedDate = purchaseDate ? new Date(purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const subject = `Order Confirmed! 🎉 - ${productTitle}`
  const title = 'Purchase Confirmed! 🎉'
  const subtitle = 'Your access is ready.'
  const contentHtml = `
    <div style="margin: 0 0 20px 0;">
      <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #0F172A;">${escapeHtml(productTitle)}</h2>
      <p style="margin: 0; font-size: 14px; color: #64748B;">Your digital product access has been prepared.</p>
    </div>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 14px;">
        <tr>
          <td style="color: #64748B;">Product:</td>
          <td align="right" style="font-weight: 600; color: #0F172A;">${escapeHtml(productTitle)}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Creator:</td>
          <td align="right" style="font-weight: 500; color: #0F172A;">${escapeHtml(creatorName || 'Creator')}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Order ID:</td>
          <td align="right" style="font-family: monospace; color: #0F172A;">${escapeHtml(orderId || 'N/A')}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Purchase Date:</td>
          <td align="right" style="color: #0F172A;">${escapeHtml(formattedDate)}</td>
        </tr>
        <tr>
          <td style="color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 8px;">Amount:</td>
          <td align="right" style="border-top: 1px solid #E2E8F0; padding-top: 8px; font-weight: 700; font-size: 16px; color: #0F172A;">${formattedPrice}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0; font-size: 14px; color: #475569;">Click the button below to access your product directly from the creator storefront.</p>
  `
  const finalAccessUrl = accessUrl.trim()
  const text = `Purchase Confirmed! 🎉\n\n${productTitle}\nYour access is ready.\n\nProduct: ${productTitle}\nCreator: ${creatorName || 'Creator'}\nOrder ID: ${orderId}\nAmount: ${formattedPrice}\nPurchase Date: ${formattedDate}\n\nAccess Product: ${finalAccessUrl}`
  const html = baseTemplate({
    previewText: `Access your purchase: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'ACCESS PRODUCT',
    ctaUrl: finalAccessUrl,
    footerNote: `Sent on behalf of ${escapeHtml(creatorName || 'the creator')}.`,
  })
  return { subject, html, text }
}

export function productAccessEmailTemplate({ customerName, productTitle, accessUrl, isExisting = false, isPaid = false }) {
  const cleanName = customerName || 'there'
  const title = isPaid
    ? 'Purchase Successful! 🎉'
    : (isExisting ? 'Product Access' : 'Access Granted 🎉')

  const subject = isPaid
    ? `Purchase successful — ${productTitle}`
    : `Your access to ${productTitle}`

  let contentHtml = ''
  let text = ''

  if (isExisting) {
    contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Hi ${escapeHtml(cleanName)},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        We found your existing purchase for:
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">${escapeHtml(productTitle)}</p>
      </div>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        You can download your product securely using the button below.
      </p>
    `
    text = `Hi ${cleanName},\n\nWe found your existing purchase for:\n${productTitle}\n\nYou can download your product securely using the link below:\n${accessUrl}\n\nYou can also access your purchase anytime from your CreatorStore purchases.`
  } else if (isPaid) {
    contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Hi ${escapeHtml(cleanName)},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Your purchase was successful.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        You now have access to:
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">${escapeHtml(productTitle)}</p>
      </div>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Thank you for your purchase!
      </p>
    `
    text = `Hi ${cleanName},\n\nYour purchase was successful.\n\nYou now have access to:\n${productTitle}\n\nThank you for your purchase!\n\nDownload your product:\n${accessUrl}\n\nYou can also access your purchase anytime from your CreatorStore purchases.`
  } else {
    contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Hi ${escapeHtml(cleanName)},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        You now have access to:
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">${escapeHtml(productTitle)}</p>
      </div>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        You can download your product securely using the button below.
      </p>
    `
    text = `Hi ${cleanName},\n\nYou now have access to:\n${productTitle}\n\nYou can download your product securely using the link below:\n${accessUrl}\n\nYou can request access again anytime from the product page.`
  }

  const html = baseTemplate({
    previewText: `${subject} - CreatorStore`,
    title,
    subtitle: isPaid ? 'Thank you for your purchase!' : 'Your product is ready to download.',
    contentHtml,
    ctaText: 'Download Product',
    ctaUrl: accessUrl,
    footerNote: 'This is a secure access link. You can also view your purchases anytime from your CreatorStore account.',
  })

  return { subject, html, text }
}

export function digitalDeliveryEmailTemplate({ customerName, creatorName, productTitle, downloadUrl }) {
  const subject = `Your download is ready: ${productTitle}`
  const title = 'Your digital file is ready'
  const subtitle = customerName ? `Hi ${customerName}, your files are ready to download.` : 'Your files are ready to download.'
  const contentHtml = `
    <p>Thank you for purchasing <strong>${escapeHtml(productTitle)}</strong> from <strong>${escapeHtml(creatorName || 'Creator')}</strong>.</p>
    <p>Click the button below to download your files securely.</p>
  `
  const text = `Your download for ${productTitle} is ready.\n\nDownload link:\n${downloadUrl}\n\nThis is a secure download link.`
  const html = baseTemplate({
    previewText: `Download ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Download Files Now',
    ctaUrl: downloadUrl,
    footerNote: 'This is a secure, authenticated download link. Do not forward this email to others.',
  })
  return { subject, html, text }
}

export function courseEnrollmentEmailTemplate({ customerName, creatorName, courseTitle, accessUrl }) {
  const subject = `Course Enrollment: Welcome to ${courseTitle}!`
  const title = 'You are enrolled in the course!'
  const subtitle = customerName ? `Hi ${customerName}, start learning now.` : 'Start learning now.'
  const contentHtml = `
    <p>You now have full access to <strong>${escapeHtml(courseTitle)}</strong> created by <strong>${escapeHtml(creatorName || 'your instructor')}</strong>.</p>
    <p>You can track your progress, access video lessons, download resources, and earn your certificate upon completion.</p>
  `
  const text = `You are enrolled in ${courseTitle} by ${creatorName}.\n\nAccess your course lessons here:\n${accessUrl}`
  const html = baseTemplate({
    previewText: `Start learning ${courseTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Go to Course',
    ctaUrl: accessUrl,
    footerNote: `Sent on behalf of ${escapeHtml(creatorName || 'the course instructor')}.`,
  })
  return { subject, html, text }
}

// ---------------- 3. BOOKING / COACHING TEMPLATES ----------------

export function bookingConfirmationEmailTemplate({ customerName, creatorName, productTitle, sessionTime, meetingUrl }) {
  const subject = `Booking Confirmed: ${productTitle}`
  const title = 'Your 1:1 session is confirmed! ✓'
  const subtitle = customerName ? `Hi ${customerName}, you're scheduled with ${creatorName}.` : `Scheduled with ${creatorName}.`
  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; text-transform: uppercase; font-weight: 600;">Session Details</p>
      <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0F172A;">${escapeHtml(productTitle)}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">Host: <strong>${escapeHtml(creatorName)}</strong></p>
      <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 12px; font-weight: 600; color: #0F172A; font-size: 14px;">
        📅 ${escapeHtml(sessionTime)}
      </div>
    </div>
    ${meetingUrl ? `<p>You can join the call directly using the button below at the scheduled time.</p>` : `<p>Your meeting link will be available in your dashboard.</p>`}
  `
  const text = `Booking Confirmed: ${productTitle} with ${creatorName}\n\nTime: ${sessionTime}\nMeeting Link: ${meetingUrl || 'See dashboard'}`
  const html = baseTemplate({
    previewText: `Your coaching session for ${productTitle} is scheduled`,
    title,
    subtitle,
    contentHtml,
    ctaText: meetingUrl ? 'Join Meeting Call' : 'View Booking Details',
    ctaUrl: meetingUrl || getAppUrl(),
    footerNote: 'Please ensure your microphone and camera are tested prior to the session.',
  })
  return { subject, html, text }
}

export function bookingReminderEmailTemplate({ customerName, creatorName, productTitle, sessionTime, meetingUrl }) {
  const subject = `Reminder: Upcoming session "${productTitle}"`
  const title = 'Your session is coming up soon'
  const subtitle = customerName ? `Hi ${customerName}, your call with ${creatorName} starts soon.` : `Upcoming session with ${creatorName}.`
  const contentHtml = `
    <p>This is a quick reminder about your scheduled 1:1 session for <strong>${escapeHtml(productTitle)}</strong>.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">📅 ${escapeHtml(sessionTime)}</p>
    </div>
  `
  const text = `Reminder: Your session "${productTitle}" with ${creatorName} is scheduled for ${sessionTime}.\nJoin link: ${meetingUrl}`
  const html = baseTemplate({
    previewText: `Upcoming session reminder for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: meetingUrl ? 'Join Video Call' : 'Open Dashboard',
    ctaUrl: meetingUrl || getAppUrl(),
  })
  return { subject, html, text }
}

export function bookingCancellationEmailTemplate({ customerName, creatorName, productTitle, sessionTime, reason }) {
  const subject = `Cancelled: Booking for ${productTitle}`
  const title = 'Session Cancelled'
  const subtitle = customerName ? `Hi ${customerName},` : 'Notice,'
  const contentHtml = `
    <p>The coaching session <strong>${escapeHtml(productTitle)}</strong> scheduled for <strong>${escapeHtml(sessionTime)}</strong> has been cancelled.</p>
    ${reason ? `<div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; color: #991B1B; margin: 16px 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</div>` : ''}
    <p>If applicable, any refund will be processed in accordance with the creator's policy.</p>
  `
  const text = `The booking for ${productTitle} on ${sessionTime} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`
  const html = baseTemplate({
    previewText: `Booking cancellation notice for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
  })
  return { subject, html, text }
}

export function bookingRescheduledEmailTemplate({ customerName, creatorName, productTitle, newSessionTime, meetingUrl }) {
  const subject = `Rescheduled: ${productTitle}`
  const title = 'Your session has been rescheduled'
  const subtitle = customerName ? `Hi ${customerName}, note your updated session time.` : 'Updated session time.'
  const contentHtml = `
    <p>Your 1:1 session for <strong>${escapeHtml(productTitle)}</strong> with <strong>${escapeHtml(creatorName)}</strong> has been rescheduled.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748B;">NEW TIME:</p>
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">📅 ${escapeHtml(newSessionTime)}</p>
    </div>
  `
  const text = `Your session "${productTitle}" with ${creatorName} has been rescheduled to ${newSessionTime}.\nJoin link: ${meetingUrl}`
  const html = baseTemplate({
    previewText: `Session rescheduled: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: meetingUrl ? 'Join Meeting Link' : 'View Booking',
    ctaUrl: meetingUrl || getAppUrl(),
  })
  return { subject, html, text }
}

// ---------------- 4. WEBINAR TEMPLATES ----------------

export function webinarConfirmationEmailTemplate({ customerName, creatorName, productTitle, webinarTime, meetingUrl }) {
  const subject = `Registered: ${productTitle} Live Webinar`
  const title = "You're registered for the live webinar! ✓"
  const subtitle = customerName ? `Hi ${customerName}, your spot is confirmed.` : 'Your spot is confirmed.'
  const contentHtml = `
    <p>You have successfully registered for <strong>${escapeHtml(productTitle)}</strong> hosted by <strong>${escapeHtml(creatorName)}</strong>.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748B;">EVENT TIME:</p>
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">📅 ${escapeHtml(webinarTime)}</p>
    </div>
    ${meetingUrl ? `<p>Save your access link below to join the live room at start time.</p>` : ''}
  `
  const text = `Webinar Registration Confirmed: ${productTitle} by ${creatorName}\nTime: ${webinarTime}\nJoin Link: ${meetingUrl || 'See dashboard'}`
  const html = baseTemplate({
    previewText: `Registration confirmed for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: meetingUrl ? 'Join Webinar Room' : 'View Webinar Details',
    ctaUrl: meetingUrl || getAppUrl(),
    footerNote: 'Add this event to your calendar so you do not miss the live broadcast.',
  })
  return { subject, html, text }
}

export function webinarReminderEmailTemplate({ customerName, creatorName, productTitle, webinarTime, meetingUrl }) {
  const subject = `Starting Soon: ${productTitle}`
  const title = 'Webinar starts soon!'
  const subtitle = customerName ? `Hi ${customerName}, get ready to join.` : 'Get ready to join.'
  const contentHtml = `
    <p>The live webinar <strong>${escapeHtml(productTitle)}</strong> hosted by <strong>${escapeHtml(creatorName)}</strong> is starting shortly.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">📅 ${escapeHtml(webinarTime)}</p>
    </div>
  `
  const text = `Reminder: The live webinar ${productTitle} by ${creatorName} is starting soon.\nJoin: ${meetingUrl}`
  const html = baseTemplate({
    previewText: `Starting soon: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Enter Webinar Room',
    ctaUrl: meetingUrl || getAppUrl(),
  })
  return { subject, html, text }
}
export function webinarCancellationEmailTemplate({ productTitle, creatorName, webinarTime, reason }) {
  const subject = `Webinar Cancelled: ${productTitle}`
  const title = 'Webinar Cancelled'
  const subtitle = creatorName ? `Hosted by ${creatorName}` : 'Webinar notice'
  const contentHtml = `
    <p>The webinar <strong>${escapeHtml(productTitle)}</strong> hosted by <strong>${escapeHtml(creatorName)}</strong> scheduled for <strong>${escapeHtml(webinarTime)}</strong> has been cancelled.</p>
    ${reason ? `<div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; color: #991B1B; margin: 16px 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</div>` : ''}
    <p>If this was a paid webinar, any eligible refund will be processed automatically.</p>
  `
  const text = `The webinar "${productTitle}" by ${creatorName} scheduled for ${webinarTime} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`
  const html = baseTemplate({
    previewText: `Webinar cancelled: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    footerNote: `Sent on behalf of ${escapeHtml(creatorName || 'the creator')}.`,
  })
  return { subject, html, text }
}

// ---------------- 5. MEMBERSHIP & COMMUNITY TEMPLATES ----------------

export function membershipActivatedEmailTemplate({ customerName, creatorName, productTitle, priceDisplay, billingInterval }) {
  const subject = `Welcome to ${productTitle}! 🎉`
  const title = 'Your membership is now active!'
  const subtitle = customerName ? `Welcome aboard, ${customerName}!` : 'Welcome aboard!'
  const contentHtml = `
    <p>You are now an active member of <strong>${escapeHtml(productTitle)}</strong> by <strong>${escapeHtml(creatorName)}</strong>.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">
        <strong>Plan:</strong> ${escapeHtml(priceDisplay || 'Active')} / ${escapeHtml(billingInterval || 'month')}
      </p>
    </div>
    <p>You have instant access to exclusive member posts, unlocked resources, and private spaces.</p>
  `
  const text = `Welcome to ${productTitle} by ${creatorName}!\nPlan: ${priceDisplay} / ${billingInterval}\nAccess your membership in your CreatorStore account.`
  const html = baseTemplate({
    previewText: `Your membership to ${productTitle} is active`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Access Member Area',
    ctaUrl: getAppUrl(),
  })
  return { subject, html, text }
}

export function membershipRenewalEmailTemplate({ customerName, creatorName, productTitle, priceDisplay, nextBillingDate }) {
  const subject = `Membership Renewed: ${productTitle}`
  const title = 'Membership Renewal Successful'
  const subtitle = customerName ? `Hi ${customerName},` : 'Notice,'
  const contentHtml = `
    <p>Your subscription to <strong>${escapeHtml(productTitle)}</strong> by <strong>${escapeHtml(creatorName)}</strong> has been successfully renewed.</p>
    <p>Amount: <strong>${escapeHtml(priceDisplay)}</strong></p>
    ${nextBillingDate ? `<p>Next renewal date: <strong>${escapeHtml(nextBillingDate)}</strong></p>` : ''}
  `
  const text = `Your subscription to ${productTitle} has renewed successfully (${priceDisplay}).`
  const html = baseTemplate({
    previewText: `Renewal receipt for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Manage Subscription',
    ctaUrl: getAppUrl(),
  })
  return { subject, html, text }
}

export function membershipCancelledEmailTemplate({ customerName, creatorName, productTitle, currentPeriodEnd }) {
  const subject = `Membership Cancelled: ${productTitle}`
  const title = 'Membership Cancelled'
  const subtitle = customerName ? `Hi ${customerName},` : 'Notice,'
  const contentHtml = `
    <p>Your membership to <strong>${escapeHtml(productTitle)}</strong> by <strong>${escapeHtml(creatorName)}</strong> has been cancelled.</p>
    <p>You will continue to have full access until <strong>${escapeHtml(currentPeriodEnd || 'the end of your current billing cycle')}</strong>, after which no further charges will occur.</p>
  `
  const text = `Your membership to ${productTitle} has been cancelled. Access remains until ${currentPeriodEnd}.`
  const html = baseTemplate({
    previewText: `Membership cancellation for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    footerNote: 'You can reactivate your membership at any time from your account settings.',
  })
  return { subject, html, text }
}

export function communityAccessEmailTemplate({ customerName, creatorName, communityTitle, accessUrl }) {
  const subject = `Access Granted: ${communityTitle}`
  const title = 'Welcome to the Community! 🚀'
  const subtitle = customerName ? `Hi ${customerName}, you're in.` : 'Access confirmed.'
  const contentHtml = `
    <p>You now have access to the <strong>${escapeHtml(communityTitle)}</strong> community created by <strong>${escapeHtml(creatorName)}</strong>.</p>
    <p>Join discussions, connect with other members, and participate in community channels.</p>
  `
  const text = `You have been granted access to ${communityTitle} by ${creatorName}.\nJoin here: ${accessUrl}`
  const html = baseTemplate({
    previewText: `Join the ${communityTitle} community`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Enter Community Space',
    ctaUrl: accessUrl || getAppUrl(),
  })
  return { subject, html, text }
}

// ---------------- 6. CREATOR NOTIFICATIONS ----------------

export function newOrderCreatorEmailTemplate({ creatorName, customerName, customerEmail, productTitle, amount, currency, orderId }) {
  const formattedPrice = formatMoney(amount, currency)
  const subject = `💰 New Sale: ${formattedPrice} for "${productTitle}"`
  const title = 'You made a new sale! 🎉'
  const subtitle = creatorName ? `Congratulations ${creatorName}!` : 'Congratulations!'
  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 14px;">
        <tr>
          <td style="color: #64748B;">Product:</td>
          <td align="right" style="font-weight: 600; color: #0F172A;">${escapeHtml(productTitle)}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Customer:</td>
          <td align="right" style="font-weight: 500; color: #0F172A;">${escapeHtml(customerName || customerEmail)}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Customer Email:</td>
          <td align="right" style="color: #0F172A;">${escapeHtml(customerEmail)}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Order ID:</td>
          <td align="right" style="font-family: monospace; color: #0F172A;">${escapeHtml(orderId)}</td>
        </tr>
        <tr>
          <td style="color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 8px;">Net Revenue:</td>
          <td align="right" style="border-top: 1px solid #E2E8F0; padding-top: 8px; font-weight: 700; font-size: 16px; color: #10B981;">${formattedPrice}</td>
        </tr>
      </table>
    </div>
  `
  const text = `New Sale!\nProduct: ${productTitle}\nCustomer: ${customerName} (${customerEmail})\nAmount: ${formattedPrice}\nOrder ID: ${orderId}`
  const html = baseTemplate({
    previewText: `New order received for ${productTitle} (${formattedPrice})`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'View in Orders Dashboard',
    ctaUrl: getAppUrl('/dashboard/orders'),
  })
  return { subject, html, text }
}

export function newLeadCreatorEmailTemplate({ creatorName, leadName, leadEmail, leadPhone, formName, submittedAt, dashboardUrl }) {
  const subject = `📋 New Lead Captured: ${leadName || leadEmail} (${formName || 'Form'})`
  const title = 'New Lead Captured! 🎯'
  const subtitle = creatorName ? `Hi ${creatorName}, a visitor just submitted your form.` : 'A visitor just submitted your form.'
  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 14px;">
        <tr>
          <td style="color: #64748B;">Form / Page:</td>
          <td align="right" style="font-weight: 600; color: #0F172A;">${escapeHtml(formName || 'Lead Form')}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Name:</td>
          <td align="right" style="font-weight: 500; color: #0F172A;">${escapeHtml(leadName || 'Not specified')}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Email:</td>
          <td align="right" style="font-weight: 600; color: #0F172A;">${escapeHtml(leadEmail)}</td>
        </tr>
        ${leadPhone ? `
        <tr>
          <td style="color: #64748B;">Phone:</td>
          <td align="right" style="color: #0F172A;">${escapeHtml(leadPhone)}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #64748B;">Captured At:</td>
          <td align="right" style="color: #64748B;">${escapeHtml(submittedAt || new Date().toLocaleString())}</td>
        </tr>
      </table>
    </div>
  `
  const text = `New Lead Captured!\nForm: ${formName}\nName: ${leadName}\nEmail: ${leadEmail}\nPhone: ${leadPhone || 'N/A'}`
  const html = baseTemplate({
    previewText: `New lead from ${leadName || leadEmail}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'View Leads in Dashboard',
    ctaUrl: dashboardUrl || getAppUrl('/dashboard/leads'),
  })
  return { subject, html, text }
}

export function payoutStatusEmailTemplate({ creatorName, status, amount, currency = 'INR', payoutId, note }) {
  const formattedAmount = formatMoney(amount, currency)
  const isCompleted = status === 'PROCESSED' || status === 'COMPLETED' || status === 'PAID'
  const isFailed = status === 'FAILED'
  const statusLabel = isCompleted ? 'PROCESSED' : (isFailed ? 'FAILED' : status)
  const subject = `Payout Update: ${formattedAmount} - ${statusLabel}`
  const title = isCompleted ? 'Your Payout Has Been Processed! 💳' : (isFailed ? 'Payout Transfer Failed ⚠️' : 'Payout Status Update')
  const subtitle = creatorName ? `Hi ${creatorName},` : 'Creator notice,'
  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 14px;">
        <tr>
          <td style="color: #64748B;">Payout Amount:</td>
          <td align="right" style="font-weight: 700; font-size: 16px; color: #0F172A;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="color: #64748B;">Status:</td>
          <td align="right" style="font-weight: 600; color: ${isCompleted ? '#10B981' : (isFailed ? '#DC2626' : '#2563EB')};">${escapeHtml(statusLabel)}</td>
        </tr>
        ${payoutId ? `
        <tr>
          <td style="color: #64748B;">Reference ID:</td>
          <td align="right" style="font-family: monospace; color: #0F172A;">${escapeHtml(payoutId)}</td>
        </tr>` : ''}
      </table>
    </div>
    ${note ? `<p style="font-size: 14px; color: #475569;"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ''}
  `
  const text = `Payout Update:\nAmount: ${formattedAmount}\nStatus: ${statusLabel}\nReference: ${payoutId || 'N/A'}`
  const html = baseTemplate({
    previewText: `Payout of ${formattedAmount} is ${statusLabel}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'View Payouts Dashboard',
    ctaUrl: getAppUrl('/dashboard/payouts'),
  })
  return { subject, html, text }
}

export function subscriptionStatusEmailTemplate({ creatorName, planName, status, priceDisplay, currentPeriodEnd }) {
  const subject = `CreatorStore Plan: ${planName} is ${status}`
  const title = `CreatorStore ${planName} Subscription: ${status}`
  const subtitle = creatorName ? `Hi ${creatorName},` : 'Creator notice,'
  const contentHtml = `
    <p>Your CreatorStore <strong>${escapeHtml(planName)}</strong> creator subscription status is now <strong>${escapeHtml(status)}</strong>.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">Plan: <strong>${escapeHtml(planName)}</strong></p>
      ${priceDisplay ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">Billing: <strong>${escapeHtml(priceDisplay)}</strong></p>` : ''}
      ${currentPeriodEnd ? `<p style="margin: 0; font-size: 14px; color: #475569;">Valid Until: <strong>${escapeHtml(currentPeriodEnd)}</strong></p>` : ''}
    </div>
  `
  const text = `Your CreatorStore ${planName} subscription status is ${status}.\nPrice: ${priceDisplay || 'Standard'}`
  const html = baseTemplate({
    previewText: `Subscription update: ${planName} is ${status}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Manage Plan Settings',
    ctaUrl: getAppUrl('/dashboard/settings'),
  })
  return { subject, html, text }
}

// ---------------- 7. PAYMENT FAILURE TEMPLATES ----------------

export function paymentFailureEmailTemplate({ customerName, productTitle, reason, retryUrl }) {
  const subject = `Payment Failed: ${productTitle}`
  const title = 'Payment could not be processed'
  const subtitle = customerName ? `Hi ${customerName},` : 'Payment notice,'
  const contentHtml = `
    <p>We were unable to process the payment for <strong>${escapeHtml(productTitle)}</strong>.</p>
    ${reason ? `<div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; color: #991B1B; margin: 16px 0;"><strong>Error:</strong> ${escapeHtml(reason)}</div>` : ''}
    <p>No funds were charged. You can retry the checkout or use a different payment method.</p>
  `
  const finalRetryUrl = retryUrl || getAppUrl()
  const text = `Payment failed for ${productTitle}.${reason ? ` Reason: ${reason}` : ''}\nRetry: ${finalRetryUrl}`
  const html = baseTemplate({
    previewText: `Payment unsuccessful for ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: retryUrl ? 'Retry Payment' : 'Return to Checkout',
    ctaUrl: finalRetryUrl,
  })
  return { subject, html, text }
}
// ---------------- 8. CUSTOM SERVICE TEMPLATES ----------------

export function customServiceRequestEmailTemplate({ productTitle, creatorName, dueAt }) {
  const subject = `Service Request Received: ${productTitle}`
  const title = 'Custom Service Request Submitted! ✓'
  const subtitle = creatorName ? `With ${creatorName}` : 'Service request'
  const contentHtml = `
    <p>Your custom service request for <strong>${escapeHtml(productTitle)}</strong> has been received by <strong>${escapeHtml(creatorName || 'the creator')}</strong>.</p>
    ${dueAt ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">Estimated Delivery: <strong>${escapeHtml(dueAt)}</strong></p>
    </div>` : ''}
    <p>The creator is reviewing your requirements and will begin working on your deliverable.</p>
  `
  const text = `Your custom service request for ${productTitle} has been received by ${creatorName}.`
  const html = baseTemplate({
    previewText: `Request received: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'View Service Status',
    ctaUrl: getAppUrl('/dashboard'),
  })
  return { subject, html, text }
}

export function customServiceDeliveredEmailTemplate({ productTitle, creatorName }) {
  const subject = `Delivery Ready: ${productTitle}! 🎉`
  const title = 'Your Custom Deliverable is Ready! 🎉'
  const subtitle = creatorName ? `Submitted by ${creatorName}` : 'Deliverable submitted'
  const contentHtml = `
    <p><strong>${escapeHtml(creatorName || 'The creator')}</strong> has submitted your custom delivery for <strong>${escapeHtml(productTitle)}</strong>.</p>
    <p>Please log in to your account dashboard to view and download your files or request a revision.</p>
  `
  const text = `Your custom deliverable for ${productTitle} by ${creatorName} is ready for download in your dashboard.`
  const html = baseTemplate({
    previewText: `Deliverable ready: ${productTitle}`,
    title,
    subtitle,
    contentHtml,
    ctaText: 'Download Deliverable',
    ctaUrl: getAppUrl('/dashboard'),
  })
  return { subject, html, text }
}

export function trialStartedEmailTemplate({ creatorName, trialEndsAt }) {
  const subject = 'Your CreatorStore Pro trial has started'
  const title = 'Your 7-Day Pro Trial is Active! 🎉'
  const subtitle = creatorName ? `Hi ${creatorName},` : 'Welcome to Pro,'
  const formattedEndDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '7 days from now'
  const contentHtml = `
    <p>Your <strong>7-day CreatorStore Pro trial</strong> is now active. You have full, unrestricted access to all Pro features with no credit card required.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #0F172A; font-weight: 700;">Included in your Pro trial:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        <li>Unlimited digital products & instant checkout delivery</li>
        <li>Leads & Lead Magnets marketing capture</li>
        <li>Coupons & Discount campaign engine</li>
        <li>Email Broadcasts to all your customers & leads</li>
        <li>Unlimited Instagram AutoDM campaigns</li>
        <li>0% CreatorStore platform fee</li>
      </ul>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748B;">Trial valid until: <strong style="color: #0F172A;">${escapeHtml(formattedEndDate)}</strong></p>
    </div>
  `
  const text = `Your CreatorStore Pro 7-day free trial has started! Valid until: ${formattedEndDate}.\nLog in to your dashboard to start creating.`
  const html = baseTemplate({
    previewText: 'Your 7-day Pro trial is active. Explore all Pro features free.',
    title,
    subtitle,
    contentHtml,
    ctaText: 'Open Creator Dashboard',
    ctaUrl: getAppUrl('/dashboard'),
  })
  return { subject, html, text }
}

export function trialEndingSoonEmailTemplate({ creatorName, trialEndsAt, daysRemaining = 1 }) {
  const subject = 'Your CreatorStore trial ends tomorrow'
  const title = 'Your Pro Trial Ends Tomorrow ⏳'
  const subtitle = creatorName ? `Hi ${creatorName},` : 'Trial notice,'
  const formattedEndDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Tomorrow'
  const contentHtml = `
    <p>Your CreatorStore Pro trial will end on <strong>${escapeHtml(formattedEndDate)}</strong>.</p>
    <p>To keep your storefront active, continue selling digital products, and keep your marketing automations running smoothly, choose a CreatorStore plan.</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;"><strong>Creator:</strong> ₹499/mo — Unlimited products, checkout & bio store</p>
      <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Pro:</strong> ₹999/mo — Marketing Center, AutoDM, coupons & broadcasts</p>
    </div>
    <p style="font-size: 13px; color: #64748B;">Your products, orders, and customer data will remain completely safe.</p>
  `
  const text = `Your CreatorStore Pro trial ends on ${formattedEndDate}. Choose a plan (Creator ₹499/mo or Pro ₹999/mo) to keep selling.`
  const html = baseTemplate({
    previewText: 'Your CreatorStore trial ends tomorrow. Choose a plan to continue.',
    title,
    subtitle,
    contentHtml,
    ctaText: 'Choose a Plan',
    ctaUrl: getAppUrl('/dashboard/settings/billing'),
  })
  return { subject, html, text }
}

export function trialExpiredEmailTemplate({ creatorName }) {
  const subject = 'Your CreatorStore trial has ended'
  const title = 'Your Pro Trial Has Ended'
  const subtitle = creatorName ? `Hi ${creatorName},` : 'Notice,'
  const contentHtml = `
    <p>Your 7-day Pro trial has expired.</p>
    <p>All your existing products, customers, orders, and storefront configuration remain safely stored in your account.</p>
    <p>To resume selling and publishing changes, choose a plan that fits your creator business:</p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;"><strong>Creator:</strong> ₹499/month</p>
      <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Pro:</strong> ₹999/month</p>
    </div>
  `
  const text = 'Your CreatorStore trial has ended. Choose a plan (Creator ₹499/mo or Pro ₹999/mo) to continue.'
  const html = baseTemplate({
    previewText: 'Your CreatorStore trial has ended. Choose a plan to continue.',
    title,
    subtitle,
    contentHtml,
    ctaText: 'Choose a Plan',
    ctaUrl: getAppUrl('/dashboard/settings/billing'),
  })
  return { subject, html, text }
}

export function marketingBroadcastEmailTemplate({ creatorName, subject, content }) {
  const formattedContent = String(content || '')
    .split('\n')
    .map(line => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${escapeHtml(line)}</p>`)
    .join('')

  const html = baseTemplate({
    previewText: subject,
    title: subject,
    subtitle: creatorName ? `From ${escapeHtml(creatorName)}` : 'Creator Announcement',
    contentHtml: `
      <div style="font-size: 15px; color: #1E293B; margin: 16px 0;">
        ${formattedContent}
      </div>
    `,
    ctaText: 'Visit Storefront',
    ctaUrl: getAppUrl(),
  })
  return { subject, html, text: content }
}

export function purchaseAccessOtpEmailTemplate({ otp, expiryMinutes = 10 }) {
  const subject = 'Your purchase access code'
  const title = 'Your Access Code'
  const subtitle = 'Use this code to access your purchased downloads'
  const contentHtml = `
    <div style="text-align: center; margin: 16px 0 24px 0;">
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">Your one-time verification code is:</p>
      <div style="display: inline-block; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 12px; padding: 14px 28px; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #0F172A; font-family: monospace;">
        ${escapeHtml(otp)}
      </div>
      <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B;">This code expires in <strong>${escapeHtml(expiryMinutes)} minutes</strong>.</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #94A3B8;">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `
  const text = `Your verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this code, you can safely ignore this email.`

  return {
    subject,
    html: baseTemplate({
      title,
      subtitle,
      contentHtml,
    }),
    text,
  }
}

