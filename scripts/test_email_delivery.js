// Script to verify real Resend HTTPS API delivery
import dotenv from 'dotenv'
dotenv.config()

import { getEmailService, emailService } from '../lib/email.js'

async function run() {
  console.log('--- Testing Resend HTTPS API Email System ---')
  const svc = getEmailService()
  console.log('Is Configured:', svc.isConfigured())
  console.log('Sender From:', svc.from)

  console.log('\n1. Verifying Resend configuration...')
  const verifyResult = await svc.verifyConnection()
  console.log('Verify Result:', verifyResult)

  if (!verifyResult.ok) {
    console.warn('Resend configuration note:', verifyResult.reason)
  }

  const targetRecipient = process.env.TEST_EMAIL_RECIPIENT || 'noreply@creatorstore.store'

  console.log(`\n2. Sending test transactional verification email with 6-digit OTP to ${targetRecipient}...`)
  const sendRes = await emailService.sendVerificationEmail({
    to: targetRecipient,
    name: 'Test Creator',
    otp: '482901',
  })
  console.log('Send Result:', sendRes)

  console.log(`\n3. Sending test purchase confirmation email to ${targetRecipient}...`)
  const purchaseRes = await emailService.sendPurchaseConfirmation({
    to: targetRecipient,
    customerName: 'Test Customer',
    creatorName: 'Demo Store',
    productTitle: 'Ultimate Creator Masterclass',
    amount: 999,
    currency: 'INR',
    orderId: 'ord_test_resend_999',
    accessUrl: 'https://creatorstore.store/orders/ord_test_resend_999',
  })
  console.log('Purchase Send Result:', purchaseRes)

  console.log('\n--- Resend Email Test Completed ---')
}

run().catch(console.error)
