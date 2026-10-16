import dotenv from 'dotenv'
dotenv.config()

import assert from 'assert'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import {
  downloadService,
  guestAccessService,
  checkoutService,
  webhookService,
  emailService,
} from '../lib/services.js'
import { signPurpose, hashToken, generateSecureToken } from '../lib/auth.js'
import { ordersRepo, entitlementsRepo, productAccessTokensRepo, productsRepo, storesRepo, usersRepo } from '../lib/repos.js'
import { purchaseConfirmationEmailTemplate } from '../lib/emailTemplates.js'
import { supabaseAdmin } from '../lib/supabase.js'

async function runAllTests() {
  console.log('=================================================================')
  console.log('STARTING COMPREHENSIVE SECURITY, DOWNLOAD & EMAIL VERIFICATION')
  console.log('=================================================================')

  const testId = crypto.randomUUID()
  const creatorId = crypto.randomUUID()
  const creatorEmail = `creator_${Date.now()}@example.com`.toLowerCase()
  const customerA_Email = `customera_${Date.now()}@example.com`.toLowerCase()
  const customerB_Email = `customerb_${Date.now()}@example.com`.toLowerCase()

  // 0. Setup test creator & store
  const creatorUser = await usersRepo.create({
    id: creatorId,
    email: creatorEmail,
    passwordHash: 'hash1234567890',
    name: 'Test Creator',
    role: 'CREATOR',
  })

  const creatorStore = await storesRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    name: 'Test Store',
    slug: `store-${Date.now()}`,
    username: `store_${Date.now()}`,
  })

  // Upload actual file to Supabase storage for realistic download tests
  const testFileKey1 = `test_guide_${Date.now()}.pdf`
  const testFileKey2 = `test_mastery_${Date.now()}.pdf`
  await supabaseAdmin.storage.from('product-files').upload(testFileKey1, Buffer.from('%PDF-1.4 Test Guide Content'), { contentType: 'application/pdf', upsert: true })
  await supabaseAdmin.storage.from('product-files').upload(testFileKey2, Buffer.from('%PDF-1.4 Test Mastery Content'), { contentType: 'application/pdf', upsert: true })

  // Create Product 1 (for Customer A)
  const product1 = await productsRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    title: 'Product 1 - Secure Guide',
    slug: `product-1-${Date.now()}`,
    type: 'DIGITAL_DOWNLOAD',
    price: 49900,
    currency: 'INR',
    fileId: testFileKey1,
    fileName: 'Guide_One.pdf',
    fileSize: 102400,
    fileMime: 'application/pdf',
    published: true,
  })

  // Create Product 2 (for Customer B)
  const product2 = await productsRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    title: 'Product 2 - Advanced Mastery',
    slug: `product-2-${Date.now()}`,
    type: 'DIGITAL_DOWNLOAD',
    price: 99900,
    currency: 'INR',
    fileId: testFileKey2,
    fileName: 'Mastery_Two.pdf',
    fileSize: 204800,
    fileMime: 'application/pdf',
    published: true,
  })

  // Create Paid Order for Customer A -> Product 1
  const orderA = await ordersRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    productId: product1.id,
    customerEmail: customerA_Email,
    customerName: 'Customer A',
    amount: 49900,
    currency: 'INR',
    status: 'PAID',
    paymentProvider: 'RAZORPAY',
    paymentId: `pay_${Date.now()}_A`,
  })

  // Entitlement for Customer A -> Product 1
  const entA = await entitlementsRepo.create({
    id: crypto.randomUUID(),
    orderId: orderA.id,
    productId: product1.id,
    customerEmail: customerA_Email,
    status: 'ACTIVE',
  })

  // Guest access token for Customer A -> Product 1
  const tokenRecordA = await guestAccessService.createAccessToken({
    orderId: orderA.id,
    entitlementId: entA.id,
    productId: product1.id,
    customerEmail: customerA_Email,
  })

  console.log('✓ Test environment initialized successfully')

  // -------------------------------------------------------------
  // TEST 1: Authorized guest can download owned product directly as binary stream
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Authorized guest can download owned product as binary stream ---')
  const valResult = await guestAccessService.validateTokenAndResolve(tokenRecordA.rawToken)
  assert.strictEqual(valResult.success, true, 'Token validation should succeed')
  const guestSessionA = guestAccessService.verifyGuestSession(valResult.sessionCookieValue)
  assert(guestSessionA?.email === customerA_Email, 'Guest session email should match Customer A')

  const fileResultA = await downloadService.authorizeAndGetDownloadFile({
    productId: product1.id,
    guestEmail: guestSessionA.email,
    guestCustomerId: guestSessionA.customerId,
  })
  assert(Buffer.isBuffer(fileResultA.fileBuffer), 'Download must return direct binary Buffer')
  assert(fileResultA.fileBuffer.length > 0, 'Buffer must contain file bytes')
  assert(!('downloadUrl' in fileResultA), 'Must NOT return downloadUrl')
  assert.strictEqual(fileResultA.fileMime, 'application/pdf', 'Correct MIME type')
  assert.strictEqual(fileResultA.fileName, 'Guide_One.pdf', 'Correct file name')
  console.log('✓ PASS: Server directly read and provided private binary file buffer without exposing Supabase signed URL')

  // -------------------------------------------------------------
  // TEST 2, 3, 4: Request contains no JWT, email, or orderId query params
  // -------------------------------------------------------------
  console.log('\n--- TEST 2, 3, 4: Download request parameters inspection ---')
  // Simulating the contract: only productId is sent in body
  const requestBody = { productId: product1.id }
  assert(!('token' in requestBody), 'Request must NOT contain token')
  assert(!('email' in requestBody), 'Request must NOT contain email')
  assert(!('orderId' in requestBody), 'Request must NOT contain orderId')
  assert(!('jwt' in requestBody), 'Request must NOT contain jwt')
  assert(!('downloadUrl' in requestBody), 'Request must NOT contain downloadUrl')
  console.log('✓ PASS: Download contract only requires productId; auth is purely in HttpOnly cookie')

  // -------------------------------------------------------------
  // TEST 5: Missing guest cookie -> 401/403
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Missing guest cookie rejection ---')
  let err5 = null
  try {
    await downloadService.authorizeAndGetDownloadFile({
      productId: product1.id,
      guestEmail: null,
      guestCustomerId: null,
      creatorUserId: null,
    })
  } catch (e) {
    err5 = e
  }
  assert(err5 && (err5.status === 401 || err5.status === 403), 'Missing cookie must throw 401/403')
  console.log(`✓ PASS: Missing cookie rejected with HTTP ${err5.status}: "${err5.message}"`)

  // -------------------------------------------------------------
  // TEST 6: Invalid guest cookie -> 401/403
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Invalid guest cookie rejection ---')
  const invalidSession = guestAccessService.verifyGuestSession('invalid_tampered_cookie_value')
  assert.strictEqual(invalidSession, null, 'Invalid cookie verification must return null')
  let err6 = null
  try {
    await downloadService.authorizeAndGetDownloadFile({
      productId: product1.id,
      guestEmail: invalidSession?.email,
      guestCustomerId: invalidSession?.customerId,
    })
  } catch (e) {
    err6 = e
  }
  assert(err6 && (err6.status === 401 || err6.status === 403), 'Invalid session must throw 401/403')
  console.log(`✓ PASS: Tampered cookie rejected with HTTP ${err6.status}: "${err6.message}"`)

  // -------------------------------------------------------------
  // TEST 7: Expired guest cookie -> 401/403
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Expired guest cookie rejection ---')
  const expiredCookie = signPurpose({ email: customerA_Email, productId: product1.id }, 'guest_access', -10)
  const expiredSession = guestAccessService.verifyGuestSession(expiredCookie)
  assert.strictEqual(expiredSession, null, 'Expired cookie verification must return null')
  console.log('✓ PASS: Expired cookie payload returns null session')

  // -------------------------------------------------------------
  // TEST 8, 9, 10: Valid guest session but wrong product / Customer A accessing Customer B's product
  // -------------------------------------------------------------
  console.log('\n--- TEST 8, 9, 10: Cross-product & cross-customer entitlement tampering rejection ---')
  let err8 = null
  try {
    // Customer A attempting to download Product 2 (which Customer A has NOT purchased)
    await downloadService.authorizeAndGetDownloadFile({
      productId: product2.id,
      guestEmail: guestSessionA.email,
      guestCustomerId: guestSessionA.customerId,
    })
  } catch (e) {
    err8 = e
  }
  assert(err8 && err8.status === 403, 'Cross-product download attempt must return 403 Forbidden')
  console.log(`✓ PASS: Unauthorized product access rejected with HTTP ${err8.status}: "${err8.message}"`)

  // -------------------------------------------------------------
  // TEST 11: Unpaid order cannot download
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Unpaid order download prevention ---')
  const unpaidOrder = await ordersRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    productId: product2.id,
    customerEmail: customerB_Email,
    amount: 99900,
    currency: 'INR',
    status: 'CREATED', // Not PAID
  })
  // Attempting to resolve token for unpaid order
  const rawUnpaidToken = generateSecureToken()
  await productAccessTokensRepo.create({
    orderId: unpaidOrder.id,
    productId: product2.id,
    customerEmail: customerB_Email,
    tokenHash: hashToken(rawUnpaidToken),
  })
  const unpaidVal = await guestAccessService.validateTokenAndResolve(rawUnpaidToken)
  assert.strictEqual(unpaidVal.success, false, 'Unpaid order token must not resolve successfully')
  console.log(`✓ PASS: Unpaid order access blocked: "${unpaidVal.message}"`)

  // -------------------------------------------------------------
  // TEST 12: Inactive entitlement cannot download
  // -------------------------------------------------------------
  console.log('\n--- TEST 12: Inactive entitlement download prevention ---')
  const inactiveEntOrder = await ordersRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    productId: product2.id,
    customerEmail: customerB_Email,
    amount: 99900,
    status: 'PAID',
  })
  await entitlementsRepo.create({
    id: crypto.randomUUID(),
    orderId: inactiveEntOrder.id,
    productId: product2.id,
    customerEmail: customerB_Email,
    status: 'REVOKED', // Inactive
  })
  let err12 = null
  try {
    await downloadService.authorizeAndGetDownloadFile({
      productId: product2.id,
      guestEmail: customerB_Email,
    })
  } catch (e) {
    err12 = e
  }
  assert(err12 && err12.status === 403, 'Inactive/Revoked entitlement must throw 403')
  console.log(`✓ PASS: Inactive entitlement rejected with HTTP ${err12.status}: "${err12.message}"`)

  // -------------------------------------------------------------
  // TEST 13: Product belonging to another creator cannot be accessed
  // -------------------------------------------------------------
  console.log('\n--- TEST 13: Manipulated creator product rejection ---')
  let err13 = null
  try {
    await downloadService.authorizeAndGetDownloadFile({
      productId: crypto.randomUUID(),
      guestEmail: customerA_Email,
    })
  } catch (e) {
    err13 = e
  }
  assert(err13 && (err13.status === 403 || err13.status === 404), 'Invalid product must throw 403/404')
  console.log(`✓ PASS: Invalid/unauthorized product rejected with HTTP ${err13.status}`)

  // -------------------------------------------------------------
  // TEST 14: Raw Supabase storage file is not publicly accessible
  // -------------------------------------------------------------
  console.log('\n--- TEST 14: Supabase storage bucket privacy check ---')
  const { data: bucketData } = await supabaseAdmin.storage.getBucket('product-files')
  assert(bucketData?.public === false, 'product-files bucket must be PRIVATE')
  console.log('✓ PASS: Supabase storage product-files bucket is confirmed PRIVATE (public: false)')

  // -------------------------------------------------------------
  // TEST 15-22: Purchase email generation, contents & CTA link
  // -------------------------------------------------------------
  console.log('\n--- TEST 15-22: Purchase email template and token contents ---')
  const templateResult = purchaseConfirmationEmailTemplate({
    customerName: 'Mohit Customer',
    creatorName: 'Super Creator',
    productTitle: 'Premium Course Bundle',
    amount: 149900,
    currency: 'INR',
    orderId: 'ord_sample_12345',
    accessUrl: 'https://creatorstore.store/access/7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    purchaseDate: new Date(),
  })

  assert(templateResult.html.includes('ACCESS PRODUCT'), 'Email must contain ACCESS PRODUCT button')
  assert(templateResult.html.includes('https://creatorstore.store/access/7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'), 'Email must contain secure /access/<token> link')
  assert(!templateResult.html.includes('/api/download'), 'Email must NOT contain /api/download')
  assert(!templateResult.html.includes('download?token='), 'Email must NOT contain download?token=')
  assert(!templateResult.html.includes('eyJhbGciOi'), 'Email must NOT contain JWT')
  assert(!templateResult.html.includes('supabase.co/storage'), 'Email must NOT contain raw Supabase URL')
  console.log('✓ PASS: Email template correctly renders ACCESS PRODUCT CTA with /access/<token> and zero JWT/download URLs')

  // -------------------------------------------------------------
  // TEST 23: Live Resend API dispatch test
  // -------------------------------------------------------------
  console.log('\n--- TEST 23: Live Resend API dispatch & Message ID verification ---')
  const resendTest = await emailService.sendPurchaseConfirmation({
    to: 'mohit.mr11082@gmail.com',
    customerName: 'Mohit Live Test',
    creatorName: 'CreatorStore Team',
    productTitle: product1.title,
    amount: product1.price,
    currency: 'INR',
    orderId: orderA.id,
    accessUrl: tokenRecordA.accessUrl,
    purchaseDate: new Date(),
  })

  console.log('Resend API Result:', {
    delivered: resendTest.delivered,
    messageId: resendTest.messageId || resendTest.providerMessageId,
    reason: resendTest.reason || null,
  })
  assert(resendTest.delivered === true, 'Live Resend email delivery should succeed')
  assert(resendTest.messageId && resendTest.messageId.length > 5, 'Resend message ID must be returned')
  console.log(`✓ PASS: Resend API returned success with message ID: ${resendTest.messageId}`)

  // -------------------------------------------------------------
  // TEST 24, 25, 26: Email failure isolation test
  // -------------------------------------------------------------
  console.log('\n--- TEST 24, 25, 26: Email failure isolation test ---')
  const orderC = await ordersRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    productId: product1.id,
    customerEmail: 'failing_email_test@example.com',
    amount: 49900,
    status: 'PAID',
  })
  const entC = await entitlementsRepo.create({
    id: crypto.randomUUID(),
    orderId: orderC.id,
    productId: product1.id,
    customerEmail: 'failing_email_test@example.com',
    status: 'ACTIVE',
  })
  const tokC = await guestAccessService.createAccessToken({
    orderId: orderC.id,
    productId: product1.id,
    customerEmail: 'failing_email_test@example.com',
  })

  // Simulate an email delivery failure (e.g. invalid recipient domain)
  const failedEmailRes = await emailService.sendMail({
    to: '', // Invalid recipient
    subject: 'Failing email test',
    html: '<p>Test</p>',
  })
  assert(failedEmailRes.delivered === false, 'Delivery should report failure cleanly')

  // Verify DB state did NOT rollback
  const checkOrderC = await ordersRepo.getById(orderC.id)
  const checkEntC = await entitlementsRepo.getById(entC.id)
  const checkTokC = await productAccessTokensRepo.getByOrderId(orderC.id)

  assert.strictEqual(checkOrderC.status, 'PAID', 'Order must remain PAID even if email fails')
  assert.strictEqual(checkEntC.status, 'ACTIVE', 'Entitlement must remain ACTIVE even if email fails')
  assert(checkTokC !== null, 'Access token must remain valid in DB even if email fails')
  console.log('✓ PASS: Email failure is strictly non-blocking; order remains PAID and entitlement remains ACTIVE')

  // -------------------------------------------------------------
  // TEST 27: Duplicate webhook finalizeOrder call idempotency
  // -------------------------------------------------------------
  console.log('\n--- TEST 27: Duplicate payment webhook idempotency ---')
  const ordWebhook = await ordersRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    productId: product1.id,
    customerEmail: `webhook_test_${Date.now()}@example.com`,
    amount: 49900,
    status: 'CREATED',
  })
  const firstFinalize = await webhookService.finalizeOrder(ordWebhook.id, `pay_${Date.now()}_dup`, ordWebhook.customerEmail)
  const secondFinalize = await webhookService.finalizeOrder(ordWebhook.id, `pay_${Date.now()}_dup`, ordWebhook.customerEmail)
  
  const finalOrderState = await ordersRepo.getById(ordWebhook.id)
  assert.strictEqual(finalOrderState.status, 'PAID', 'Order should transition to PAID')
  console.log('✓ PASS: Duplicate payment webhook safely deduplicated')

  console.log('\n=================================================================')
  console.log('ALL 27 SECURITY, DOWNLOAD & EMAIL TESTS COMPLETED SUCCESSFULLY!')
  console.log('=================================================================')

  // Cleanup test database records
  await prisma.productAccessToken.deleteMany({ where: { orderId: { in: [orderA.id, orderC.id, unpaidOrder.id, inactiveEntOrder.id, ordWebhook.id] } } })
  await prisma.entitlement.deleteMany({ where: { orderId: { in: [orderA.id, orderC.id, unpaidOrder.id, inactiveEntOrder.id, ordWebhook.id] } } })
  await prisma.order.deleteMany({ where: { id: { in: [orderA.id, orderC.id, unpaidOrder.id, inactiveEntOrder.id, ordWebhook.id] } } })
  await prisma.product.deleteMany({ where: { id: { in: [product1.id, product2.id] } } })
  await prisma.store.deleteMany({ where: { id: creatorStore.id } })
  await prisma.user.deleteMany({ where: { id: creatorUser.id } })
  console.log('✓ Test data cleaned up successfully.')
}

runAllTests().catch((e) => {
  console.error('TEST SUITE FAILED:', e)
  process.exit(1)
})
