import dotenv from 'dotenv'
dotenv.config()

import { getEmailService, emailService, EMAIL_TYPES } from '../lib/email.js'

async function runResendVerification() {
  console.log('=== CREATORSTORE RESEND HTTPS API VERIFICATION ===\n')

  const svc = getEmailService()
  console.log(`Provider: Resend HTTPS API`)
  console.log(`Configured: ${svc.isConfigured() ? 'YES' : 'NO'}`)
  console.log(`Sender From: ${svc.from}`)
  console.log(`API Key format: ${svc.apiKey ? (svc.apiKey.startsWith('re_') ? 're_... (Valid format)' : 'Non-standard format') : 'NOT_SET'}\n`)

  console.log('1. Testing Connection / Configuration Verification...')
  const verifyResult = await svc.verifyConnection()
  console.log('Verification Result:', verifyResult)

  if (!verifyResult.ok) {
    console.warn(`⚠️ Resend not configured or invalid API key: ${verifyResult.reason}`)
    console.info('ℹ️ Set RESEND_API_KEY in your environment/Railway to send live emails.')
    return verifyResult
  }

  console.log('✅ Resend configuration verified!\n')

  const testRecipient = process.env.TEST_EMAIL_RECIPIENT || 'test@creatorstore.store'

  // 2. Test sending a single controlled diagnostic email
  console.log(`2. Sending controlled diagnostic test email to ${testRecipient}...`)
  const testRes = await svc.sendDiagnosticPlainTextEmail({
    to: testRecipient,
  })
  console.log('Diagnostic Send Result:', testRes)

  if (testRes.delivered) {
    console.log(`✅ Test email delivered successfully! MessageID: ${testRes.providerMessageId || testRes.messageId}`)
  } else {
    console.warn(`⚠️ Test email send returned:`, testRes)
  }

  // 3. Test sending verification OTP email
  console.log('\n3. Testing transactional OTP verification email...')
  const otpRes = await emailService.sendVerificationEmail({
    to: testRecipient,
    name: 'CreatorStore Tester',
    otp: '937218',
  })
  console.log('OTP Send Result:', otpRes)

  // 4. Test sending purchase confirmation email
  console.log('\n4. Testing transactional purchase confirmation email...')
  const purchaseRes = await emailService.sendPurchaseConfirmation({
    to: testRecipient,
    customerName: 'Test Customer',
    creatorName: 'Demo Store',
    productTitle: 'Creator Growth Playbook',
    amount: 1499,
    currency: 'INR',
    orderId: 'ord_resend_test_101',
    accessUrl: 'https://creatorstore.store/orders/ord_resend_test_101',
  })
  console.log('Purchase Send Result:', purchaseRes)

  console.log('\n========================================')
  console.log('RESEND HTTPS API VERIFICATION COMPLETE')
  console.log('========================================\n')
  return { verifyResult, testRes, otpRes, purchaseRes }
}

runResendVerification().catch(console.error)
